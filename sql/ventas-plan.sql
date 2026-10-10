-- =========================================================
-- VENTAS 7 — CRM Sabores de mi País
-- Día de oferta fijo, venta solo por bulto, crédito a la vista, preventa con reservas,
-- kit de primer pedido, pedido rápido y precios redondeados.
-- Requiere: ventas-servicio.sql. Se puede correr más de una vez.
-- =========================================================

alter table promociones add column if not exists dias_semana int[];
alter table productos add column if not exists solo_bulto boolean not null default false;
alter table combos add column if not exists solo_nuevos boolean not null default false;
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists preventas (
      id          bigint generated always as identity primary key,
      producto_id %2$s references productos(id) on delete set null,
      nombre      text not null,
      descripcion text,
      llega       date,
      precio      numeric(14,2),
      foto        text,
      activa      boolean not null default true,
      creado_en   timestamptz default now())$f$, tc, tq);
  execute format($f$
    create table if not exists reservas (
      id          bigint generated always as identity primary key,
      preventa_id bigint not null references preventas(id) on delete cascade,
      cliente_id  %1$s not null references clientes(id) on delete cascade,
      cantidad    numeric(14,3) not null check (cantidad > 0),
      pedido_id   uuid,
      creado_en   timestamptz default now(),
      unique (preventa_id, cliente_id))$f$, tc, tq);
end $$;
do $$
declare t text;
begin
  foreach t in array array['preventas','reservas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Día de oferta fijo (promos que valen solo ciertos días de la semana) ----------
create or replace function mejor_promo(p_producto uuid, p_lista text, p_cant numeric)
returns table(pct numeric, nombre text) language sql stable security definer set search_path = public as $$
  select case when pr.nombre like 'Bonificación%' and pr.minimo_tipo = 'unidades' and pr.minimo_unidades > 0 and p_cant > 0
              then round(pr.descuento_pct * floor(p_cant / pr.minimo_unidades) * pr.minimo_unidades / p_cant, 4)
              else pr.descuento_pct end, pr.nombre
    from promociones pr, productos p
   where p.id = p_producto and pr.activa
     and current_date >= pr.desde and (pr.hasta is null or current_date <= pr.hasta)
     and (pr.dias_semana is null or cardinality(pr.dias_semana) = 0 or extract(isodow from (now() at time zone 'America/Argentina/Buenos_Aires'))::int = any(pr.dias_semana))
     and (pr.listas is null or cardinality(pr.listas) = 0 or p_lista = any(pr.listas))
     and (pr.alcance = 'todos'
          or (pr.alcance = 'marca'    and upper(coalesce(p.marca,''))   = upper(pr.alcance_valor))
          or (pr.alcance = 'familia'  and upper(coalesce(p.familia,'')) = upper(pr.alcance_valor))
          or (pr.alcance = 'producto' and p.id::text = pr.alcance_valor))
     and (pr.minimo_tipo = 'ninguno'
          or (pr.minimo_tipo = 'unidades' and p_cant >= pr.minimo_unidades)
          or (pr.minimo_tipo = 'bulto' and p.unidades_bulto > 1 and p_cant >= p.unidades_bulto))
   order by 1 desc
   limit 1
$$;
revoke execute on function mejor_promo(uuid, text, numeric) from public, anon;
grant execute on function mejor_promo(uuid, text, numeric) to authenticated;

create or replace function promos_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('n', nombre, 'pct', descuento_pct, 'a', alcance, 'av', alcance_valor,
           'mt', minimo_tipo, 'mu', minimo_unidades, 'ds', dias_semana)), '[]'::jsonb)
    from promociones
   where activa and current_date >= desde and (hasta is null or current_date <= hasta)
     and (dias_semana is null or cardinality(dias_semana) = 0 or extract(isodow from (now() at time zone 'America/Argentina/Buenos_Aires'))::int = any(dias_semana))
     and (listas is null or cardinality(listas) = 0 or p_lista = any(listas))
$$;

