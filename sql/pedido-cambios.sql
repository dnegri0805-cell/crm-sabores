-- =========================================================
-- CAMBIOS DEL CLIENTE EN SU PEDIDO + CUÁNTO AHORRÓ — CRM Sabores de mi País
-- 1) El cliente puede MODIFICAR o CANCELAR su pedido desde el catálogo
--    mientras esté "Por aprobar" o "Aprobado" y todavía no tenga factura
--    (o sea, antes de que lo empecemos a preparar).
--    Al modificar, el pedido viejo se cancela recién cuando manda el nuevo
--    (si se arrepiente a mitad de camino, no se pierde nada).
--    Si había usado puntos o un cupón, se le devuelven.
-- 2) "Cuánto ahorraste": desde ahora cada renglón guarda el precio de lista,
--    y el cliente ve en "Mi cuenta" cuánto ahorró con ofertas, descuentos,
--    cupones y puntos.
-- Se puede correr más de una vez.
-- =========================================================

-- ---------- Precio de lista en cada renglón (para calcular el ahorro) ----------
alter table pedido_items add column if not exists precio_lista numeric;

create or replace function pi_precio_lista() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.precio_lista is null then
    begin
      select coalesce(pc.precio, case coalesce(p.lista::text, 'mayorista')
                                   when 'minorista' then pp.precio_minorista
                                   when 'especial' then pp.precio_especial
                                   else pp.precio_mayorista end)
        into new.precio_lista
        from pedidos p
        join precios_productos pp on pp.producto_id = new.producto_id
        left join precios_cliente pc on pc.cliente_id = p.cliente_id and pc.producto_id = new.producto_id
       where p.id = new.pedido_id;
    exception when others then null;
    end;
  end if;
  return new;
end $$;
drop trigger if exists pi_precio_lista on pedido_items;
create trigger pi_precio_lista before insert on pedido_items for each row execute function pi_precio_lista();

-- ---------- ¿Se puede cambiar este pedido? ----------
create or replace function pedido_editable_cliente(p_token text, p_numero bigint)
returns pedidos language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; o pedidos%rowtype;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where numero = p_numero and cliente_id = v_id;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  if o.estado::text not in ('pendiente', 'aprobado')
     or exists (select 1 from facturas_venta f where f.pedido_id = o.id) then
    raise exception 'Este pedido ya lo estamos preparando: escribinos por WhatsApp para cambiarlo.';
  end if;
  return o;
end $$;
revoke execute on function pedido_editable_cliente(text, bigint) from public, anon;

-- Devuelve puntos y cupón usados en un pedido (cuando se cancela o se reemplaza)
create or replace function devolver_beneficios(p_pedido pedidos.id%type) returns void
language plpgsql security definer set search_path = public as $$
begin
  begin delete from puntos_mov where pedido_id = p_pedido and puntos < 0; exception when others then null; end;
  begin delete from cupones_usos where pedido_id = p_pedido; exception when others then null; end;
end $$;
revoke execute on function devolver_beneficios(pedidos.id%type) from public, anon, authenticated;

-- ---------- Traer el pedido al carrito para modificarlo (todavía no cancela nada) ----------
create or replace function items_pedido_cliente(p_token text, p_numero bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o pedidos%rowtype; it jsonb;
begin
  o := pedido_editable_cliente(p_token, p_numero);
  select coalesce(jsonb_agg(jsonb_build_object('id', producto_id::text, 'q', cantidad)), '[]'::jsonb) into it
    from pedido_items where pedido_id = o.id;
  return jsonb_build_object('numero', o.numero, 'items', it, 'nota', o.observaciones,
                            'entrega', coalesce(to_jsonb(o)->>'entrega', to_jsonb(o)->>'fecha_entrega'));
end $$;
grant execute on function items_pedido_cliente(text, bigint) to anon, authenticated;

-- ---------- Mandar el pedido modificado: crea el nuevo y recién ahí cancela el viejo ----------
create or replace function reemplazar_pedido_cliente(p_token text, p_numero bigint, p_items jsonb, p_nota text default null,
                                                      p_cupon text default null, p_puntos boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o pedidos%rowtype; r jsonb; v_nuevo pedidos.id%type; v_ent text;
begin
  o := pedido_editable_cliente(p_token, p_numero);
  -- primero se libera lo que usaba el pedido viejo (puntos, cupón) para que el nuevo los pueda usar
  perform devolver_beneficios(o.id);
  update pedidos set estado = 'cancelado',
         observaciones = concat_ws(' · ', nullif(observaciones, ''), 'Reemplazado por el cliente (lo modificó)')
   where id = o.id;
  r := crear_pedido_cliente(p_token, p_items, p_nota, p_cupon, p_puntos);   -- si falla, se deshace todo
  select id into v_nuevo from pedidos where numero = (r->>'numero')::bigint;
  update pedidos set observaciones = concat_ws(' · ', '✏️ Modificó el pedido N° ' || o.numero, nullif(observaciones, ''))
   where id = v_nuevo;
  -- mantiene la fecha de entrega que había elegido
  v_ent := coalesce(to_jsonb(o)->>'entrega', to_jsonb(o)->>'fecha_entrega');
  if v_ent is not null then
    begin execute 'update pedidos set entrega = $1::date where id = $2' using v_ent, v_nuevo; exception when others then null; end;
    begin execute 'update pedidos set fecha_entrega = $1::date where id = $2' using v_ent, v_nuevo; exception when others then null; end;
  end if;
  return r || jsonb_build_object('anterior', o.numero);
end $$;
grant execute on function reemplazar_pedido_cliente(text, bigint, jsonb, text, text, boolean) to anon, authenticated;

-- ---------- Cancelar el pedido ----------
create or replace function cancelar_pedido_cliente(p_token text, p_numero bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o pedidos%rowtype;
begin
  o := pedido_editable_cliente(p_token, p_numero);
  perform devolver_beneficios(o.id);
  update pedidos set estado = 'cancelado',
         observaciones = concat_ws(' · ', nullif(observaciones, ''), '❌ Cancelado por el cliente')
   where id = o.id;
  return jsonb_build_object('ok', true, 'numero', o.numero);
end $$;
grant execute on function cancelar_pedido_cliente(text, bigint) to anon, authenticated;

-- ---------- Cuánto ahorró el cliente ----------
create or replace function ahorro_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; r record;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then return null; end if;
  select coalesce(sum(greatest(0, i.precio_lista - i.precio_unitario) * i.cantidad)
                    filter (where p.creado_en >= date_trunc('year', now())), 0) anio,
         coalesce(sum(greatest(0, i.precio_lista - i.precio_unitario) * i.cantidad), 0) total,
         min(p.creado_en) desde
    into r
    from pedido_items i join pedidos p on p.id = i.pedido_id
   where p.cliente_id = v_id and p.estado::text <> 'cancelado'
     and i.precio_lista is not null and i.precio_lista > 0
     and coalesce(i.promo, '') <> ''
     and (to_jsonb(i)->>'peso_real') is null;
  return jsonb_build_object('anio', round(r.anio), 'total', round(r.total), 'desde', r.desde);
end $$;
grant execute on function ahorro_cliente(text) to anon, authenticated;

select 'cambios de pedido y ahorro listos' as resultado;
