-- =========================================================
-- FIDELIZACIÓN Y VENTAS 2 — CRM Sabores de mi País
-- Encuestas post entrega, cupones, puntos, recomendá y ganá, presupuestos
-- y sugerencias "agregá también" en el catálogo.
-- Requiere: ventas.sql. Se puede correr más de una vez.
-- =========================================================

-- ---------- Tablas ----------
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tp text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.pedidos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists encuestas (
      id            bigint generated always as identity primary key,
      token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
      pedido_id     %2$s unique references pedidos(id) on delete cascade,
      cliente_id    %1$s references clientes(id) on delete cascade,
      puntaje       int check (puntaje between 1 and 5),
      comentario    text,
      atendida      boolean not null default false,
      creado_en     timestamptz default now(),
      respondida_en timestamptz)$f$, tc, tp);
  execute format($f$
    create table if not exists cupones_usos (
      id bigint generated always as identity primary key, codigo text not null,
      cliente_id %1$s references clientes(id) on delete cascade, pedido_id %2$s references pedidos(id) on delete set null,
      fecha timestamptz default now())$f$, tc, tp);
  execute format($f$
    create table if not exists puntos_mov (
      id bigint generated always as identity primary key,
      cliente_id %1$s not null references clientes(id) on delete cascade,
      fecha timestamptz not null default now(), puntos int not null, motivo text,
      pedido_id %2$s references pedidos(id) on delete set null)$f$, tc, tp);
  execute format($f$
    create table if not exists presupuestos (
      id bigint generated always as identity primary key, numero bigint not null unique,
      token text not null unique default replace(gen_random_uuid()::text, '-', ''),
      cliente_id %1$s references clientes(id) on delete set null,
      nombre text, telefono text, lista text not null default 'mayorista',
      items jsonb not null default '[]', total numeric(14,2) not null default 0, nota text,
      estado text not null default 'enviado' check (estado in ('enviado','aceptado','rechazado','vencido')),
      vence date, pedido_id %2$s references pedidos(id) on delete set null,
      respuesta text, creado_en timestamptz default now(), usuario_id uuid default auth.uid())$f$, tc, tp);
end $$;
create table if not exists cupones (
  codigo        text primary key,
  descuento_pct numeric(5,2) not null check (descuento_pct > 0 and descuento_pct < 90),
  usos_max      int,
  hasta         date,
  minimo        numeric(14,2),
  solo_nuevos   boolean not null default false,
  activo        boolean not null default true,
  creado_en     timestamptz default now());
create index if not exists puntos_mov_cli on puntos_mov (cliente_id);
create index if not exists cupones_usos_cod on cupones_usos (codigo, cliente_id);

alter table clientes add column if not exists codigo_ref text;
alter table clientes add column if not exists referido_por uuid;
update clientes set codigo_ref = upper(substr(md5(random()::text || id::text), 1, 6)) where codigo_ref is null;
alter table clientes alter column codigo_ref set default upper(substr(md5(random()::text), 1, 6));
create unique index if not exists clientes_codigo_ref on clientes (codigo_ref);

do $$
declare t text;
begin
  foreach t in array array['encuestas','cupones_usos','puntos_mov','presupuestos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
alter table cupones enable row level security;
drop policy if exists "leer_cupones" on cupones;
drop policy if exists "dueno_cupones" on cupones;
create policy "leer_cupones" on cupones for select to authenticated using (true);
create policy "dueno_cupones" on cupones for all to authenticated using (es_dueno()) with check (es_dueno());
grant select, insert, update, delete on cupones to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Configuración ----------
create or replace function cfg_num(p_clave text, p_def numeric) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select valor from config_app where clave = p_clave), '')::numeric, p_def)
$$;
create or replace function puntos_activos() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select valor from config_app where clave = 'puntos_activo'), 'si') = 'si'
$$;
create or replace function puntos_saldo(p_cliente uuid) returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(puntos), 0)::int from puntos_mov where cliente_id = p_cliente
$$;

-- ---------- Puntos al entregar + premio por recomendación ----------
create or replace function puntos_por_entrega() returns trigger language plpgsql security definer set search_path = public as $$
declare v_p int; v_ref uuid; v_bono int;
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
  end if;
  return new;
end $$;
drop trigger if exists pedidos_puntos on pedidos;
create trigger pedidos_puntos after update on pedidos for each row execute function puntos_por_entrega();

