-- =========================================================
-- DESTACARSE — CRM Sabores de mi País
-- Seguimiento del reparto en vivo, remito firmado en el celular
-- y garantía "pedido completo". Se puede correr más de una vez.
-- =========================================================

-- Dónde está la camioneta (una sola fila, la actualiza el Modo chofer)
create table if not exists reparto_vivo (
  id     int primary key default 1 check (id = 1),
  lat    double precision,
  lng    double precision,
  at     timestamptz,
  ruta   uuid[] not null default '{}',
  activo boolean not null default false);
insert into reparto_vivo (id) values (1) on conflict do nothing;
alter table reparto_vivo enable row level security;
drop policy if exists "auth_all" on reparto_vivo;
create policy "auth_all" on reparto_vivo for all to authenticated using (true) with check (true);
grant select, insert, update on reparto_vivo to authenticated;

-- Remito firmado en pantalla
alter table pedidos add column if not exists firma text;
alter table pedidos add column if not exists firmado_en timestamptz;
alter table pedidos add column if not exists firmado_por text;

create or replace function km_entre(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision language sql immutable as $$
  select 2 * 6371 * asin(sqrt(power(sin(radians(b_lat - a_lat) / 2), 2) + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)))
$$;

-- Lo que ve el cliente: dónde está la camioneta, cuántas paradas faltan y a qué hora llega (sin mostrar a los demás clientes)
create or replace function seguimiento_pedido(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; o pedidos%rowtype; r reparto_vivo%rowtype; i int; pos int; antes int := 0; km double precision := 0;
        la double precision; ln double precision; s record;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then return '{}'::jsonb; end if;
  select * into o from pedidos where cliente_id = v.id and estado::text = 'en_reparto' order by numero desc limit 1;
  if not found then return jsonb_build_object('en_camino', false); end if;
  select * into r from reparto_vivo where id = 1;
  if not found or not r.activo or r.at is null or r.at < now() - interval '3 hours' then
    return jsonb_build_object('en_camino', true, 'numero', o.numero, 'sin_ubicacion', true);
  end if;
  pos := array_position(r.ruta, o.id);
  la := r.lat; ln := r.lng;
  if pos is not null then
    for i in 1 .. pos - 1 loop
      select c.lat, c.lng into s from pedidos p join clientes c on c.id = p.cliente_id where p.id = r.ruta[i] and p.estado::text = 'en_reparto';
      if found then
        antes := antes + 1;
        if s.lat is not null then km := km + km_entre(la, ln, s.lat, s.lng); la := s.lat; ln := s.lng; end if;
      end if;
    end loop;
  end if;
  if v.lat is not null then km := km + km_entre(la, ln, v.lat, v.lng); end if;
  return jsonb_build_object('en_camino', true, 'numero', o.numero, 'lat', r.lat, 'lng', r.lng, 'at', r.at, 'antes', antes,
    'km', round(km::numeric, 1), 'eta_min', round((antes * 10 + km / 25 * 60)::numeric), 'mi_lat', v.lat, 'mi_lng', v.lng);
end $$;

-- Remito firmado para el cliente (en su cuenta)
create or replace function remito_cliente(p_token text, p_numero bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; o pedidos%rowtype;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where numero = p_numero and cliente_id = v.id;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  return jsonb_build_object('numero', o.numero, 'cliente', v.razon_social, 'entregado', coalesce(o.entregado_en, o.firmado_en), 'firma', o.firma,
    'firmado_en', o.firmado_en, 'firmado_por', o.firmado_por,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('d', pr.descripcion, 'q', i.cantidad, 'kg', i.peso_real) order by pr.descripcion), '[]'::jsonb)
                from pedido_items i join productos pr on pr.id = i.producto_id where i.pedido_id = o.id));
end $$;

-- Garantía "pedido completo" (para mostrarla en el catálogo)
create or replace function garantia_info() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select case when valor ~ '^\s*\{' then valor::jsonb end from config_app where clave = 'garantia'), '{}'::jsonb)
$$;

revoke execute on function seguimiento_pedido(text), remito_cliente(text, bigint), garantia_info() from public;
grant execute on function seguimiento_pedido(text), remito_cliente(text, bigint), garantia_info() to anon, authenticated;

select 'destacarse listo' as resultado;
