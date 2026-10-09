-- =========================================================
-- STOCK — CRM Sabores de mi País
-- 1) La recepción de compras pasa por mover_stock (suma al stock real)
-- 2) Función para cargar inventario / ajustar el stock contado
-- 3) Permisos de lectura de la tabla stock
-- Se puede correr más de una vez.
-- =========================================================

-- 1) Recepción de compras usando mover_stock -------------
create or replace function recibir_orden(p_orden_id bigint, p_remito text, p_items jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec_id bigint; it jsonb; v_item ordenes_compra_items%rowtype;
  v_cant numeric; v_pend numeric; v_estado text; v_ref text;
begin
  select estado into v_estado from ordenes_compra where id = p_orden_id for update;
  if v_estado is null then raise exception 'La orden % no existe', p_orden_id; end if;
  if v_estado in ('anulada','recibida') then raise exception 'La orden % está %', p_orden_id, v_estado; end if;

  v_ref := 'OC ' || p_orden_id || coalesce(' · remito ' || nullif(p_remito,''), '');
  insert into recepciones (orden_id, remito) values (p_orden_id, nullif(p_remito,''))
  returning id into v_rec_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_cant := (it->>'cantidad')::numeric;
    continue when v_cant is null or v_cant <= 0;

    select * into v_item from ordenes_compra_items
     where id = (it->>'oc_item_id')::bigint and orden_id = p_orden_id;
    if not found then raise exception 'El ítem % no pertenece a la orden', it->>'oc_item_id'; end if;

    insert into recepciones_items (recepcion_id, oc_item_id, cantidad) values (v_rec_id, v_item.id, v_cant);
    update ordenes_compra_items set cantidad_recibida = cantidad_recibida + v_cant where id = v_item.id;

    -- Entra al stock físico por el mismo camino que usa todo el sistema
    perform mover_stock(v_item.producto_id, v_cant, 0, 'compra', v_ref);

    if v_item.costo_unitario > 0 then
      update productos set costo = v_item.costo_unitario where id = v_item.producto_id;
    end if;
  end loop;

  select coalesce(sum(greatest(cantidad - cantidad_recibida,0)),0) into v_pend
    from ordenes_compra_items where orden_id = p_orden_id;

  update ordenes_compra
     set estado = case when v_pend <= 0 then 'recibida' else 'recibida_parcial' end
   where id = p_orden_id;

  return v_rec_id;
end $$;

revoke execute on function recibir_orden(bigint, text, jsonb) from public, anon;
grant execute on function recibir_orden(bigint, text, jsonb) to authenticated;

-- 2) Ajuste de stock: deja el físico en lo que contaste ----
create or replace function ajustar_stock(p_producto uuid, p_contado numeric, p_motivo text default null)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare v_actual numeric; v_dif numeric;
begin
  if p_contado is null or p_contado < 0 then raise exception 'La cantidad contada no puede ser negativa'; end if;
  select fisico into v_actual from stock where producto_id = p_producto for update;
  v_dif := p_contado - coalesce(v_actual, 0);
  if v_dif <> 0 then
    perform mover_stock(p_producto, v_dif, 0, 'ajuste', coalesce(nullif(p_motivo,''), 'Ajuste de inventario'));
  end if;
  return v_dif;
end $$;

revoke execute on function ajustar_stock(uuid, numeric, text) from public, anon;
grant execute on function ajustar_stock(uuid, numeric, text) to authenticated;

-- 3) La app puede leer el stock ---------------------------
grant select on stock to authenticated;
grant select on movimientos_stock to authenticated;

-- Si la tabla stock tiene seguridad por filas y nadie puede leerla, habilita la lectura
do $$
begin
  if (select relrowsecurity from pg_class where oid = 'public.stock'::regclass)
     and not exists (select 1 from pg_policies where schemaname='public' and tablename='stock'
                     and cmd in ('SELECT','ALL')) then
    create policy "leer_stock" on stock for select to authenticated using (true);
  end if;
end $$;

select 'stock listo' as resultado,
       (select count(*) from stock) as productos_con_stock;
