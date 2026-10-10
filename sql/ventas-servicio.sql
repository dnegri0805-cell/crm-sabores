-- =========================================================
-- VENTAS 6 — CRM Sabores de mi País
-- Escanear para reponer, próxima entrega, seguimiento y comprobantes en Mi cuenta,
-- reclamos con foto, "¿qué querés que traigamos?" y niveles de cliente (Bronce/Plata/Oro).
-- Requiere: ventas-fieles.sql. Se puede correr más de una vez.
-- =========================================================

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists reclamos (
      id            bigint generated always as identity primary key,
      cliente_id    %1$s not null references clientes(id) on delete cascade,
      pedido_numero bigint,
      tipo          text not null,
      detalle       text,
      foto          text,
      estado        text not null default 'abierto' check (estado in ('abierto','resuelto')),
      respuesta     text,
      creado_en     timestamptz not null default now(),
      resuelto_en   timestamptz)$f$, tc);
  execute format($f$
    create table if not exists pedidos_sugeridos (
      id         bigint generated always as identity primary key,
      cliente_id %1$s references clientes(id) on delete set null,
      texto      text not null,
      estado     text not null default 'nuevo',
      creado_en  timestamptz not null default now())$f$, tc);
end $$;
do $$
declare t text;
begin
  foreach t in array array['reclamos','pedidos_sugeridos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Niveles de cliente ----------
-- config 'niveles' = {"activo":true,"dias":90,"niveles":[{"n":"Bronce","desde":0,"pct":0},{"n":"Plata","desde":600000,"pct":2},{"n":"Oro","desde":1500000,"pct":4}]}
create or replace function nivel_cliente(p_cliente uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d jsonb; v_c numeric; e jsonb; v_act jsonb; v_prox jsonb;
begin
  d := nullif((select valor from config_app where clave = 'niveles'), '')::jsonb;
  if d is null or not coalesce((d->>'activo')::boolean, false) then return null; end if;
  select coalesce(sum(total), 0) into v_c from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado'
     and creado_en > now() - make_interval(days => coalesce((d->>'dias')::int, 90));
  for e in select x from jsonb_array_elements(d->'niveles') x order by (x->>'desde')::numeric loop
    if v_c >= (e->>'desde')::numeric then v_act := e; elsif v_prox is null then v_prox := e; end if;
  end loop;
  return coalesce(v_act, '{}'::jsonb) || jsonb_build_object('compras', v_c, 'dias', coalesce((d->>'dias')::int, 90), 'prox', v_prox);
end $$;

-- ---------- Catálogo con código de barras (para escanear) ----------
create or replace function productos_para(p_lista text, p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           (case when pc.precio is not null then e.x || jsonb_build_object('p', pc.precio, 'pac', true) else e.x end)
           || (case when coalesce(pq.ean, '') <> '' then jsonb_build_object('e', pq.ean) else '{}'::jsonb end)
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
    'favs', coalesce(v.favoritos, '[]'::jsonb),
    'dias', to_jsonb(v.dias_visita), 'nivel', nivel_cliente(v.id),
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa')) || extras_catalogo(v_lista);
end $$;

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
    'sorteo', (select s || jsonb_build_object('llevas', compras_mes(v.id), 'numeros', floor(compras_mes(v.id) / greatest((s->>'cada')::numeric, 1)))
                 from (select sorteo_mes() s) z where s is not null),
    'nivel', nivel_cliente(v.id),
    'pedidos', (select coalesce(jsonb_agg(x order by (x->>'n')::bigint desc), '[]'::jsonb) from (
       select jsonb_build_object('n', numero, 'f', creado_en, 'e', estado, 't', total, 'ent', entregado_en) x from pedidos
        where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 8) z),
    'reclamos', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', pedido_numero, 'tipo', tipo, 'e', estado, 'r', respuesta, 'f', creado_en) order by id desc), '[]'::jsonb)
                   from (select * from reclamos where cliente_id = v.id order by id desc limit 5) r),
    'pronto', nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb,
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

-- ---------- Pedido online con el beneficio del nivel ----------
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

-- ---------- Reclamos y sugerencias de productos ----------
create or replace function crear_reclamo(p_token text, p_numero bigint, p_tipo text, p_detalle text default null, p_foto text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_r bigint;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if (select count(*) from reclamos where cliente_id = v_id and creado_en > now() - interval '1 day') >= 10 then raise exception 'Ya mandaste varios reclamos hoy. Escribinos por WhatsApp.'; end if;
  if p_foto is not null and (length(p_foto) > 700000 or p_foto not like 'data:image/%') then p_foto := null; end if;
  insert into reclamos (cliente_id, pedido_numero, tipo, detalle, foto)
  values (v_id, p_numero, left(coalesce(nullif(trim(p_tipo), ''), 'Otro'), 60), nullif(left(trim(coalesce(p_detalle, '')), 800), ''), p_foto)
  returning id into v_r;
  return jsonb_build_object('ok', true, 'id', v_r);
end $$;

create or replace function sugerir_producto(p_token text, p_texto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; t text := left(trim(coalesce(p_texto, '')), 120);
begin
  if length(t) < 3 then raise exception 'Escribí qué producto te gustaría.'; end if;
  if coalesce(p_token, '') <> '' then select id into v_id from clientes where token_pedidos = p_token; end if;
  if (select count(*) from pedidos_sugeridos where creado_en > now() - interval '1 hour') > 60 then raise exception 'Probá de nuevo en un rato.'; end if;
  insert into pedidos_sugeridos (cliente_id, texto) values (v_id, t);
  return jsonb_build_object('ok', true);
end $$;

-- Comprobante de un pedido (para que el cliente lo vea o lo descargue)
create or replace function comprobante_cliente(p_token text, p_numero bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; o pedidos%rowtype;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where cliente_id = v.id and numero = p_numero;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  return jsonb_build_object('numero', o.numero, 'fecha', o.creado_en, 'estado', o.estado, 'total', o.total,
    'cliente', v.razon_social, 'cuit', v.cuit, 'domicilio', v.domicilio,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('d', coalesce(pp.descripcion, 'Producto'), 'q', i.cantidad, 'pu', i.precio_unitario, 'promo', i.promo) order by pp.descripcion), '[]'::jsonb)
                from pedido_items i left join precios_productos pp on pp.producto_id = i.producto_id where i.pedido_id = o.id));
end $$;

revoke execute on function crear_reclamo(text, bigint, text, text, text), sugerir_producto(text, text), comprobante_cliente(text, bigint) from public;
grant execute on function crear_reclamo(text, bigint, text, text, text), sugerir_producto(text, text), comprobante_cliente(text, bigint),
  catalogo_cliente(text), cuenta_cliente(text), crear_pedido_cliente(text, jsonb, text, text, boolean) to anon, authenticated;
revoke execute on function nivel_cliente(uuid), productos_para(text, uuid), extras_catalogo(text) from public, anon;
grant execute on function nivel_cliente(uuid), productos_para(text, uuid), extras_catalogo(text) to authenticated;
grant select on all tables in schema public to service_role;

select 'ventas servicio lista' as resultado;
