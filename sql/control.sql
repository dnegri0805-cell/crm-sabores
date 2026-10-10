-- =========================================================
-- CONTROL Y REPARTO — CRM Sabores de mi País
-- Mapa de clientes, comisiones, foto del remito firmado, devoluciones y
-- notas de crédito, vencimientos de mercadería e historial de cambios.
-- Se puede correr más de una vez.
-- =========================================================

-- 1) Ubicación de los clientes (para el mapa)
alter table clientes add column if not exists lat numeric(9,6);
alter table clientes add column if not exists lng numeric(9,6);

-- 2) Comisión de cada vendedor
alter table perfiles add column if not exists comision_pct numeric(5,2) not null default 0;
create or replace function fijar_comision(p_perfil uuid, p_pct numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar las comisiones'; end if;
  if p_pct is null or p_pct < 0 or p_pct > 50 then raise exception 'La comisión tiene que estar entre 0 y 50 %%'; end if;
  update perfiles set comision_pct = p_pct where id = p_perfil;
end $$;
create or replace function vendedores()
returns table(id uuid, nombre text, rol text, comision_pct numeric) language sql stable security definer set search_path = public as $$
  select id, nombre, rol::text, comision_pct from perfiles order by nombre
$$;

-- 3) Pedidos: cuándo se entregó y foto del remito firmado
alter table pedidos add column if not exists entregado_en timestamptz;
alter table pedidos add column if not exists foto_remito text;
create or replace function marcar_entrega() returns trigger language plpgsql as $$
begin
  if new.estado::text = 'entregado' and old.estado::text is distinct from 'entregado' then new.entregado_en := now(); end if;
  return new;
end $$;
drop trigger if exists pedidos_entrega on pedidos;
create trigger pedidos_entrega before update on pedidos for each row execute function marcar_entrega();

insert into storage.buckets (id, name, public) values ('remitos', 'remitos', false) on conflict (id) do nothing;
drop policy if exists "remitos_leer" on storage.objects;
drop policy if exists "remitos_subir" on storage.objects;
drop policy if exists "remitos_cambiar" on storage.objects;
create policy "remitos_leer"    on storage.objects for select to authenticated using (bucket_id = 'remitos');
create policy "remitos_subir"   on storage.objects for insert to authenticated with check (bucket_id = 'remitos');
create policy "remitos_cambiar" on storage.objects for update to authenticated using (bucket_id = 'remitos');

-- 4) Devoluciones y notas de crédito
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tp text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.pedidos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists notas_credito (
      id         bigint generated always as identity primary key,
      numero     bigint not null unique,
      cliente_id %s not null references clientes(id),
      pedido_id  %s references pedidos(id) on delete set null,
      fecha      date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
      total      numeric(14,2) not null,
      motivo     text,
      repuesto   boolean not null default true,
      items      jsonb not null default '[]',
      recibo_numero bigint,
      usuario_id uuid default auth.uid(),
      creado_en  timestamptz default now())$f$, tc, tp);
end $$;

create or replace function registrar_devolucion(p_pedido uuid, p_items jsonb, p_motivo text default null, p_reponer boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o pedidos%rowtype; x jsonb; v_items jsonb := '[]'; v_total numeric := 0; v_num bigint; v_q numeric; v_pi record;
        v_dev numeric; v_imp jsonb := '[]'; v_rest numeric; f record; v_rec bigint; v_fact boolean;
begin
  select * into o from pedidos where id = p_pedido;
  if not found then raise exception 'No encuentro el pedido'; end if;
  for x in select * from jsonb_array_elements(p_items) loop
    v_q := round((x->>'q')::numeric, 3);
    if v_q is null or v_q <= 0 then continue; end if;
    select producto_id, sum(cantidad) cant, max(precio_unitario) pu, max(costo_unitario) cu into v_pi
      from pedido_items where pedido_id = p_pedido and producto_id = (x->>'id')::uuid group by producto_id;
    if not found then raise exception 'Un producto no es de este pedido'; end if;
    select coalesce(sum((it->>'q')::numeric), 0) into v_dev from notas_credito nc, jsonb_array_elements(nc.items) it
     where nc.pedido_id = p_pedido and it->>'id' = x->>'id';
    if v_q > v_pi.cant - v_dev then raise exception 'Se devuelven más unidades de las que se entregaron'; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('id', v_pi.producto_id, 'q', v_q, 'pu', v_pi.pu, 'cu', v_pi.cu));
    v_total := v_total + round(v_q * v_pi.pu, 2);
  end loop;
  if jsonb_array_length(v_items) = 0 then raise exception 'No elegiste nada para devolver'; end if;
  perform pg_advisory_xact_lock(424242);
  select coalesce(max(numero), 0) + 1 into v_num from notas_credito;
  if p_reponer then
    for x in select * from jsonb_array_elements(v_items) loop
      perform mover_stock((x->>'id')::uuid, (x->>'q')::numeric, 0, 'ajuste', 'Devolución · Nota de crédito N° ' || v_num);
    end loop;
  end if;
  -- Si el pedido estaba facturado, se descuenta de la cuenta del cliente
  select exists(select 1 from facturas_venta where pedido_id = p_pedido and not coalesce(anulada, false)) into v_fact;
  if v_fact then
    v_rest := v_total;
    for f in select factura_id, pendiente from facturas_estado where cliente_id = o.cliente_id and pendiente > 0.005 order by vencimiento loop
      exit when v_rest <= 0;
      v_imp := v_imp || jsonb_build_array(jsonb_build_object('factura_id', f.factura_id, 'importe', round(least(v_rest, f.pendiente), 2)));
      v_rest := v_rest - least(v_rest, f.pendiente);
    end loop;
    v_rec := registrar_cobranza(p_cliente => o.cliente_id, p_importe => v_total, p_medio => 'otro', p_imputaciones => v_imp);
    update recibos set observacion = 'Nota de crédito N° ' || v_num where numero = v_rec;
  end if;
  insert into notas_credito (numero, cliente_id, pedido_id, total, motivo, repuesto, items, recibo_numero)
  values (v_num, o.cliente_id, p_pedido, v_total, nullif(trim(p_motivo), ''), p_reponer, v_items, v_rec);
  return jsonb_build_object('numero', v_num, 'total', v_total, 'recibo', v_rec, 'facturado', v_fact);
