-- =========================================================
-- VENTAS — CRM Sabores de mi País
-- Combos, descuento por monto, pedido mínimo / envío gratis, novedades
-- y registro de contactos (campañas, "les toca comprar").
-- Requiere: promociones.sql, mejoras-clientes.sql y catalogo-publico.sql. Se puede correr más de una vez.
-- =========================================================

-- 1) Novedades
alter table productos add column if not exists nuevo_hasta date;
create or replace function fijar_nuevo(p_ids uuid[], p_dias int)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede marcar novedades'; end if;
  update productos set nuevo_hasta = case when coalesce(p_dias, 0) > 0 then current_date + p_dias end where id = any(p_ids);
  get diagnostics n = row_count; return n;
end $$;

-- 2) Combos (descuento % sobre la suma de sus productos, con los precios de la lista de cada cliente)
create table if not exists combos (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  descripcion   text,
  items         jsonb not null default '[]',
  descuento_pct numeric(5,2) not null default 0 check (descuento_pct >= 0 and descuento_pct < 90),
  activo        boolean not null default true,
  desde         date not null default current_date,
  hasta         date,
  creado_en     timestamptz default now()
);
alter table combos enable row level security;
drop policy if exists "leer_combos" on combos;
drop policy if exists "dueno_combos" on combos;
create policy "leer_combos" on combos for select to authenticated using (true);
create policy "dueno_combos" on combos for all to authenticated using (es_dueno()) with check (es_dueno());
grant select, insert, update, delete on combos to authenticated;

-- 3) Contactos con clientes (campañas por WhatsApp, recordatorios de compra)
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists contactos_clientes (
      id         bigint generated always as identity primary key,
      cliente_id %s not null references clientes(id) on delete cascade,
      fecha      timestamptz not null default now(),
      tipo       text not null,
      detalle    text,
      usuario_id uuid default auth.uid())$f$, tc);
end $$;
create index if not exists contactos_clientes_cf on contactos_clientes (cliente_id, fecha desc);
alter table contactos_clientes enable row level security;
drop policy if exists "auth_all" on contactos_clientes;
create policy "auth_all" on contactos_clientes for all to authenticated using (true) with check (true);
grant select, insert, update, delete on contactos_clientes to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 4) Lo que el catálogo necesita saber: combos, escalas de descuento, pedido mínimo, envío gratis
create or replace function extras_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'combos', coalesce((select jsonb_agg(jsonb_build_object('id', 'combo:' || c.id, 'n', c.nombre, 'desc', c.descripcion, 'pct', c.descuento_pct, 'items', c.items) order by c.id)
                          from combos c where c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)), '[]'::jsonb),
    'escalas', coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb),
    'minimo',  nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric,
    'envio',   nullif((select valor from config_app where clave = 'envio_gratis_desde'), '')::numeric)
$$;

create or replace function productos_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case p_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto, 'img', p.foto, 'nv', coalesce(p.nuevo_hasta >= current_date, false))
           order by pp.descripcion), '[]'::jsonb)
    from precios_productos pp join productos p on p.id = pp.producto_id
   where pp.costo > 0 and coalesce(p.activo, true)
$$;

create or replace function promos_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('n', nombre, 'pct', descuento_pct, 'a', alcance, 'av', alcance_valor,
           'mt', minimo_tipo, 'mu', minimo_unidades)), '[]'::jsonb)
    from promociones
   where activa and current_date >= desde and (hasta is null or current_date <= hasta)
     and (listas is null or cardinality(listas) = 0 or p_lista = any(listas))
$$;

create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_ult jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(i), '[]'::jsonb) into v_ult from (
    select jsonb_build_object('id', i.producto_id, 'q', i.cantidad) i from pedido_items i
     where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1)) x;
  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', productos_catalogo(v_lista), 'ultimo', v_ult,
    'promos', promos_catalogo(v_lista),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa')) || extras_catalogo(v_lista);
end $$;

create or replace function catalogo_publico()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_lista text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then
    raise exception 'El catálogo no está disponible en este momento.';
  end if;
  return jsonb_build_object('cliente', null, 'lista', v_lista, 'productos', productos_catalogo(v_lista), 'ultimo', '[]'::jsonb,
    'promos', promos_catalogo(v_lista), 'publico', true,
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'mp',  (select valor from config_app where clave = 'link_mp')) || extras_catalogo(v_lista);
end $$;

