-- =========================================================
-- VENTAS 3 — CRM Sabores de mi País
-- Pedido sugerido, carritos sin enviar, "avisame cuando llegue", ofertas relámpago,
-- qué buscan y no encuentran, surtido por rubro, desafío del mes y precio pactado por cliente.
-- Requiere: fidelizacion.sql. Se puede correr más de una vez.
-- =========================================================

-- ---------- Tablas ----------
alter table clientes add column if not exists rubro text;
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists carritos (
      cliente_id     %1$s primary key references clientes(id) on delete cascade,
      items          jsonb not null default '[]',
      total          numeric(14,2) not null default 0,
      actualizado_en timestamptz not null default now(),
      contactado_en  timestamptz)$f$, tc);
  execute format($f$
    create table if not exists avisos_stock (
      id          bigint generated always as identity primary key,
      cliente_id  %1$s not null references clientes(id) on delete cascade,
      producto_id %2$s not null references productos(id) on delete cascade,
      creado_en   timestamptz not null default now(),
      avisado_en  timestamptz)$f$, tc, tq);
  execute format($f$
    create table if not exists busquedas (
      id         bigint generated always as identity primary key,
      texto      text not null,
      cliente_id %1$s references clientes(id) on delete set null,
      fecha      timestamptz not null default now())$f$, tc);
  execute format($f$
    create table if not exists precios_cliente (
      cliente_id     %1$s not null references clientes(id) on delete cascade,
      producto_id    %2$s not null references productos(id) on delete cascade,
      precio         numeric(14,2) not null check (precio > 0),
      actualizado_en timestamptz not null default now(),
      primary key (cliente_id, producto_id))$f$, tc, tq);
end $$;
create unique index if not exists avisos_stock_pend on avisos_stock (cliente_id, producto_id) where avisado_en is null;
create index if not exists busquedas_fecha on busquedas (fecha);

do $$
declare t text;
begin
  foreach t in array array['carritos','avisos_stock','busquedas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
alter table precios_cliente enable row level security;
drop policy if exists "leer_pactados" on precios_cliente;
drop policy if exists "dueno_pactados" on precios_cliente;
create policy "leer_pactados" on precios_cliente for select to authenticated using (true);
create policy "dueno_pactados" on precios_cliente for all to authenticated using (es_dueno()) with check (es_dueno());
grant select, insert, update, delete on precios_cliente to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Productos del catálogo con precio pactado y "sin stock" ----------
create or replace function productos_para(p_lista text, p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           (case when pc.precio is not null then e.x || jsonb_build_object('p', pc.precio, 'pac', true) else e.x end)
           || (case when cfg.ss and st.disp is not null and st.disp <= 0 then '{"ss": true}'::jsonb else '{}'::jsonb end)
         order by e.o), '[]'::jsonb)
    from jsonb_array_elements(productos_catalogo(p_lista)) with ordinality e(x, o)
    cross join (select coalesce((select valor from config_app where clave = 'avisar_sin_stock'), 'no') = 'si' ss) cfg
    left join precios_cliente pc on pc.cliente_id = p_cliente and pc.producto_id::text = e.x->>'id'
    left join lateral (select sum(s.disponible) disp from stock s where cfg.ss and s.producto_id::text = e.x->>'id') st on true
$$;

-- Lo que más compran los negocios de un rubro (últimos 180 días)
create or replace function surtido_rubro(p_rubro text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(pid order by n desc), '[]'::jsonb) from (
    select i.producto_id pid, count(distinct p.cliente_id) n
      from pedido_items i join pedidos p on p.id = i.pedido_id join clientes c on c.id = p.cliente_id
     where lower(trim(c.rubro)) = lower(trim(p_rubro)) and p.estado::text <> 'cancelado' and p.creado_en > now() - interval '180 days'
     group by 1 order by 2 desc limit 24) z
$$;