-- ---------- Sugerencias "agregá también" (qué se compra junto) ----------
create or replace function sugerencias_juntos() returns jsonb language sql stable security definer set search_path = public as $$
  with o as (select distinct i.pedido_id, i.producto_id from pedido_items i join pedidos p on p.id = i.pedido_id
              where p.estado::text <> 'cancelado' and p.creado_en > now() - interval '180 days'),
  pr as (select a.producto_id x, b.producto_id y, count(*) n from o a join o b on a.pedido_id = b.pedido_id and a.producto_id <> b.producto_id
          group by 1, 2 having count(*) >= 2),
  rk as (select x, y, n, row_number() over (partition by x order by n desc) r from pr)
  select coalesce(jsonb_object_agg(x, ys), '{}'::jsonb) from (select x, jsonb_agg(y order by n desc) ys from rk where r <= 5 group by x) z
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
    'puntos_cada', cfg_num('puntos_cada', 1000), 'referido_puntos', cfg_num('referido_puntos', 500))
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
    'promos', promos_catalogo(v_lista), 'puntos', puntos_saldo(v.id), 'ref', v.codigo_ref,
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa')) || extras_catalogo(v_lista);
end $$;

drop function if exists catalogo_publico();
create or replace function catalogo_publico(p_ref text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_lista text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then
    raise exception 'El catálogo no está disponible en este momento.';
  end if;
  return jsonb_build_object('cliente', null, 'lista', v_lista, 'productos', productos_catalogo(v_lista), 'ultimo', '[]'::jsonb,
    'promos', promos_catalogo(v_lista), 'publico', true,
    'ref_nombre', (select razon_social from clientes where codigo_ref = upper(trim(p_ref)) and coalesce(activo, true)),
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'mp',  (select valor from config_app where clave = 'link_mp')) || extras_catalogo(v_lista);
end $$;

-- ---------- Cupones ----------
create or replace function cupon_pct(p_codigo text, p_cliente uuid, p_monto numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare c cupones%rowtype;
begin
  if coalesce(trim(p_codigo), '') = '' then return 0; end if;
  select * into c from cupones where codigo = upper(trim(p_codigo));
  if not found or not c.activo then raise exception 'El cupón % no existe.', upper(trim(p_codigo)); end if;
  if c.hasta is not null and c.hasta < current_date then raise exception 'El cupón % ya venció.', c.codigo; end if;
  if c.usos_max is not null and (select count(*) from cupones_usos where codigo = c.codigo) >= c.usos_max then raise exception 'El cupón % ya se usó todas las veces permitidas.', c.codigo; end if;
  if p_cliente is not null and exists (select 1 from cupones_usos where codigo = c.codigo and cliente_id = p_cliente) then raise exception 'Ya usaste el cupón %.', c.codigo; end if;
  if c.solo_nuevos and p_cliente is not null and exists (select 1 from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado') then
    raise exception 'El cupón % es solo para la primera compra.', c.codigo; end if;
  if c.minimo is not null and p_monto is not null and p_monto < c.minimo then raise exception 'El cupón % es para compras desde $ %.', c.codigo, to_char(c.minimo, 'FM999G999G990'); end if;
  return c.descuento_pct;
end $$;
create or replace function validar_cupon(p_token text, p_codigo text, p_monto numeric default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_cli uuid; v_pct numeric;
begin
  if coalesce(p_token, '') <> '' then select id into v_cli from clientes where token_pedidos = p_token; end if;
  v_pct := cupon_pct(p_codigo, v_cli, p_monto);
  return jsonb_build_object('ok', true, 'codigo', upper(trim(p_codigo)), 'pct', v_pct);
exception when others then
  return jsonb_build_object('ok', false, 'msg', sqlerrm);
end $$;

-- ---------- Pedido online con combos, descuento por monto, cupón y puntos ----------
drop function if exists crear_pedido_cliente(text, jsonb, text);
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
  select total into v_total from pedidos where id = v_ped.id;
  return jsonb_build_object('numero', v_ped.numero, 'total', v_total, 'productos', v_n, 'descuento', v_esc, 'cupon', v_cup, 'puntos', v_ptos);
end $$;

-- ---------- Cuenta online: puntos y recomendaciones ----------
create or replace function cuenta_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_fac jsonb; v_pag jsonb; v_pm jsonb;
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
  return jsonb_build_object('cliente', v.razon_social,
    'saldo', coalesce((select saldo from saldos_clientes where cliente_id = v.id), 0),
    'vencido', coalesce((select sum(pendiente) from facturas_estado where cliente_id = v.id and pendiente > 0.005 and dias_mora > 0), 0),
    'facturas', v_fac, 'pagos', v_pag,
    'puntos', puntos_saldo(v.id), 'puntos_mov', v_pm, 'puntos_activo', puntos_activos(),
    'valor_punto', cfg_num('valor_punto', 10), 'puntos_cada', cfg_num('puntos_cada', 1000), 'referido_puntos', cfg_num('referido_puntos', 500),
    'ref', v.codigo_ref, 'referidos', (select count(*) from clientes where referido_por = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

-- ---------- Encuestas ----------
create or replace function encuesta_ver(p_token text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('cliente', c.razon_social, 'pedido', p.numero, 'puntaje', e.puntaje)
    from encuestas e left join clientes c on c.id = e.cliente_id left join pedidos p on p.id = e.pedido_id where e.token = p_token
$$;
create or replace function encuesta_responder(p_token text, p_puntaje int, p_comentario text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_puntaje is null or p_puntaje < 1 or p_puntaje > 5 then raise exception 'Elegí de 1 a 5 estrellas.'; end if;
  update encuestas set puntaje = p_puntaje, comentario = nullif(left(trim(coalesce(p_comentario, '')), 600), ''), respondida_en = now(),
         atendida = p_puntaje >= 4
   where token = p_token;
  if not found then raise exception 'Esta encuesta no existe.'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Presupuestos ----------
create or replace function presupuesto_ver(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare b presupuestos%rowtype;
begin
  select * into b from presupuestos where token = p_token;
  if not found then raise exception 'Este presupuesto no existe.'; end if;
  if b.estado = 'enviado' and b.vence is not null and b.vence < current_date then update presupuestos set estado = 'vencido' where id = b.id; b.estado := 'vencido'; end if;
  return jsonb_build_object('numero', b.numero, 'cliente', coalesce((select razon_social from clientes where id = b.cliente_id), b.nombre),
    'fecha', b.creado_en, 'vence', b.vence, 'estado', b.estado, 'total', b.total, 'nota', b.nota, 'lista', b.lista,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('d', coalesce(p.descripcion, 'Producto'), 'q', x->>'q', 'pu', x->>'pu', 'promo', x->>'promo', 'img', p.foto)), '[]'::jsonb)
                from jsonb_array_elements(b.items) x left join productos p on p.id::text = x->>'id'),
    'tel', (select valor from config_app where clave = 'telefono_empresa'));
end $$;
create or replace function presupuesto_aceptar(p_token text, p_respuesta text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b presupuestos%rowtype; v clientes%rowtype; v_pid uuid; v_num bigint; v_vend uuid;
begin
  select * into b from presupuestos where token = p_token for update;
  if not found then raise exception 'Este presupuesto no existe.'; end if;
  if b.estado <> 'enviado' then raise exception 'Este presupuesto ya está %.', b.estado; end if;
  if b.vence is not null and b.vence < current_date then update presupuestos set estado = 'vencido' where id = b.id; raise exception 'Este presupuesto venció. Pedinos uno nuevo.'; end if;
  if b.cliente_id is not null then
    select * into v from clientes where id = b.cliente_id;
    v_vend := coalesce(b.usuario_id, (to_jsonb(v)->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
    insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen, observaciones)
    values (v.id, v_vend, v.lista, 0, 'presupuesto', 'Presupuesto N° ' || b.numero || coalesce(' · ' || nullif(trim(p_respuesta), ''), ''))
    returning id, numero into v_pid, v_num;
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
    select v_pid, (x->>'id')::uuid, (x->>'q')::numeric, (x->>'pu')::numeric, nullif(x->>'promo', '') from jsonb_array_elements(b.items) x;
  end if;
  update presupuestos set estado = 'aceptado', respuesta = nullif(left(trim(coalesce(p_respuesta, '')), 500), ''), pedido_id = v_pid where id = b.id;
  return jsonb_build_object('ok', true, 'pedido', v_num);
end $$;

-- ---------- Permisos de las funciones ----------
revoke execute on function catalogo_cliente(text), catalogo_publico(text), crear_pedido_cliente(text, jsonb, text, text, boolean), cuenta_cliente(text),
  validar_cupon(text, text, numeric), encuesta_ver(text), encuesta_responder(text, int, text), presupuesto_ver(text), presupuesto_aceptar(text, text) from public;
grant execute on function catalogo_cliente(text), catalogo_publico(text), crear_pedido_cliente(text, jsonb, text, text, boolean), cuenta_cliente(text),
  validar_cupon(text, text, numeric), encuesta_ver(text), encuesta_responder(text, int, text), presupuesto_ver(text), presupuesto_aceptar(text, text) to anon, authenticated;
revoke execute on function cfg_num(text, numeric), puntos_activos(), puntos_saldo(uuid), sugerencias_juntos(), cupon_pct(text, uuid, numeric), extras_catalogo(text) from public, anon;
grant execute on function cfg_num(text, numeric), puntos_activos(), puntos_saldo(uuid), sugerencias_juntos(), cupon_pct(text, uuid, numeric), extras_catalogo(text) to authenticated;
grant select on all tables in schema public to service_role;

select 'fidelizacion lista' as resultado;