-- 5) Pedido online: promos por producto + combos + descuento por monto + pedido mínimo
create or replace function crear_pedido_cliente(p_token text, p_items jsonb, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; vj jsonb; v_lista text; v_ped record; v_n int; v_total numeric; v_vend uuid;
        v_it jsonb; v_sub numeric; v_esc numeric := 0; v_min numeric; e jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  if jsonb_array_length(p_items) > 300 then raise exception 'El pedido tiene demasiados productos.'; end if;
  if (select count(*) from pedidos where cliente_id = v.id and origen = 'online' and estado::text = 'pendiente') >= 10 then
    raise exception 'Ya tenés varios pedidos esperando aprobación. Esperá a que los revisemos.'; end if;
  vj := to_jsonb(v);
  v_lista := coalesce(v.lista::text, 'mayorista');

  with base as (
    select pp.producto_id pid,
           case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end precio
      from precios_productos pp where pp.costo > 0),
  sueltos as (
    select b.pid, least(greatest(round((j->>'q')::numeric), 1), 100000) q, b.precio
      from jsonb_array_elements(p_items) j join base b on b.pid::text = j->>'id'
     where (j->>'q')::numeric >= 1),
  lineas as (
    select s.pid, s.q, round(s.precio * (1 - coalesce(mp.pct, 0) / 100), 2) pu, case when mp.pct is not null then mp.nombre end promo
      from sueltos s left join lateral mejor_promo(s.pid, v_lista, s.q) mp on true
    union all
    select b.pid, (ci->>'q')::numeric * least(greatest(round((j->>'q')::numeric), 1), 1000), round(b.precio * (1 - c.descuento_pct / 100), 2), case when c.nombre ilike 'combo%' then c.nombre else 'Combo ' || c.nombre end
      from jsonb_array_elements(p_items) j
      join combos c on 'combo:' || c.id = j->>'id' and c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)
      cross join jsonb_array_elements(c.items) ci
      join base b on b.pid::text = ci->>'id'
     where (j->>'q')::numeric >= 1)
  select jsonb_agg(jsonb_build_object('pid', pid, 'q', q, 'pu', round(t / q, 2), 'promo', promo)) into v_it
    from (select pid, sum(q) q, sum(q * pu) t, string_agg(distinct promo, ' + ') promo from lineas group by pid) z;

  if v_it is null then raise exception 'Ninguno de los productos está disponible.'; end if;
  select sum((x->>'q')::numeric * (x->>'pu')::numeric) into v_sub from jsonb_array_elements(v_it) x;
  v_min := nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric;
  if v_min is not null and v_sub < v_min then
    raise exception 'El pedido mínimo es de $ %. Te faltan $ %.', to_char(v_min, 'FM999G999G990'), to_char(v_min - v_sub, 'FM999G999G990'); end if;
  for e in select * from jsonb_array_elements(coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb)) loop
    if v_sub >= (e->>'desde')::numeric and (e->>'pct')::numeric > v_esc then v_esc := (e->>'pct')::numeric; end if;
  end loop;

  v_vend := coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
  insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen)
  values (v.id, v_vend, v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'online')
  returning id, numero into v_ped;
  insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
  select v_ped.id, (x->>'pid')::uuid, (x->>'q')::numeric, round((x->>'pu')::numeric * (1 - v_esc / 100), 2),
         nullif(concat_ws(' + ', x->>'promo', case when v_esc > 0 then 'Descuento por monto ' || v_esc || ' %' end), '')
    from jsonb_array_elements(v_it) x;
  get diagnostics v_n = row_count;
  if nullif(trim(coalesce(p_nota,'')),'') is not null then
    update pedidos set observaciones = left(trim(p_nota), 500) where id = v_ped.id;
  end if;
  select total into v_total from pedidos where id = v_ped.id;
  return jsonb_build_object('numero', v_ped.numero, 'total', v_total, 'productos', v_n, 'descuento', v_esc);
end $$;

revoke execute on function catalogo_cliente(text), crear_pedido_cliente(text, jsonb, text), catalogo_publico() from public;
grant execute on function catalogo_cliente(text), crear_pedido_cliente(text, jsonb, text), catalogo_publico() to anon, authenticated;
revoke execute on function extras_catalogo(text), productos_catalogo(text), promos_catalogo(text), fijar_nuevo(uuid[], int) from public, anon;
grant execute on function extras_catalogo(text), productos_catalogo(text), promos_catalogo(text), fijar_nuevo(uuid[], int) to authenticated;
grant select on all tables in schema public to service_role;

select 'ventas listo' as resultado;

-- Si ya existe la versión nueva de las funciones, borra la vieja para que no se confundan
do $$
begin
  -- Enviar pedido desde el catálogo del cliente
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'crear_pedido_cliente' and p.pronargs = 5) then
    drop function if exists public.crear_pedido_cliente(text, jsonb, text);
  end if;
  -- Catálogo público
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'catalogo_publico' and p.pronargs = 2) then
    drop function if exists public.catalogo_publico();
    drop function if exists public.catalogo_publico(text);
  end if;
end $$;
