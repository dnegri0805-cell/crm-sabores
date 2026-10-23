-- =========================================================
-- PEDIDOS DE PRUEBA — CRM Sabores de mi País
-- Un pedido se puede marcar "de prueba" al cargarlo (o después).
-- borrar_pedidos_prueba() borra SOLO esos pedidos con todo lo que generaron:
-- renglones, facturas, remitos, cobros que solo pagaban esas facturas,
-- notas de crédito, puntos, usos de cupón y movimientos de stock.
-- El stock vuelve a como estaba (antes de borrar se pasan a "cancelado",
-- que devuelve la mercadería y libera lo reservado).
-- No toca clientes, productos, precios ni pedidos reales.
-- Solo el dueño. Es todo o nada: si algo falla, no se borra nada.
-- =========================================================

alter table public.pedidos add column if not exists es_prueba boolean not null default false;
create index if not exists pedidos_es_prueba_idx on public.pedidos (es_prueba) where es_prueba;

create or replace function public.borrar_pedidos_prueba()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[]; v_nums text[]; v_fac uuid[]; v_rem uuid[]; v_rec uuid[];
  n_ped int; n_fac int; n_rec int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede borrar los pedidos de prueba.'; end if;

  select coalesce(array_agg(id), '{}'), coalesce(array_agg('Pedido N° ' || numero), '{}')
    into v_ids, v_nums from pedidos where es_prueba;
  n_ped := cardinality(v_ids);
  if n_ped = 0 then return jsonb_build_object('pedidos', 0, 'facturas', 0, 'recibos', 0); end if;

  -- 1. Devolver el stock: al pasar a cancelado el trigger devuelve lo vendido y libera lo reservado
  update pedidos set estado = 'cancelado' where id = any(v_ids) and estado::text <> 'cancelado';

  -- 2. Facturas, remitos y cobros ligados
  select coalesce(array_agg(id), '{}') into v_rem from remitos where pedido_id = any(v_ids);
  select coalesce(array_agg(id), '{}') into v_fac from facturas_venta
   where pedido_id = any(v_ids) or remito_id = any(v_rem);
  n_fac := cardinality(v_fac);
  -- recibos que solo cobraban facturas de prueba (si un recibo también pagó facturas reales, queda)
  select coalesce(array_agg(distinct ri.recibo_id), '{}') into v_rec
    from recibo_imputaciones ri
   where ri.factura_id = any(v_fac)
     and not exists (select 1 from recibo_imputaciones o
                      where o.recibo_id = ri.recibo_id and not (o.factura_id = any(v_fac)));
  n_rec := cardinality(v_rec);

  delete from recibo_imputaciones where factura_id = any(v_fac);
  delete from recibos where id = any(v_rec);
  delete from facturas_venta where id = any(v_fac);
  delete from remitos where id = any(v_rem);

  -- 3. Lo demás que cuelga del pedido
  delete from notas_credito where pedido_id = any(v_ids);
  delete from puntos_mov where pedido_id = any(v_ids);
  delete from cupones_usos where pedido_id = any(v_ids);
  update presupuestos set pedido_id = null where pedido_id = any(v_ids);
  update reservas set pedido_id = null where pedido_id = any(v_ids);
  delete from movimientos_stock
   where referencia = any(v_nums) or referencia = any(array(select x || ' cancelado' from unnest(v_nums) x));

  -- 4. El pedido (renglones y encuestas se borran solos)
  delete from pedidos where id = any(v_ids);

  return jsonb_build_object('pedidos', n_ped, 'facturas', n_fac, 'recibos', n_rec);
end $$;

revoke execute on function public.borrar_pedidos_prueba() from public;
grant execute on function public.borrar_pedidos_prueba() to authenticated;
