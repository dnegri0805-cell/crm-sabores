-- =========================================================
-- CLIENTES Y CUENTAS — CRM Sabores de mi País
-- Pedido en grupo entre vecinos, vacaciones y horario de recepción del cliente,
-- promesas de pago y documentos del cliente. Se puede correr más de una vez.
-- =========================================================

-- Horario de recepción y vacaciones del cliente
alter table clientes add column if not exists recibe_desde text;
alter table clientes add column if not exists recibe_hasta text;
alter table clientes add column if not exists cerrado_desde date;
alter table clientes add column if not exists cerrado_hasta date;

-- Los pedidos fijos no se arman mientras el cliente está cerrado por vacaciones
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
    if v.cerrado_hasta is not null and hoy between coalesce(v.cerrado_desde, hoy) and v.cerrado_hasta then continue; end if;
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
revoke execute on function generar_pedidos_fijos() from public, anon;
grant execute on function generar_pedidos_fijos() to authenticated, service_role;

-- Pedido en grupo: dos comercios vecinos juntan sus pedidos para llegar al mínimo
alter table pedidos add column if not exists grupo text;
create table if not exists grupos_pedido (
  codigo     text primary key,
  creador    text not null,
  creado_en  timestamptz not null default now(),
  vence      timestamptz not null default now() + interval '3 days');
alter table grupos_pedido enable row level security;
drop policy if exists "auth_all" on grupos_pedido;
create policy "auth_all" on grupos_pedido for all to authenticated using (true) with check (true);
grant select, insert, update, delete on grupos_pedido to authenticated;

create or replace function crear_grupo(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; c text; i int;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '' and coalesce(activo, true);
  if not found then raise exception 'Este link no es válido.'; end if;
  select codigo into c from grupos_pedido where creador = v.id::text and vence > now() order by creado_en desc limit 1;
  if c is not null then return c; end if;
  for i in 1 .. 20 loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    begin insert into grupos_pedido (codigo, creador) values (c, v.id::text); return c;
    exception when unique_violation then null; end;
  end loop;
  raise exception 'No se pudo crear el grupo. Probá de nuevo.';
end $$;

create or replace function grupo_info(p_token text, p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; g grupos_pedido%rowtype; o numeric; n int; nom text;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into g from grupos_pedido where codigo = upper(trim(p_codigo));
  if not found then return jsonb_build_object('ok', false, 'msg', 'No encontramos ese código de grupo.'); end if;
  if g.vence < now() then return jsonb_build_object('ok', false, 'msg', 'Ese grupo ya venció. Creá uno nuevo.'); end if;
  select coalesce(sum(total), 0), count(distinct cliente_id), string_agg(distinct split_part(c.razon_social, ' ', 1) || ' ' || coalesce(split_part(c.razon_social, ' ', 2), ''), ', ')
    into o, n, nom
    from pedidos p join clientes c on c.id = p.cliente_id
   where p.grupo = g.codigo and p.cliente_id <> v.id and p.estado::text in ('pendiente', 'aprobado', 'en_preparacion', 'listo');
  return jsonb_build_object('ok', true, 'codigo', g.codigo, 'otros', o, 'n', n, 'nombres', trim(coalesce(nom, '')), 'creador', g.creador = v.id::text,
    'vence', g.vence, 'minimo', nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric);
end $$;

-- Manda el pedido como parte del grupo: el mínimo se cuenta entre todos
create or replace function crear_pedido_grupo(p_token text, p_items jsonb, p_grupo text, p_nota text default null, p_cupon text default null, p_puntos boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; g grupos_pedido%rowtype; v_old text; v_min numeric; r jsonb; o numeric; n int;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '' and coalesce(activo, true);
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into g from grupos_pedido where codigo = upper(trim(p_grupo));
  if not found or g.vence < now() then raise exception 'El grupo no existe o ya venció.'; end if;
  select coalesce(sum(total), 0), count(distinct cliente_id) into o, n from pedidos
   where grupo = g.codigo and cliente_id <> v.id and estado::text in ('pendiente', 'aprobado', 'en_preparacion', 'listo');
  select valor into v_old from config_app where clave = 'pedido_minimo';
  v_min := nullif(v_old, '')::numeric;
  if v_old is not null then update config_app set valor = '' where clave = 'pedido_minimo'; end if;
  r := crear_pedido_cliente(p_token, p_items, coalesce(nullif(trim(p_nota), '') || ' · ', '') || '🤝 Pedido en grupo ' || g.codigo, p_cupon, p_puntos);
  if v_old is not null then update config_app set valor = v_old where clave = 'pedido_minimo'; end if;
  if v_min is not null and o + coalesce((r->>'total')::numeric, 0) < v_min and not (g.creador = v.id::text and n = 0) then
    raise exception 'Entre todos todavía no llegan al mínimo de $ %. Les faltan $ %.', to_char(v_min, 'FM999G999G990'), to_char(v_min - o - (r->>'total')::numeric, 'FM999G999G990');
  end if;
  update pedidos set grupo = g.codigo where numero = (r->>'numero')::bigint;
  update grupos_pedido set vence = greatest(vence, now() + interval '1 day') where codigo = g.codigo;
  return r || jsonb_build_object('grupo', g.codigo, 'grupo_total', o + coalesce((r->>'total')::numeric, 0));
end $$;

revoke execute on function crear_grupo(text), grupo_info(text, text), crear_pedido_grupo(text, jsonb, text, text, text, boolean) from public;
grant execute on function crear_grupo(text), grupo_info(text, text), crear_pedido_grupo(text, jsonb, text, text, text, boolean) to anon, authenticated;

-- Promesas de pago
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists promesas_pago (
      id          bigint generated always as identity primary key,
      cliente_id  %s not null references clientes(id) on delete cascade,
      fecha       date not null,
      monto       numeric(14,2) not null default 0,
      nota        text,
      estado      text not null default 'pendiente' check (estado in ('pendiente', 'cumplida', 'incumplida', 'anulada')),
      cerrada_en  timestamptz,
      creado_en   timestamptz not null default now())$f$, tc);
  execute format($f$
    create table if not exists documentos_cliente (
      id          bigint generated always as identity primary key,
      cliente_id  %s not null references clientes(id) on delete cascade,
      tipo        text not null,
      nombre      text,
      path        text not null,
      vence       date,
      creado_en   timestamptz not null default now())$f$, tc);
end $$;
alter table promesas_pago enable row level security;
drop policy if exists "auth_all" on promesas_pago;
create policy "auth_all" on promesas_pago for all to authenticated using (true) with check (true);
grant select, insert, update, delete on promesas_pago to authenticated;
alter table documentos_cliente enable row level security;
drop policy if exists "auth_all" on documentos_cliente;
create policy "auth_all" on documentos_cliente for all to authenticated using (true) with check (true);
grant select, insert, update, delete on documentos_cliente to authenticated;

-- Carpeta privada para los documentos (solo se ven entrando al CRM)
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;
drop policy if exists "documentos_leer" on storage.objects;
drop policy if exists "documentos_subir" on storage.objects;
drop policy if exists "documentos_borrar" on storage.objects;
create policy "documentos_leer"   on storage.objects for select to authenticated using (bucket_id = 'documentos');
create policy "documentos_subir"  on storage.objects for insert to authenticated with check (bucket_id = 'documentos');
create policy "documentos_borrar" on storage.objects for delete to authenticated using (bucket_id = 'documentos');

select 'cuentas listo' as resultado;