-- Pedido sugerido: lo que lleva en la mitad o más de sus últimos 6 pedidos, con su cantidad promedio
create or replace function sugerido_cliente(p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with u as (select id from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado' order by numero desc limit 6),
  n as (select count(*) n from u),
  x as (select i.producto_id pid, count(distinct i.pedido_id) veces, sum(i.cantidad) / count(distinct i.pedido_id) q
          from pedido_items i join u on u.id = i.pedido_id group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', pid, 'q', greatest(round(q), 1)) order by veces desc, q desc), '[]'::jsonb)
    from x, n where n.n >= 2 and x.veces >= greatest(2, ceil(n.n * 0.5))
$$;

-- Desafío del mes (lo configura el dueño en el CRM)
create or replace function desafio_mes() returns jsonb language sql stable security definer set search_path = public as $$
  select d from (select nullif((select valor from config_app where clave = 'desafio'), '')::jsonb d) z
   where d->>'mes' = to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') and coalesce((d->>'meta')::numeric, 0) > 0
$$;
create or replace function compras_mes(p_cliente uuid) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(total), 0) from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado'
     and to_char(creado_en at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') = to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM')
$$;

create or replace function extras_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'combos', coalesce((select jsonb_agg(jsonb_build_object('id', 'combo:' || c.id, 'n', c.nombre, 'desc', c.descripcion, 'pct', c.descuento_pct, 'items', c.items) order by c.id)
                          from combos c where c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)), '[]'::jsonb),
    'escalas', coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb),
    'minimo',  nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric,
    'envio',   nullif((select valor from config_app where clave = 'envio_gratis_desde'), '')::numeric,
    'co',      sugerencias_juntos(),
    'hay_cupones', exists (select 1 from cupones where activo and (hasta is null or hasta >= current_date)),
    'puntos_activo', puntos_activos(), 'valor_punto', cfg_num('valor_punto', 10), 'canje_max', cfg_num('canje_max_pct', 20),
    'puntos_cada', cfg_num('puntos_cada', 1000), 'referido_puntos', cfg_num('referido_puntos', 500),
    'relampago', coalesce((select jsonb_agg(jsonb_build_object('id', alcance_valor, 'pct', descuento_pct, 'hasta', hasta))
                             from promociones where activa and nombre like '⚡%' and alcance = 'producto' and current_date >= desde and hasta >= current_date
                              and (listas is null or cardinality(listas) = 0 or p_lista = any(listas))), '[]'::jsonb),
    'desafio', desafio_mes())
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
  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', productos_para(v_lista, v.id), 'ultimo', v_ult,
    'promos', promos_catalogo(v_lista), 'puntos', puntos_saldo(v.id), 'ref', v.codigo_ref,
    'sugerido', sugerido_cliente(v.id), 'rubro', v.rubro, 'surt', case when coalesce(v.rubro, '') <> '' then surtido_rubro(v.rubro) else '[]'::jsonb end,
    'llevas', compras_mes(v.id),
    'avisos', coalesce((select jsonb_agg(producto_id) from avisos_stock where cliente_id = v.id and avisado_en is null), '[]'::jsonb),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa')) || extras_catalogo(v_lista);
end $$;

