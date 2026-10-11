-- =========================================================
-- BORRAR DATOS DE PRUEBA — CRM Sabores de mi País
-- Borra TODOS los movimientos (pedidos, facturas, recibos, caja, compras,
-- movimientos de stock, etc.) y deja intactos clientes, productos, precios,
-- proveedores, promociones, cuentas y configuración.
-- Solo el dueño. Hay que escribir BORRAR para confirmar.
-- Es todo o nada: si algo falla, no se borra nada.
-- Se puede correr más de una vez (solo crea la función, no borra nada).
-- =========================================================

create or replace function borrar_datos_prueba(p_confirma text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  tabs text[] := array[
    'recibo_imputaciones','recibos','notas_credito','facturas_venta','pedido_items','pedidos',
    'movimientos_stock','vencimientos','mermas','fraccionados','reservas','preventas',
    'ordenes_compra_items','recepciones','ordenes_compra','pagos_proveedor','facturas_proveedor',
    'gastos','cierres_caja','movimientos_cuenta','cheques','retenciones','avisos_deuda',
    'cupones_usos','puntos_mov','presupuestos','carritos','avisos_stock','busquedas',
    'vistas_catalogo','reclamos','encuestas','promesas_pago','pendientes_cliente',
    'repartos_dia','comprobantes_cliente','cargas_combustible','envios_auto','cola_impresion'];
  pend text[]; t text; avanzo boolean; vuelta int := 0; res jsonb := '{}'::jsonb; n bigint; err text := '';
  r record;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede borrar los datos de prueba.'; end if;
  if coalesce(p_confirma, '') <> 'BORRAR' then raise exception 'Falta confirmar escribiendo BORRAR.'; end if;

  select array_agg(x) into pend from unnest(tabs) x
   where exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                  where s.nspname = 'public' and c.relname = x and c.relkind = 'r');
  pend := coalesce(pend, '{}');

  -- Borra en varias vueltas: primero lo que no depende de nada, después el resto
  loop
    vuelta := vuelta + 1; avanzo := false;
    foreach t in array pend loop
      begin
        execute format('delete from public.%I where true', t);
        get diagnostics n = row_count;
        res := res || jsonb_build_object(t, n);
        pend := array_remove(pend, t); avanzo := true;
      exception when foreign_key_violation then err := sqlerrm;
      end;
    end loop;
    exit when cardinality(pend) = 0 or not avanzo or vuelta > 12;
  end loop;
  if cardinality(pend) > 0 then
    raise exception 'No se pudo borrar (no se tocó nada): % — %', array_to_string(pend, ', '), err;
  end if;
  -- Segunda pasada: por si algún automático creó filas nuevas mientras se borraba
  foreach t in array tabs loop
    begin
      if to_regclass('public.' || t) is not null then execute format('delete from public.%I where true', t); end if;
    exception when others then null;
    end;
  end loop;

  -- Los números (pedidos, facturas, recibos…) vuelven a empezar desde 1
  for r in
    select c.table_name, c.column_name, c.column_default
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = any(tabs)
       and (c.column_default like 'nextval(%' or c.is_identity = 'YES')
  loop
    begin
      t := coalesce(pg_get_serial_sequence('public.' || quote_ident(r.table_name), r.column_name),
                    substring(r.column_default from $re$nextval\('([^']+)'$re$));
      if t is not null then perform setval(t, 1, false); end if;
    exception when others then null;
    end;
  end loop;

  -- Si el stock está guardado en una tabla, queda en cero
  begin
    if exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                where s.nspname = 'public' and c.relname = 'stock' and c.relkind = 'r') then
      execute 'update public.stock set fisico = 0, reservado = 0 where true';
    end if;
  exception when others then null;
  end;

  insert into config_app (clave, valor) values ('datos_prueba_borrados', now()::text)
  on conflict (clave) do update set valor = excluded.valor;
  return res;
end $$;
revoke execute on function borrar_datos_prueba(text) from public;
grant execute on function borrar_datos_prueba(text) to authenticated;

select 'borrar datos de prueba listo (todavía no se borró nada)' as resultado;