-- ---------- Catálogo ----------
create or replace function productos_para(p_lista text, p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           (case when pc.precio is not null then e.x || jsonb_build_object('p', pc.precio, 'pac', true) else e.x end)
           || (case when coalesce(pq.ean, '') <> '' then jsonb_build_object('e', pq.ean) else '{}'::jsonb end)
           || (case when coalesce(pr.solo_bulto, false) and pr.unidades_bulto > 1 then '{"sb": true}'::jsonb else '{}'::jsonb end)
           || (case when pr.pvp > 0 then jsonb_build_object('pvp', pr.pvp) else '{}'::jsonb end)
           || (case when cfg.ss and st.disp is not null and st.disp <= 0 then '{"ss": true}'::jsonb else '{}'::jsonb end)
         order by e.o), '[]'::jsonb)
    from jsonb_array_elements(productos_catalogo(p_lista)) with ordinality e(x, o)
    cross join (select coalesce((select valor from config_app where clave = 'avisar_sin_stock'), 'no') = 'si' ss) cfg
    left join productos pr on pr.id::text = e.x->>'id'
    left join precios_productos pq on pq.producto_id::text = e.x->>'id'
    left join precios_cliente pc on pc.cliente_id = p_cliente and pc.producto_id::text = e.x->>'id'
    left join lateral (select sum(s.disponible) disp from stock s where cfg.ss and s.producto_id::text = e.x->>'id') st on true
$$;

create or replace function extras_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'combos', coalesce((select jsonb_agg(jsonb_build_object('id', 'combo:' || c.id, 'n', c.nombre, 'desc', c.descripcion, 'pct', c.descuento_pct, 'items', c.items, 'nuevo', coalesce(c.solo_nuevos, false)) order by c.id)
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
    'desafio', desafio_mes(),
    'aumento', (select d from (select nullif((select valor from config_app where clave = 'aviso_aumento'), '')::jsonb d) z
                 where (d->>'fecha')::date >= (now() at time zone 'America/Argentina/Buenos_Aires')::date),
    'pronto', nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb,
    'pvp', nullif((select valor from config_app where clave = 'precio_sugerido'), '')::jsonb,
    'sorteo', sorteo_mes(),
    'entrega', nullif((select valor from config_app where clave = 'entregas'), '')::jsonb,
    'niveles_cfg', (select d from (select nullif((select valor from config_app where clave = 'niveles'), '')::jsonb d) z where coalesce((d->>'activo')::boolean, false)))
$$;

create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_ult jsonb; v_r jsonb; v_viejo boolean;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(i), '[]'::jsonb) into v_ult from (
    select jsonb_build_object('id', i.producto_id, 'q', i.cantidad) i from pedido_items i
     where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1)) x;
  v_viejo := exists (select 1 from pedidos where cliente_id = v.id and estado::text <> 'cancelado');
  v_r := jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', productos_para(v_lista, v.id), 'ultimo', v_ult,
    'promos', promos_catalogo(v_lista), 'puntos', puntos_saldo(v.id), 'ref', v.codigo_ref,
    'sugerido', sugerido_cliente(v.id), 'rubro', v.rubro, 'surt', case when coalesce(v.rubro, '') <> '' then surtido_rubro(v.rubro) else '[]'::jsonb end,
    'llevas', compras_mes(v.id),
    'avisos', coalesce((select jsonb_agg(producto_id) from avisos_stock where cliente_id = v.id and avisado_en is null), '[]'::jsonb),
    'favs', coalesce(v.favoritos, '[]'::jsonb),
    'dias', to_jsonb(v.dias_visita), 'nivel', nivel_cliente(v.id),
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'),
    'habituales', (select coalesce(jsonb_agg(pid order by n desc, ul desc), '[]'::jsonb) from (
        select i.producto_id pid, count(*) n, max(p.numero) ul from pedido_items i join pedidos p on p.id = i.pedido_id
         where p.cliente_id = v.id and p.estado::text <> 'cancelado' and p.creado_en > now() - interval '180 days' group by 1 order by 2 desc limit 60) z),
    'credito', case when coalesce(v.limite_credito, 0) > 0 or coalesce(v.condicion_pago_dias, 0) > 0 then jsonb_build_object('limite', coalesce(v.limite_credito, 0), 'dias', coalesce(v.condicion_pago_dias, 0),
        'saldo', coalesce((select saldo from saldos_clientes where cliente_id = v.id), 0)) end,
    'preventas', (select coalesce(jsonb_agg(jsonb_build_object('id', pv.id, 'n', pv.nombre, 'd', pv.descripcion, 'llega', pv.llega, 'p', pv.precio, 'img', coalesce(pv.foto, pr.foto), 'pid', pv.producto_id,
          'mia', (select coalesce(sum(cantidad), 0) from reservas r where r.preventa_id = pv.id and r.cliente_id = v.id)) order by pv.llega), '[]'::jsonb)
        from preventas pv left join productos pr on pr.id = pv.producto_id where pv.activa and (pv.llega is null or pv.llega >= current_date - 3))) || extras_catalogo(v_lista);
  if v_viejo then
    v_r := jsonb_set(v_r, '{combos}', coalesce((select jsonb_agg(c) from jsonb_array_elements(v_r->'combos') c where not coalesce((c->>'nuevo')::boolean, false)), '[]'::jsonb));
  end if;
  return v_r;
