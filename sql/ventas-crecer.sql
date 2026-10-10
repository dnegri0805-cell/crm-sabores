-- =========================================================
-- VENTAS 4 — CRM Sabores de mi País
-- Alta de clientes y pedidos desde el catálogo público, pedido automático elegido por el cliente,
-- bonificación en mercadería (12+1), descuento por pronto pago, aviso de aumento,
-- precios de la competencia, muestras y prospectos en el mapa.
-- Requiere: ventas-mas.sql. Se puede correr más de una vez.
-- =========================================================

-- ---------- Tablas y columnas ----------
alter table presupuestos add column if not exists origen text not null default 'crm';
alter table prospectos add column if not exists lat numeric(9,6);
alter table prospectos add column if not exists lng numeric(9,6);
alter table prospectos add column if not exists cuit text;
alter table prospectos add column if not exists origen text;
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists precios_competencia (
      id          bigint generated always as identity primary key,
      producto_id %2$s not null references productos(id) on delete cascade,
      competidor  text not null,
      precio      numeric(14,2) not null check (precio > 0),
      fecha       date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
      nota        text,
      creado_en   timestamptz default now())$f$, tc, tq);
  execute format($f$
    create table if not exists muestras (
      id           bigint generated always as identity primary key,
      cliente_id   %1$s references clientes(id) on delete cascade,
      prospecto_id uuid,
      nombre       text,
      telefono     text,
      producto_id  %2$s not null references productos(id) on delete cascade,
      cantidad     numeric(14,3),
      fecha        date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
      seguimiento  date,
      resultado    text,
      nota         text,
      creado_en    timestamptz default now())$f$, tc, tq);
end $$;
do $$
declare t text;
begin
  foreach t in array array['precios_competencia','muestras'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Bonificación en mercadería: "llevá 13, pagá 12" ----------
-- Se guarda como promoción "Bonificación …" con mínimo N unidades y el % que equivale a lo que se regala.
-- El descuento real se calcula sobre los múltiplos de N (si lleva 20 con 12+1, se regala 1, no 1,5).
create or replace function mejor_promo(p_producto uuid, p_lista text, p_cant numeric)
returns table(pct numeric, nombre text) language sql stable security definer set search_path = public as $$
  select case when pr.nombre like 'Bonificación%' and pr.minimo_tipo = 'unidades' and pr.minimo_unidades > 0 and p_cant > 0
              then round(pr.descuento_pct * floor(p_cant / pr.minimo_unidades) * pr.minimo_unidades / p_cant, 4)
              else pr.descuento_pct end, pr.nombre
    from promociones pr, productos p
   where p.id = p_producto and pr.activa
     and current_date >= pr.desde and (pr.hasta is null or current_date <= pr.hasta)
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

-- ---------- Catálogo: aviso de aumento, pronto pago y pedido automático ----------
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
    'pronto', nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb)
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
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa')) || extras_catalogo(v_lista);
end $$;

