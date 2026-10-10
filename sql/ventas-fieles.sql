-- =========================================================
-- VENTAS 5 — CRM Sabores de mi País
-- Favoritos, precio sugerido al público, quién miró el catálogo, cupones personales,
-- sorteo del mes y "cliente desde" (aniversarios).
-- Requiere: ventas-crecer.sql. Se puede correr más de una vez.
-- =========================================================

alter table clientes add column if not exists favoritos jsonb not null default '[]';
alter table clientes add column if not exists cliente_desde date;
alter table productos add column if not exists pvp numeric(14,2);
alter table cupones add column if not exists cliente_id uuid;
alter table cupones add column if not exists nota text;
do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists vistas_catalogo (
      id         bigint generated always as identity primary key,
      cliente_id %s not null references clientes(id) on delete cascade,
      fecha      timestamptz not null default now(),
      ultima     timestamptz not null default now(),
      veces      int not null default 1,
      fams       text[] not null default '{}')$f$, tc);
end $$;
create index if not exists vistas_catalogo_fecha on vistas_catalogo (fecha);
alter table vistas_catalogo enable row level security;
drop policy if exists "auth_all" on vistas_catalogo;
create policy "auth_all" on vistas_catalogo for all to authenticated using (true) with check (true);
grant select, insert, update, delete on vistas_catalogo to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Sorteo del mes ----------
create or replace function sorteo_mes() returns jsonb language sql stable security definer set search_path = public as $$
  select d from (select nullif((select valor from config_app where clave = 'sorteo'), '')::jsonb d) z
   where d->>'mes' = to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') and coalesce((d->>'cada')::numeric, 0) > 0
$$;

-- ---------- Precio sugerido al público (por producto) ----------
create or replace function productos_para(p_lista text, p_cliente uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
           (case when pc.precio is not null then e.x || jsonb_build_object('p', pc.precio, 'pac', true) else e.x end)
           || (case when pr.pvp > 0 then jsonb_build_object('pvp', pr.pvp) else '{}'::jsonb end)
           || (case when cfg.ss and st.disp is not null and st.disp <= 0 then '{"ss": true}'::jsonb else '{}'::jsonb end)
         order by e.o), '[]'::jsonb)
    from jsonb_array_elements(productos_catalogo(p_lista)) with ordinality e(x, o)
    cross join (select coalesce((select valor from config_app where clave = 'avisar_sin_stock'), 'no') = 'si' ss) cfg
    left join productos pr on pr.id::text = e.x->>'id'
    left join precios_cliente pc on pc.cliente_id = p_cliente and pc.producto_id::text = e.x->>'id'
    left join lateral (select sum(s.disponible) disp from stock s where cfg.ss and s.producto_id::text = e.x->>'id') st on true
$$;

-- ---------- Cupones personales (de un solo cliente) ----------
create or replace function cupon_pct(p_codigo text, p_cliente uuid, p_monto numeric)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare c cupones%rowtype;
begin
  if coalesce(trim(p_codigo), '') = '' then return 0; end if;
  select * into c from cupones where codigo = upper(trim(p_codigo));
  if not found or not c.activo then raise exception 'El cupón % no existe.', upper(trim(p_codigo)); end if;
  if c.cliente_id is not null and c.cliente_id is distinct from p_cliente then raise exception 'El cupón % es personal de otro cliente.', c.codigo; end if;
  if c.hasta is not null and c.hasta < current_date then raise exception 'El cupón % ya venció.', c.codigo; end if;
  if c.usos_max is not null and (select count(*) from cupones_usos where codigo = c.codigo) >= c.usos_max then raise exception 'El cupón % ya se usó todas las veces permitidas.', c.codigo; end if;
  if p_cliente is not null and exists (select 1 from cupones_usos where codigo = c.codigo and cliente_id = p_cliente) then raise exception 'Ya usaste el cupón %.', c.codigo; end if;
  if c.solo_nuevos and p_cliente is not null and exists (select 1 from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado') then
    raise exception 'El cupón % es solo para la primera compra.', c.codigo; end if;
  if c.minimo is not null and p_monto is not null and p_monto < c.minimo then raise exception 'El cupón % es para compras desde $ %.', c.codigo, to_char(c.minimo, 'FM999G999G990'); end if;
  return c.descuento_pct;
end $$;

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
    'sorteo', sorteo_mes())
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
    'pronto', nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb,
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $$;

-- ---------- Favoritos y visitas al catálogo ----------
create or replace function fav_cliente(p_token text, p_producto text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; f jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  f := coalesce(v.favoritos, '[]'::jsonb) - p_producto;
  if p_on and jsonb_array_length(f) < 200 then f := f || to_jsonb(left(p_producto, 60)); end if;
  update clientes set favoritos = f where id = v.id;
  return f;
end $$;

create or replace function registrar_vista(p_token text, p_fam text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; r record; f text := nullif(left(trim(coalesce(p_fam, '')), 40), '');
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then return; end if;
  select * into r from vistas_catalogo where cliente_id = v_id and ultima > now() - interval '40 minutes' order by id desc limit 1;
  if found then
    update vistas_catalogo set ultima = now(), veces = veces + case when f is null then 1 else 0 end,
           fams = case when f is not null and not (f = any(fams)) and cardinality(fams) < 20 then fams || f else fams end where id = r.id;
  else
    insert into vistas_catalogo (cliente_id, fams) values (v_id, case when f is null then '{}'::text[] else array[f] end);
  end if;
end $$;

revoke execute on function fav_cliente(text, text, boolean), registrar_vista(text, text) from public;
grant execute on function fav_cliente(text, text, boolean), registrar_vista(text, text), catalogo_cliente(text), cuenta_cliente(text) to anon, authenticated;
revoke execute on function sorteo_mes(), productos_para(text, uuid), cupon_pct(text, uuid, numeric), extras_catalogo(text) from public, anon;
grant execute on function sorteo_mes(), productos_para(text, uuid), cupon_pct(text, uuid, numeric), extras_catalogo(text) to authenticated;
grant select on all tables in schema public to service_role;

select 'ventas fieles lista' as resultado;
