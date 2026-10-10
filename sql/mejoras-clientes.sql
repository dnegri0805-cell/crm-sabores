-- =========================================================
-- MEJORAS: fotos, cuenta online, Mercado Pago, pedidos fijos,
-- prospectos, agenda de visitas, alícuotas y conteo de inventario.
-- Requiere: precios.sql, promociones.sql, stock.sql, pedidos-online.sql, avisos-deuda.sql.
-- Se puede correr más de una vez.
-- =========================================================

-- 1) Productos: foto y fecha del último conteo
alter table productos add column if not exists foto text;
alter table productos add column if not exists ultimo_conteo date;

-- 2) Lugar para guardar las fotos (público para que se vean en el catálogo)
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do update set public = true;
drop policy if exists "fotos_productos_leer"   on storage.objects;
drop policy if exists "fotos_productos_subir"  on storage.objects;
drop policy if exists "fotos_productos_cambiar" on storage.objects;
drop policy if exists "fotos_productos_borrar" on storage.objects;
create policy "fotos_productos_leer"    on storage.objects for select using (bucket_id = 'productos');
create policy "fotos_productos_subir"   on storage.objects for insert to authenticated with check (bucket_id = 'productos' and public.es_dueno());
create policy "fotos_productos_cambiar" on storage.objects for update to authenticated using (bucket_id = 'productos' and public.es_dueno());
create policy "fotos_productos_borrar"  on storage.objects for delete to authenticated using (bucket_id = 'productos' and public.es_dueno());

create or replace function fijar_foto(p_producto uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar las fotos'; end if;
  update productos set foto = nullif(trim(p_url), '') where id = p_producto;
end $$;

create or replace function fijar_alicuota(p_ids uuid[], p_alic numeric)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar el IVA de los productos'; end if;
  if p_alic not in (0, 10.5, 21, 27) then raise exception 'Alícuota no válida'; end if;
  update productos set alicuota_iva = p_alic where id = any(p_ids);
  get diagnostics n = row_count; return n;
end $$;

-- 3) Conteo de inventario por partes
create or replace function contar_stock(p_items jsonb, p_motivo text default null)
returns int language plpgsql security definer set search_path = public as $$
declare x jsonb; n int := 0;
begin
  for x in select * from jsonb_array_elements(p_items) loop
    if x->>'contado' is not null and x->>'contado' <> '' then
      perform ajustar_stock((x->>'id')::uuid, (x->>'contado')::numeric, coalesce(nullif(p_motivo,''), 'Conteo de inventario'));
      update productos set ultimo_conteo = (now() at time zone 'America/Argentina/Buenos_Aires')::date where id = (x->>'id')::uuid;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- 4) Agenda de visitas: qué días se visita a cada cliente (1 = lunes … 7 = domingo)
alter table clientes add column if not exists dias_visita int[] not null default '{}';
alter table clientes add column if not exists orden_visita int not null default 0;

-- 5) Pedidos fijos
do $$
declare tp text := (select format_type(atttypid, atttypmod) from pg_attribute
                     where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists pedidos_fijos (
      id              bigint generated always as identity primary key,
      cliente_id      %s not null unique references clientes(id) on delete cascade,
      dias            int[] not null default '{}',
      items           jsonb not null default '[]',
      nota            text,
      activo          boolean not null default true,
      ultimo_generado date,
      creado_en       timestamptz default now())$f$, tp);
end $$;

create or replace function generar_pedidos_fijos()
returns int language plpgsql security definer set search_path = public as $$
declare f record; v clientes%rowtype; vj jsonb; v_lista text; v_ped record; n int := 0; k int;
        hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  for f in select * from pedidos_fijos
            where activo and extract(isodow from hoy)::int = any(dias)
              and (ultimo_generado is null or ultimo_generado < hoy)
              and jsonb_array_length(items) > 0
            for update skip locked loop
    update pedidos_fijos set ultimo_generado = hoy where id = f.id;
    select * into v from clientes where id = f.cliente_id and coalesce(activo, true);
    if not found then continue; end if;
    vj := to_jsonb(v); v_lista := coalesce(v.lista::text, 'mayorista');
    insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen, observaciones)
    values (v.id, coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1)),
            v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'fijo', coalesce(nullif(trim(f.nota), ''), 'Pedido fijo'))
    returning id, numero into v_ped;
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
    select v_ped.id, x.pid, x.q, round(x.base * (1 - coalesce(mp.pct, 0) / 100), 2), case when mp.pct is not null then mp.nombre end
      from (select pp.producto_id pid, least(greatest(round((j->>'q')::numeric), 1), 100000) q,
                   case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end base
              from jsonb_array_elements(f.items) j
              join precios_productos pp on pp.producto_id::text = j->>'id'
             where pp.costo > 0) x
      left join lateral mejor_promo(x.pid, v_lista, x.q) mp on true;
    get diagnostics k = row_count;
    if k = 0 then delete from pedidos where id = v_ped.id; else n := n + 1; end if;
  end loop;
  return n;