-- El cliente elige repetir su pedido automáticamente ciertos días de la semana (1 = lunes … 7 = domingo)
create or replace function fijo_cliente(p_token text, p_dias int[], p_items jsonb, p_activo boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_d int[];
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '' and coalesce(activo, true);
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  select coalesce(array_agg(distinct d order by d), '{}') into v_d from unnest(coalesce(p_dias, '{}')) d where d between 1 and 7;
  if p_activo and cardinality(v_d) = 0 then raise exception 'Elegí al menos un día.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 150 then raise exception 'El pedido no es válido.'; end if;
  if p_activo and jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  insert into pedidos_fijos (cliente_id, dias, items, activo, nota)
  values (v_id, v_d, (select coalesce(jsonb_agg(jsonb_build_object('id', j->>'id', 'q', greatest(round((j->>'q')::numeric), 1))), '[]'::jsonb)
                        from jsonb_array_elements(p_items) j where j->>'id' not like 'combo:%' and (j->>'q')::numeric >= 1), p_activo, 'Pedido automático (lo eligió el cliente)')
  on conflict (cliente_id) do update set dias = case when p_activo then excluded.dias else pedidos_fijos.dias end,
     items = case when p_activo then excluded.items else pedidos_fijos.items end, activo = p_activo;
  return jsonb_build_object('ok', true, 'dias', v_d);
end $$;

-- ---------- Alta de clientes nuevos y pedidos desde el catálogo público ----------
create or replace function alta_web(p_nombre text, p_telefono text, p_domicilio text default null, p_rubro text default null,
                                    p_contacto text default null, p_cuit text default null, p_nota text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tel text := left(trim(coalesce(p_telefono, '')), 30); v_nom text := left(trim(coalesce(p_nombre, '')), 80);
begin
  if length(v_nom) < 2 then raise exception 'Poné el nombre de tu negocio.'; end if;
  if length(regexp_replace(v_tel, '\D', '', 'g')) < 8 then raise exception 'Poné un teléfono de WhatsApp válido.'; end if;
  if (select count(*) from prospectos where origen = 'catalogo' and creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Hay demasiadas altas en este momento. Probá en un rato o escribinos por WhatsApp.'; end if;
  select id into v_id from prospectos where origen = 'catalogo' and regexp_replace(telefono, '\D', '', 'g') = regexp_replace(v_tel, '\D', '', 'g')
     and creado_en > now() - interval '30 days' order by creado_en desc limit 1;
  if v_id is null then
    insert into prospectos (nombre, telefono, domicilio, rubro, contacto, cuit, observaciones, estado, origen, proximo_seguimiento)
    values (v_nom, v_tel, nullif(left(trim(coalesce(p_domicilio, '')), 120), ''), nullif(left(trim(coalesce(p_rubro, '')), 40), ''),
            nullif(left(trim(coalesce(p_contacto, '')), 60), ''), nullif(left(trim(coalesce(p_cuit, '')), 20), ''),
            nullif(left(trim(coalesce(p_nota, '')), 300), ''), 'nuevo', 'catalogo', (now() at time zone 'America/Argentina/Buenos_Aires')::date)
    returning id into v_id;
  else
    update prospectos set domicilio = coalesce(nullif(left(trim(coalesce(p_domicilio, '')), 120), ''), domicilio),
                          rubro = coalesce(nullif(left(trim(coalesce(p_rubro, '')), 40), ''), rubro), actualizado_en = now()
     where id = v_id;
  end if;
  return v_id;
end $$;

create or replace function pedido_publico(p_nombre text, p_telefono text, p_domicilio text, p_items jsonb, p_nota text default null,
                                          p_ref text default null, p_cupon text default null, p_rubro text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_lista text; v_it jsonb; v_sub numeric; v_esc numeric := 0; e jsonb; v_cup numeric := 0; v_fac numeric; v_tot numeric;
        v_num bigint; v_pro uuid; v_ref text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then raise exception 'El catálogo no está disponible en este momento.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'El pedido tiene demasiados productos.'; end if;
  if (select count(*) from presupuestos where origen = 'catalogo' and creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Hay muchos pedidos en este momento. Mandanos el pedido por WhatsApp.'; end if;
  v_ref := (select razon_social from clientes where codigo_ref = upper(trim(p_ref)));
  v_pro := alta_web(p_nombre, p_telefono, p_domicilio, p_rubro, null, null, case when v_ref is not null then 'Lo recomendó ' || v_ref || ' (código ' || upper(trim(p_ref)) || ')' end);

  with base as (
    select pp.producto_id pid, case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end precio
      from precios_productos pp where pp.costo > 0),
  sueltos as (
    select b.pid, least(greatest(round((j->>'q')::numeric), 1), 100000) q, b.precio
      from jsonb_array_elements(p_items) j join base b on b.pid::text = j->>'id' where (j->>'q')::numeric >= 1),
  lineas as (
    select s.pid, s.q, round(s.precio * (1 - coalesce(mp.pct, 0) / 100), 2) pu, case when mp.pct is not null then mp.nombre end promo
      from sueltos s left join lateral mejor_promo(s.pid, v_lista, s.q) mp on true
    union all
    select b.pid, (ci->>'q')::numeric * least(greatest(round((j->>'q')::numeric), 1), 1000), round(b.precio * (1 - c.descuento_pct / 100), 2),
           case when c.nombre ilike 'combo%' then c.nombre else 'Combo ' || c.nombre end
      from jsonb_array_elements(p_items) j
      join combos c on 'combo:' || c.id = j->>'id' and c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)
      cross join jsonb_array_elements(c.items) ci join base b on b.pid::text = ci->>'id'
     where (j->>'q')::numeric >= 1)
  select jsonb_agg(jsonb_build_object('id', pid, 'q', q, 'pu', round(t / q, 2), 'promo', promo)) into v_it
    from (select pid, sum(q) q, sum(q * pu) t, string_agg(distinct promo, ' + ') promo from lineas group by pid) z;
  if v_it is null then raise exception 'Ninguno de los productos está disponible.'; end if;

  select sum((x->>'q')::numeric * (x->>'pu')::numeric) into v_sub from jsonb_array_elements(v_it) x;
  for e in select * from jsonb_array_elements(coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb)) loop
    if v_sub >= (e->>'desde')::numeric and (e->>'pct')::numeric > v_esc then v_esc := (e->>'pct')::numeric; end if;
  end loop;
  v_cup := cupon_pct(p_cupon, null, v_sub * (1 - v_esc / 100));
  v_fac := (1 - v_esc / 100) * (1 - v_cup / 100);
  select jsonb_agg(jsonb_build_object('id', x->>'id', 'q', (x->>'q')::numeric, 'pu', round((x->>'pu')::numeric * v_fac, 2),
           'promo', nullif(concat_ws(' + ', x->>'promo', case when v_esc > 0 then 'Descuento por monto ' || trim_scale(v_esc) || ' %' end,
                                     case when v_cup > 0 then 'Cupón ' || upper(trim(p_cupon)) || ' ' || trim_scale(v_cup) || ' %' end), '')))
    into v_it from jsonb_array_elements(v_it) x;
  select round(sum((x->>'q')::numeric * (x->>'pu')::numeric), 2) into v_tot from jsonb_array_elements(v_it) x;

  perform pg_advisory_xact_lock(434343);
  select coalesce(max(numero), 0) + 1 into v_num from presupuestos;
  insert into presupuestos (numero, nombre, telefono, lista, items, total, nota, estado, origen, respuesta)
  values (v_num, left(trim(p_nombre), 80), left(trim(p_telefono), 30), v_lista, v_it, v_tot,
          nullif(concat_ws(' · ', nullif(left(trim(coalesce(p_domicilio, '')), 120), ''), nullif(left(trim(coalesce(p_nota, '')), 400), ''),
                 case when v_ref is not null then 'Lo recomendó ' || v_ref end), ''),
          'aceptado', 'catalogo', 'Pedido desde el catálogo público');
  if v_cup > 0 then insert into cupones_usos (codigo, cliente_id) values (upper(trim(p_cupon)), null); end if;
  return jsonb_build_object('numero', v_num, 'total', v_tot, 'productos', jsonb_array_length(v_it), 'descuento', v_esc, 'cupon', v_cup);
end $$;

-- ---------- Descuento por pronto pago (nota de crédito automática) ----------
create or replace function descuento_pronto_pago(p_factura uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d jsonb; f record; v_d numeric; v_num bigint; v_rec bigint; v_bruto numeric; v_items jsonb;
begin
  d := nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb;
  if d is null or coalesce((d->>'pct')::numeric, 0) <= 0 then raise exception 'El descuento por pronto pago no está configurado.'; end if;
  select fe.factura_id, fe.cliente_id, fe.pendiente, fv.fecha, fv.pedido_id, fv.tipo, fv.numero into f
    from facturas_estado fe join facturas_venta fv on fv.id = fe.factura_id where fe.factura_id = p_factura;
  if not found or f.pendiente <= 0.005 then raise exception 'La factura no tiene saldo pendiente.'; end if;
  if (now() at time zone 'America/Argentina/Buenos_Aires')::date > f.fecha + coalesce((d->>'dias')::int, 7) then
    raise exception 'Ya pasó el plazo de pronto pago de esta factura.'; end if;
  if exists (select 1 from notas_credito where motivo = 'Pronto pago · factura ' || f.tipo || ' ' || f.numero) then
    raise exception 'Esta factura ya tuvo el descuento por pronto pago.'; end if;
  v_d := round(f.pendiente * (d->>'pct')::numeric / 100, 2);
  -- Detalle proporcional a los productos del pedido, así el IVA de la nota de crédito queda bien
  select sum(cantidad * precio_unitario) into v_bruto from pedido_items where pedido_id = f.pedido_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', producto_id, 'q', round(cantidad * v_d / v_bruto, 6), 'pu', precio_unitario, 'cu', 0)), '[]'::jsonb)
    into v_items from pedido_items where pedido_id = f.pedido_id and v_bruto > 0;
  perform pg_advisory_xact_lock(424242);
  select coalesce(max(numero), 0) + 1 into v_num from notas_credito;
  v_rec := registrar_cobranza(p_cliente => f.cliente_id, p_importe => v_d, p_medio => 'otro',
                              p_imputaciones => jsonb_build_array(jsonb_build_object('factura_id', f.factura_id, 'importe', v_d)));
  update recibos set observacion = 'Nota de crédito N° ' || v_num || ' · pronto pago' where numero = v_rec;
  insert into notas_credito (numero, cliente_id, pedido_id, total, motivo, repuesto, items, recibo_numero)
  values (v_num, f.cliente_id, f.pedido_id, v_d, 'Pronto pago · factura ' || f.tipo || ' ' || f.numero, false, v_items, v_rec);
  return jsonb_build_object('numero', v_num, 'descuento', v_d, 'resta', f.pendiente - v_d);
end $$;

-- Las devoluciones no cuentan las notas de crédito por pronto pago como mercadería devuelta
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
     where nc.pedido_id = p_pedido and it->>'id' = x->>'id' and coalesce(nc.motivo, '') not like 'Pronto pago%';
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

-- ---------- Cuenta online: + pronto pago y pedido automático ----------
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
    'pronto', nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb,
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

-- ---------- Permisos ----------
revoke execute on function fijo_cliente(text, int[], jsonb, boolean), alta_web(text, text, text, text, text, text, text),
  pedido_publico(text, text, text, jsonb, text, text, text, text), descuento_pronto_pago(uuid) from public;
grant execute on function catalogo_cliente(text), cuenta_cliente(text), fijo_cliente(text, int[], jsonb, boolean),
  alta_web(text, text, text, text, text, text, text), pedido_publico(text, text, text, jsonb, text, text, text, text) to anon, authenticated;
grant execute on function descuento_pronto_pago(uuid), registrar_devolucion(uuid, jsonb, text, boolean) to authenticated;
grant select on all tables in schema public to service_role;

select 'ventas crecer lista' as resultado;
