-- =========================================================
-- VENTAS 13 — CRM Sabores de mi País
-- Combo de siempre, "avisame cuando esté en oferta", "recordame en…",
-- prueba social y oferta de último momento en el catálogo, y premio por pedir online.
-- Requiere: ventas-estrategia.sql. Se puede correr más de una vez.
-- =========================================================

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists alertas_oferta (
      id          bigint generated always as identity primary key,
      cliente_id  %1$s not null references clientes(id) on delete cascade,
      producto_id %2$s not null references productos(id) on delete cascade,
      creado_en   timestamptz not null default now(),
      avisado_en  timestamptz)$f$, tc, tq);
  execute format($f$
    create table if not exists recordatorios (
      id         bigint generated always as identity primary key,
      cliente_id %s not null references clientes(id) on delete cascade,
      fecha      date not null,
      creado_en  timestamptz not null default now(),
      hecho_en   timestamptz)$f$, tc);
end $$;
create unique index if not exists alertas_oferta_pend on alertas_oferta (cliente_id, producto_id) where avisado_en is null;
do $$
declare t text;
begin
  foreach t in array array['alertas_oferta','recordatorios'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- Cupones personales de varios usos (combo de siempre, pedido quincenal, precio de entrada):
-- el mismo cliente puede usarlos hasta su límite. Los cupones generales siguen siendo de un uso por cliente.
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
  if p_cliente is not null and c.cliente_id is null and exists (select 1 from cupones_usos where codigo = c.codigo and cliente_id = p_cliente) then raise exception 'Ya usaste el cupón %.', c.codigo; end if;
  if c.solo_nuevos and p_cliente is not null and exists (select 1 from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado') then
    raise exception 'El cupón % es solo para la primera compra.', c.codigo; end if;
  if c.minimo is not null and p_monto is not null and p_monto < c.minimo then raise exception 'El cupón % es para compras desde $ %.', c.codigo, to_char(c.minimo, 'FM999G999G990'); end if;
  return c.descuento_pct;
end $$;

-- Avisame cuando esté en oferta (prende y apaga)
create or replace function alerta_oferta(p_token text, p_producto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; n int;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  delete from alertas_oferta where cliente_id = v_id and producto_id::text = p_producto and avisado_en is null;
  get diagnostics n = row_count;
  if n > 0 then return jsonb_build_object('on', false); end if;
  if (select count(*) from alertas_oferta where cliente_id = v_id and avisado_en is null) >= 50 then raise exception 'Ya tenés muchos avisos activos.'; end if;
  insert into alertas_oferta (cliente_id, producto_id) select v_id, id from productos where id::text = p_producto;
  return jsonb_build_object('on', true);
end $$;

-- Recordame en N días
create or replace function recordarme(p_token text, p_dias int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; f date;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  f := (now() at time zone 'America/Argentina/Buenos_Aires')::date + greatest(1, least(coalesce(p_dias, 7), 60));
  delete from recordatorios where cliente_id = v_id and hecho_en is null;
  insert into recordatorios (cliente_id, fecha) values (v_id, f);
  return jsonb_build_object('ok', true, 'fecha', f);
end $$;

-- Premio por pedir online (puntos)
create or replace function premio_online() returns trigger language plpgsql security definer set search_path = public as $$
declare c jsonb;
begin
  if coalesce(new.origen, '') <> 'online' then return new; end if;
  begin c := nullif((select valor from config_app where clave = 'premio_online'), '')::jsonb; exception when others then c := null; end;
  if c is null or not coalesce((c->>'activa')::boolean, false) or coalesce((c->>'puntos')::int, 0) <= 0 then return new; end if;
  insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, (c->>'puntos')::int, 'Premio por pedir online', new.id);
  return new;
end $$;
drop trigger if exists premio_online on pedidos;
create trigger premio_online after insert on pedidos for each row execute function premio_online();

-- Lo que ve cada cliente: cupos, liga, acuerdo, combo de siempre, avisos, prueba social, oferta de último momento y premio online
create or replace function estrategia_cliente(p_token text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; r jsonb; l jsonb; lg jsonb; ac jsonb; mc jsonb; ck jsonb; po jsonb;
        ini timestamptz := date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires';
begin
  r := jsonb_build_object('cupos', (select coalesce(jsonb_object_agg(nombre, greatest(cupo - usados, 0)), '{}'::jsonb) from promociones
                                     where cupo is not null and activa and (hasta is null or hasta >= current_date)),
    'social', (select coalesce(jsonb_object_agg(pid, n), '{}'::jsonb) from (
        select i.producto_id::text pid, count(distinct o.cliente_id) n from pedido_items i join pedidos o on o.id = i.pedido_id
         where o.creado_en > now() - interval '7 days' and o.estado::text <> 'cancelado' group by 1 having count(distinct o.cliente_id) >= 3) z));
  begin ck := nullif((select valor from config_app where clave = 'oferta_checkout'), '')::jsonb; exception when others then ck := null; end;
  if ck is not null and coalesce((ck->>'activa')::boolean, false) and (ck->>'hasta' is null or (ck->>'hasta')::date >= current_date) then r := r || jsonb_build_object('checkout', ck); end if;
  begin po := nullif((select valor from config_app where clave = 'premio_online'), '')::jsonb; exception when others then po := null; end;
  if po is not null and coalesce((po->>'activa')::boolean, false) then r := r || jsonb_build_object('premio', po); end if;
  if coalesce(p_token, '') = '' then return r; end if;
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found then return r; end if;
  begin l := nullif((select valor from config_app where clave = 'liga'), '')::jsonb; exception when others then l := null; end;
  if l is not null and coalesce((l->>'activa')::boolean, false) and coalesce(trim(v.rubro), '') <> '' then
    with t as (
      select c.id, coalesce((select sum(o.total) from pedidos o where o.cliente_id = c.id and o.estado::text <> 'cancelado' and o.creado_en >= ini), 0) tot
        from clientes c where coalesce(c.activo, true) and lower(trim(c.rubro)) = lower(trim(v.rubro))),
    rk as (select id, tot, rank() over (order by tot desc) pos, count(*) over () n from t)
    select jsonb_build_object('rubro', v.rubro, 'pos', pos, 'total', n, 'tot', tot,
             'falta', (select min(t2.tot) from rk t2 where t2.tot > rk.tot) - tot + 1, 'premios', l->'premios')
      into lg from rk where id = v.id;
  end if;
  select jsonb_build_object('monto', a.monto_mes, 'tipo', a.tipo, 'pct', a.pct,
           'lleva', (select coalesce(sum(total), 0) from pedidos where cliente_id = v.id and estado::text <> 'cancelado' and creado_en >= ini))
    into ac from acuerdos a where a.cliente_id = v.id and a.activo and (a.hasta is null or a.hasta >= current_date) order by a.id desc limit 1;
  select jsonb_build_object('codigo', codigo, 'pct', descuento_pct, 'minimo', minimo, 'items', case when nota like '[%' then nota::jsonb else '[]'::jsonb end)
    into mc from cupones where cliente_id = v.id and codigo like 'MICOMBO-%' and activo and (hasta is null or hasta >= current_date) order by creado_en desc limit 1;
  return r || jsonb_build_object('liga', lg, 'acuerdo', ac, 'micombo', mc,
    'alertas', (select coalesce(jsonb_agg(producto_id::text), '[]'::jsonb) from alertas_oferta where cliente_id = v.id and avisado_en is null),
    'toprubro', case when coalesce(trim(v.rubro), '') = '' then '[]'::jsonb else (select coalesce(jsonb_agg(pid), '[]'::jsonb) from (
        select i.producto_id::text pid from pedido_items i join pedidos o on o.id = i.pedido_id join clientes c on c.id = o.cliente_id
         where lower(trim(c.rubro)) = lower(trim(v.rubro)) and o.creado_en > now() - interval '30 days' and o.estado::text <> 'cancelado'
         group by 1 having count(distinct o.cliente_id) >= 3 order by count(distinct o.cliente_id) desc limit 8) z) end);
end $$;

revoke execute on function alerta_oferta(text, text), recordarme(text, int), estrategia_cliente(text) from public;
grant execute on function alerta_oferta(text, text), recordarme(text, int), estrategia_cliente(text) to anon, authenticated;

select 'ventas mas2 lista' as resultado;