end $$;

-- 6) Prospectos (negocios a visitar)
create table if not exists prospectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, rubro text, estado text default 'nuevo',
  telefono text, domicilio text, ciudad text, zona text, contacto text, observaciones text,
  ultimo_contacto date, proximo_seguimiento date, cliente_id uuid,
  creado_en timestamptz default now(), actualizado_en timestamptz default now());
alter table prospectos add column if not exists rubro text;
alter table prospectos add column if not exists estado text default 'nuevo';
alter table prospectos add column if not exists telefono text;
alter table prospectos add column if not exists domicilio text;
alter table prospectos add column if not exists zona text;
alter table prospectos add column if not exists contacto text;
alter table prospectos add column if not exists observaciones text;
alter table prospectos add column if not exists ultimo_contacto date;
alter table prospectos add column if not exists proximo_seguimiento date;
alter table prospectos add column if not exists cliente_id uuid;
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.prospectos'::regclass and contype = 'c'
            and pg_get_constraintdef(oid) ilike '%estado%' loop
    execute format('alter table prospectos drop constraint %I', c);
  end loop;
end $$;

-- Permisos de las tablas nuevas (todos los usuarios del CRM)
do $$
declare t text;
begin
  foreach t in array array['pedidos_fijos','prospectos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- 7) Catálogo online: fotos + datos de pago
create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_prod jsonb; v_ult jsonb; v_promos jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto, 'img', p.foto)
           order by pp.descripcion), '[]'::jsonb)
    into v_prod from precios_productos pp join productos p on p.id = pp.producto_id where pp.costo > 0;
  select coalesce(jsonb_agg(i), '[]'::jsonb) into v_ult from (
    select jsonb_build_object('id', i.producto_id, 'q', i.cantidad) i from pedido_items i
     where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1)) x;
  select coalesce(jsonb_agg(jsonb_build_object('n', nombre, 'pct', descuento_pct, 'a', alcance, 'av', alcance_valor,
           'mt', minimo_tipo, 'mu', minimo_unidades)), '[]'::jsonb)
    into v_promos from promociones
   where activa and current_date >= desde and (hasta is null or current_date <= hasta)
     and (listas is null or cardinality(listas) = 0 or v_lista = any(listas));
  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', v_prod, 'ultimo', v_ult, 'promos', v_promos,
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

-- 8) Cuenta corriente online del cliente
create or replace function cuenta_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_fac jsonb; v_pag jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', tipo, 'n', numero, 'f', fecha, 'v', vencimiento, 'tot', total, 'p', pendiente, 'dm', dias_mora) order by vencimiento), '[]'::jsonb)
    into v_fac from facturas_estado where cliente_id = v.id and pendiente > 0.005;
  select coalesce(jsonb_agg(x order by (x->>'n')::bigint desc), '[]'::jsonb) into v_pag from (
    select jsonb_build_object('n', numero, 'f', fecha, 'i', importe, 'm', medio) x from recibos
     where cliente_id = v.id and not coalesce(anulado, false) order by numero desc limit 15) r;
  return jsonb_build_object('cliente', v.razon_social,
    'saldo', coalesce((select saldo from saldos_clientes where cliente_id = v.id), 0),
    'vencido', coalesce((select sum(pendiente) from facturas_estado where cliente_id = v.id and pendiente > 0.005 and dias_mora > 0), 0),
    'facturas', v_fac, 'pagos', v_pag,
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

revoke execute on function catalogo_cliente(text), cuenta_cliente(text) from public;
grant execute on function catalogo_cliente(text), cuenta_cliente(text) to anon, authenticated;
revoke execute on function fijar_foto(uuid, text), fijar_alicuota(uuid[], numeric), contar_stock(jsonb, text), generar_pedidos_fijos() from public, anon;
grant execute on function fijar_foto(uuid, text), fijar_alicuota(uuid[], numeric), contar_stock(jsonb, text), generar_pedidos_fijos() to authenticated;
grant execute on function generar_pedidos_fijos() to service_role;
grant select on all tables in schema public to service_role;

select 'mejoras listas' as resultado;