end $$;

-- 5) Vencimientos de la mercadería
do $$
declare tp text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists vencimientos (
      id          bigint generated always as identity primary key,
      producto_id %s not null references productos(id) on delete cascade,
      vence       date not null,
      cantidad    numeric(14,3),
      lote        text,
      nota        text,
      retirado    boolean not null default false,
      creado_en   timestamptz default now())$f$, tp);
end $$;
create index if not exists vencimientos_vence on vencimientos (retirado, vence);

-- 6) Historial de cambios (quién tocó qué y cuándo)
create table if not exists historial_cambios (
  id          bigint generated always as identity primary key,
  fecha       timestamptz not null default now(),
  usuario_id  uuid,
  tabla       text not null,
  registro_id text,
  accion      text not null,
  cambios     jsonb
);
create index if not exists historial_fecha on historial_cambios (fecha desc);

create or replace function registrar_historial() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_c jsonb := '{}'; k text;
        ign text[] := array['actualizado_en','updated_at','creado_en','created_at','token_pedidos','foto','subtotal'];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new) - ign;
    insert into historial_cambios (usuario_id, tabla, registro_id, accion, cambios) values (auth.uid(), tg_table_name, v_new->>'id', 'alta', v_new);
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old) - ign;
    insert into historial_cambios (usuario_id, tabla, registro_id, accion, cambios) values (auth.uid(), tg_table_name, v_old->>'id', 'baja', v_old);
  else
    v_old := to_jsonb(old) - ign; v_new := to_jsonb(new) - ign;
    for k in select jsonb_object_keys(v_new) loop
      if v_new->k is distinct from v_old->k then v_c := v_c || jsonb_build_object(k, jsonb_build_array(v_old->k, v_new->k)); end if;
    end loop;
    if v_c <> '{}'::jsonb then
      insert into historial_cambios (usuario_id, tabla, registro_id, accion, cambios) values (auth.uid(), tg_table_name, v_new->>'id', 'cambio', v_c);
    end if;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['pedidos','pedido_items','clientes','productos','recibos','facturas_venta','facturas_proveedor',
                           'pagos_proveedor','gastos','cheques','promociones','config_listas','notas_credito','pedidos_fijos'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists historial_%s on %I', t, t);
      execute format('create trigger historial_%s after insert or update or delete on %I for each row execute function registrar_historial()', t, t);
    end if;
  end loop;
end $$;

-- Permisos
do $$
declare t text;
begin
  foreach t in array array['notas_credito','vencimientos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
alter table historial_cambios enable row level security;
drop policy if exists "solo_dueno" on historial_cambios;
create policy "solo_dueno" on historial_cambios for select to authenticated using (es_dueno());
grant select on historial_cambios to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke execute on function fijar_comision(uuid, numeric), vendedores(), registrar_devolucion(uuid, jsonb, text, boolean) from public, anon;
grant execute on function fijar_comision(uuid, numeric), vendedores(), registrar_devolucion(uuid, jsonb, text, boolean) to authenticated;
grant select on all tables in schema public to service_role;

select 'control listo' as resultado;
