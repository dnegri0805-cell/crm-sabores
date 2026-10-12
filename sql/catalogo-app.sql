-- =========================================================
-- CATÁLOGO ESTILO APP — CRM Sabores de mi País
-- Para las etiquetas del catálogo de clientes:
--   🔥 MÁS VENDIDO  (lo que más se pidió en los últimos 45 días)
--   ⏳ ÚLTIMAS UNIDADES (poco stock: hasta el stock mínimo, o 3 si no tiene)
-- Y para la fila "Los más pedidos" de los clientes nuevos.
-- No muestra cantidades, solo qué productos llevan cada etiqueta.
-- Se puede correr más de una vez.
-- =========================================================

create or replace function catalogo_extra()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_top jsonb := '[]'::jsonb; v_pocas jsonb := '[]'::jsonb;
begin
  begin
    select coalesce(jsonb_agg(pid order by n desc), '[]'::jsonb) into v_top from (
      select i.producto_id::text pid, count(distinct p.cliente_id) * 10 + count(*) n
        from pedido_items i join pedidos p on p.id = i.pedido_id
       where p.estado::text <> 'cancelado' and p.creado_en > now() - interval '45 days'
       group by 1 order by 2 desc limit 15) t;
  exception when others then v_top := '[]'::jsonb; end;
  begin
    select coalesce(jsonb_agg(pid), '[]'::jsonb) into v_pocas from (
      select s.producto_id::text pid
        from stock s join productos pr on pr.id = s.producto_id
       where coalesce((to_jsonb(pr)->>'activo')::boolean, true)
       group by s.producto_id, pr.id
      having sum(s.disponible) > 0
         and sum(s.disponible) <= greatest(coalesce((to_jsonb(pr)->>'stock_minimo')::numeric, 0), 3)
       limit 80) t;
  exception when others then v_pocas := '[]'::jsonb; end;
  return jsonb_build_object('top', v_top, 'pocas', v_pocas);
end $$;
grant execute on function catalogo_extra() to anon, authenticated;

select 'catálogo estilo app listo' as resultado;