drop function if exists catalogo_publico(text);
drop function if exists catalogo_publico();
create or replace function catalogo_publico(p_ref text default null, p_rubro text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_lista text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then
    raise exception 'El catálogo no está disponible en este momento.';
  end if;
  return jsonb_build_object('cliente', null, 'lista', v_lista, 'productos', productos_para(v_lista, null), 'ultimo', '[]'::jsonb,
    'promos', promos_catalogo(v_lista), 'publico', true,
    'ref_nombre', (select razon_social from clientes where codigo_ref = upper(trim(p_ref)) and coalesce(activo, true)),
    'rubro', nullif(left(trim(coalesce(p_rubro, '')), 40), ''),
    'surt', case when coalesce(trim(p_rubro), '') <> '' then surtido_rubro(p_rubro) else '[]'::jsonb end,
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'mp',  (select valor from config_app where clave = 'link_mp')) || extras_catalogo(v_lista) - 'desafio';
end $$;

-- ---------- Carrito guardado, aviso de stock y búsquedas ----------
create or replace function guardar_carrito(p_token text, p_items jsonb, p_total numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then return; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then delete from carritos where cliente_id = v_id; return; end if;
  if jsonb_array_length(p_items) > 300 then return; end if;
  insert into carritos (cliente_id, items, total, actualizado_en, contactado_en) values (v_id, p_items, least(greatest(coalesce(p_total, 0), 0), 999999999), now(), null)
  on conflict (cliente_id) do update set items = excluded.items, total = excluded.total, actualizado_en = now(), contactado_en = null;
end $$;

create or replace function pedir_aviso(p_token text, p_producto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if not exists (select 1 from productos where id::text = p_producto) then raise exception 'Ese producto no existe.'; end if;
  insert into avisos_stock (cliente_id, producto_id) select v_id, id from productos where id::text = p_producto
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function registrar_busqueda(p_token text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; t text := lower(left(trim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g')), 60));
begin
  if length(t) < 3 then return; end if;
  if (select count(*) from busquedas where fecha > now() - interval '1 minute') > 40 then return; end if;
  if coalesce(p_token, '') <> '' then select id into v_id from clientes where token_pedidos = p_token; end if;
  if exists (select 1 from busquedas where texto = t and cliente_id is not distinct from v_id and fecha > now() - interval '6 hours') then return; end if;
  insert into busquedas (texto, cliente_id) values (t, v_id);
end $$;

-- ---------- Pedido online: precio pactado + borra el carrito guardado ----------
create or replace function crear_pedido_cliente(p_token text, p_items jsonb, p_nota text default null, p_cupon text default null, p_puntos boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; vj jsonb; v_lista text; v_ped record; v_n int; v_total numeric; v_vend uuid;
        v_it jsonb; v_sub numeric; v_esc numeric := 0; v_min numeric; e jsonb; v_cup numeric := 0; v_base numeric;
        v_ptos int := 0; v_canje numeric := 0; v_fac numeric; v_vp numeric;
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
    select pp.producto_id pid, pc.precio is not null pac,
           coalesce(pc.precio, case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end) precio
      from precios_productos pp left join precios_cliente pc on pc.producto_id = pp.producto_id and pc.cliente_id = v.id
     where pp.costo > 0),
  sueltos as (
    select b.pid, b.pac, least(greatest(round((j->>'q')::numeric), 1), 100000) q, b.precio
      from jsonb_array_elements(p_items) j join base b on b.pid::text = j->>'id'
     where (j->>'q')::numeric >= 1),
  lineas as (
    select s.pid, s.q, round(s.precio * (1 - coalesce(case when not s.pac then mp.pct end, 0) / 100), 2) pu,
           case when s.pac then 'Precio pactado' when mp.pct is not null then mp.nombre end promo
      from sueltos s left join lateral mejor_promo(s.pid, v_lista, s.q) mp on true
    union all
    select b.pid, (ci->>'q')::numeric * least(greatest(round((j->>'q')::numeric), 1), 1000), round(b.precio * (1 - c.descuento_pct / 100), 2),
           case when c.nombre ilike 'combo%' then c.nombre else 'Combo ' || c.nombre end
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
  v_base := v_sub * (1 - v_esc / 100);
  v_cup := cupon_pct(p_cupon, v.id, v_base);
  v_base := v_base * (1 - v_cup / 100);
  if p_puntos and puntos_activos() then
    v_vp := cfg_num('valor_punto', 10);
    v_canje := least(puntos_saldo(v.id) * v_vp, v_base * cfg_num('canje_max_pct', 20) / 100);
    v_ptos := floor(v_canje / v_vp); v_canje := v_ptos * v_vp;
  end if;
  v_fac := (1 - v_esc / 100) * (1 - v_cup / 100) * (case when v_base > 0 then 1 - v_canje / v_base else 1 end);

  v_vend := coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
  insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen)
  values (v.id, v_vend, v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'online')
  returning id, numero into v_ped;
  insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
  select v_ped.id, (x->>'pid')::uuid, (x->>'q')::numeric, round((x->>'pu')::numeric * v_fac, 2),
         nullif(concat_ws(' + ', x->>'promo',
           case when v_esc > 0 then 'Descuento por monto ' || trim_scale(v_esc) || ' %' end,
           case when v_cup > 0 then 'Cupón ' || upper(trim(p_cupon)) || ' ' || trim_scale(v_cup) || ' %' end,
           case when v_ptos > 0 then 'Canje de ' || v_ptos || ' puntos' end), '')
    from jsonb_array_elements(v_it) x;
  get diagnostics v_n = row_count;
  if v_cup > 0 then insert into cupones_usos (codigo, cliente_id, pedido_id) values (upper(trim(p_cupon)), v.id, v_ped.id); end if;
  if v_ptos > 0 then insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (v.id, -v_ptos, 'Canje en pedido N° ' || v_ped.numero, v_ped.id); end if;
  if nullif(trim(coalesce(p_nota,'')),'') is not null then
    update pedidos set observaciones = left(trim(p_nota), 500) where id = v_ped.id;
  end if;
  delete from carritos where cliente_id = v.id;
  select total into v_total from pedidos where id = v_ped.id;
  return jsonb_build_object('numero', v_ped.numero, 'total', v_total, 'productos', v_n, 'descuento', v_esc, 'cupon', v_cup, 'puntos', v_ptos);
end $$;

-- ---------- Puntos al entregar + recomendación + desafío del mes ----------
create or replace function puntos_por_entrega() returns trigger language plpgsql security definer set search_path = public as $$
declare v_p int; v_ref uuid; v_bono int; d jsonb; v_mes text;
begin
  if new.estado::text = 'entregado' and old.estado::text is distinct from 'entregado' and puntos_activos() then
    if not exists (select 1 from puntos_mov where pedido_id = new.id and puntos > 0 and motivo like 'Compra%') then
      v_p := floor(coalesce(new.total, 0) / greatest(cfg_num('puntos_cada', 1000), 1));
      if v_p > 0 then insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, v_p, 'Compra pedido N° ' || new.numero, new.id); end if;
    end if;
    select referido_por into v_ref from clientes where id = new.cliente_id;
    v_bono := cfg_num('referido_puntos', 500)::int;
    if v_ref is not null and v_bono > 0
       and not exists (select 1 from puntos_mov where cliente_id = new.cliente_id and motivo = 'Bienvenida por recomendación') then
      insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, v_bono, 'Bienvenida por recomendación', new.id);
      insert into puntos_mov (cliente_id, puntos, motivo, pedido_id)
        values (v_ref, v_bono, 'Recomendaste a ' || (select razon_social from clientes where id = new.cliente_id), new.id);
    end if;
    d := desafio_mes();
    if d is not null and coalesce((d->>'puntos')::int, 0) > 0 then
      v_mes := d->>'mes';
      if not exists (select 1 from puntos_mov where cliente_id = new.cliente_id and motivo = 'Desafío ' || v_mes)
         and (select coalesce(sum(total), 0) from pedidos where cliente_id = new.cliente_id and estado::text = 'entregado'
                and to_char(creado_en at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') = v_mes) >= (d->>'meta')::numeric then
        insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, (d->>'puntos')::int, 'Desafío ' || v_mes, new.id);
      end if;
    end if;
  end if;
  return new;
end $$;

-- ---------- Cuenta online: + desafío del mes ----------
create or replace function cuenta_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_fac jsonb; v_pag jsonb; v_pm jsonb; d jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', tipo, 'n', numero, 'f', fecha, 'v', vencimiento, 'tot', total, 'p', pendiente, 'dm', dias_mora) order by vencimiento), '[]'::jsonb)
    into v_fac from facturas_estado where cliente_id = v.id and pendiente > 0.005;
  select coalesce(jsonb_agg(x order by (x->>'n')::bigint desc), '[]'::jsonb) into v_pag from (
    select jsonb_build_object('n', numero, 'f', fecha, 'i', importe, 'm', medio) x from recibos
     where cliente_id = v.id and not coalesce(anulado, false) order by numero desc limit 15) r;
  select coalesce(jsonb_agg(x order by x->>'f' desc), '[]'::jsonb) into v_pm from (
    select jsonb_build_object('f', fecha, 'p', puntos, 'm', motivo) x from puntos_mov where cliente_id = v.id order by fecha desc limit 12) r;
  d := desafio_mes();
  if d is not null then
    d := d || jsonb_build_object('llevas', compras_mes(v.id), 'logrado', exists (select 1 from puntos_mov where cliente_id = v.id and motivo = 'Desafío ' || (d->>'mes')));
  end if;
  return jsonb_build_object('cliente', v.razon_social,
    'saldo', coalesce((select saldo from saldos_clientes where cliente_id = v.id), 0),
    'vencido', coalesce((select sum(pendiente) from facturas_estado where cliente_id = v.id and pendiente > 0.005 and dias_mora > 0), 0),
    'facturas', v_fac, 'pagos', v_pag,
    'puntos', puntos_saldo(v.id), 'puntos_mov', v_pm, 'puntos_activo', puntos_activos(),
    'valor_punto', cfg_num('valor_punto', 10), 'puntos_cada', cfg_num('puntos_cada', 1000), 'referido_puntos', cfg_num('referido_puntos', 500),
    'ref', v.codigo_ref, 'referidos', (select count(*) from clientes where referido_por = v.id),
    'desafio', d,
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

-- ---------- Permisos ----------
revoke execute on function catalogo_publico(text, text), guardar_carrito(text, jsonb, numeric), pedir_aviso(text, text), registrar_busqueda(text, text) from public;
grant execute on function catalogo_cliente(text), catalogo_publico(text, text), crear_pedido_cliente(text, jsonb, text, text, boolean), cuenta_cliente(text),
  guardar_carrito(text, jsonb, numeric), pedir_aviso(text, text), registrar_busqueda(text, text) to anon, authenticated;
revoke execute on function productos_para(text, uuid), surtido_rubro(text), sugerido_cliente(uuid), desafio_mes(), compras_mes(uuid) from public, anon;
grant execute on function productos_para(text, uuid), surtido_rubro(text), sugerido_cliente(uuid), desafio_mes(), compras_mes(uuid) to authenticated;
grant select on all tables in schema public to service_role;

select 'ventas mas lista' as resultado;