end $$;

-- ---------- Pedido online: bulto cerrado y kit de primer pedido ----------
create or replace function crear_pedido_cliente(p_token text, p_items jsonb, p_nota text default null, p_cupon text default null, p_puntos boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; vj jsonb; v_lista text; v_ped record; v_n int; v_total numeric; v_vend uuid;
        v_it jsonb; v_sub numeric; v_esc numeric := 0; v_min numeric; e jsonb; v_cup numeric := 0; v_base numeric;
        v_ptos int := 0; v_canje numeric := 0; v_fac numeric; v_vp numeric; v_niv jsonb; v_npct numeric := 0;
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
    select pp.producto_id pid, pc.precio is not null pac, case when coalesce(px.solo_bulto, false) and px.unidades_bulto > 1 then px.unidades_bulto else 1 end mb,
           coalesce(pc.precio, case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end) precio
      from precios_productos pp left join precios_cliente pc on pc.producto_id = pp.producto_id and pc.cliente_id = v.id
      left join productos px on px.id = pp.producto_id
     where pp.costo > 0),
  sueltos as (
    select b.pid, b.pac, ceil(least(greatest(round((j->>'q')::numeric), 1), 100000) / b.mb) * b.mb q, b.precio
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
                   and (not coalesce(c.solo_nuevos, false) or not exists (select 1 from pedidos px2 where px2.cliente_id = v.id and px2.estado::text <> 'cancelado'))
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
  v_niv := nivel_cliente(v.id); v_npct := coalesce((v_niv->>'pct')::numeric, 0);
  v_base := v_base * (1 - v_npct / 100);
  v_cup := cupon_pct(p_cupon, v.id, v_base);
  v_base := v_base * (1 - v_cup / 100);
  if p_puntos and puntos_activos() then
    v_vp := cfg_num('valor_punto', 10);
    v_canje := least(puntos_saldo(v.id) * v_vp, v_base * cfg_num('canje_max_pct', 20) / 100);
    v_ptos := floor(v_canje / v_vp); v_canje := v_ptos * v_vp;
  end if;
  v_fac := (1 - v_esc / 100) * (1 - v_npct / 100) * (1 - v_cup / 100) * (case when v_base > 0 then 1 - v_canje / v_base else 1 end);

  v_vend := coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
  insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen)
  values (v.id, v_vend, v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'online')
  returning id, numero into v_ped;
  insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
  select v_ped.id, (x->>'pid')::uuid, (x->>'q')::numeric, round((x->>'pu')::numeric * v_fac, 2),
         nullif(concat_ws(' + ', x->>'promo',
           case when v_esc > 0 then 'Descuento por monto ' || trim_scale(v_esc) || ' %' end,
           case when v_npct > 0 then 'Nivel ' || (v_niv->>'n') || ' ' || trim_scale(v_npct) || ' %' end,
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
  return jsonb_build_object('numero', v_ped.numero, 'total', v_total, 'productos', v_n, 'descuento', v_esc, 'cupon', v_cup, 'puntos', v_ptos, 'nivel', v_npct);
end $$;

-- ---------- Reservas de preventa ----------
create or replace function reservar(p_token text, p_preventa bigint, p_cantidad numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if not exists (select 1 from preventas where id = p_preventa and activa) then raise exception 'Esta preventa ya no está disponible.'; end if;
  if coalesce(p_cantidad, 0) <= 0 then
    delete from reservas where preventa_id = p_preventa and cliente_id = v_id and pedido_id is null;
    return jsonb_build_object('ok', true, 'cantidad', 0);
  end if;
  insert into reservas (preventa_id, cliente_id, cantidad) values (p_preventa, v_id, least(round(p_cantidad), 100000))
  on conflict (preventa_id, cliente_id) do update set cantidad = excluded.cantidad, creado_en = now();
  return jsonb_build_object('ok', true, 'cantidad', least(round(p_cantidad), 100000));
end $$;

-- ---------- Precios redondeados (se aplican sobre la lista calculada) ----------
-- config 'redondeo_precios' = {"mayorista":{"paso":10,"fin":0},"minorista":{"paso":100,"fin":90},...}
create or replace function redondear_precio(v numeric, p_lista text) returns numeric language sql stable security definer set search_path = public as $$
  select case when v is null or r is null or coalesce((r->>'paso')::numeric, 0) <= 0 then v
              else greatest(ceil((v - coalesce((r->>'fin')::numeric, 0)) / (r->>'paso')::numeric) * (r->>'paso')::numeric + coalesce((r->>'fin')::numeric, 0), (r->>'paso')::numeric) end
    from (select (select nullif(valor, '')::jsonb from config_app where clave = 'redondeo_precios') -> p_lista r) z
$$;
do $$
declare def text; opts text[]; cols text;
begin
  if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'precios_base') then
    if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'precios_productos') then
      raise notice 'precios_productos no es una vista: se omite el redondeo';
      return;
    end if;
    def := pg_get_viewdef('public.precios_productos'::regclass, true);
    select reloptions into opts from pg_class where oid = 'public.precios_productos'::regclass;
    execute 'create view public.precios_base as ' || def;
    if opts is not null then execute format('alter view public.precios_base set (%s)', array_to_string(opts, ',')); end if;
    execute 'grant select on public.precios_base to authenticated, service_role';
  end if;
  -- Mismas columnas, en el mismo orden y con el mismo tipo; solo se redondean los precios de lista
  select string_agg(case when a.attname in ('precio_mayorista', 'precio_minorista', 'precio_especial')
                         then format('redondear_precio(%I, %L)::%s as %I', a.attname, replace(a.attname, 'precio_', ''), format_type(a.atttypid, a.atttypmod), a.attname)
                         else quote_ident(a.attname) end, ', ' order by a.attnum)
    into cols from pg_attribute a where a.attrelid = 'public.precios_productos'::regclass and a.attnum > 0 and not a.attisdropped;
  execute 'create or replace view public.precios_productos as select ' || cols || ' from public.precios_base';
end $$;
grant execute on function redondear_precio(numeric, text) to authenticated, anon, service_role;

revoke execute on function reservar(text, bigint, numeric) from public;
grant execute on function reservar(text, bigint, numeric), catalogo_cliente(text), crear_pedido_cliente(text, jsonb, text, text, boolean) to anon, authenticated;
revoke execute on function promos_catalogo(text), productos_para(text, uuid), extras_catalogo(text) from public, anon;
grant execute on function promos_catalogo(text), productos_para(text, uuid), extras_catalogo(text) to authenticated;
grant select on all tables in schema public to service_role;

select 'ventas plan lista' as resultado;
