-- =========================================================
-- VENTA POR CAJA O BULTO — CRM Sabores de mi País
-- Unidades por bulto y tipo (Caja, Pack...) para cada producto.
-- Se puede correr más de una vez.
-- =========================================================

alter table productos add column if not exists unidades_bulto int not null default 1;
alter table productos add column if not exists tipo_bulto text not null default 'Caja';

-- Maní JL según la lista de enero 2026
update productos set unidades_bulto = 48, tipo_bulto = 'Pack'
 where trim(ean) in ('7798148380568','7798148380483','7798148380490','7798148381107',
                     '7798148380711','7798148380728','7798148380704');
update productos set unidades_bulto = 12, tipo_bulto = 'Caja'
 where trim(ean) in ('7798148380186','7798148380346','7798148380384','7798148381299',
                     '7798148381305','7798148381312','7798148380209','7798148381336',
                     '7798148381329','7798148381398','7798148381381');

-- Cambiar el bulto desde la pestaña Precios (solo el dueño)
create or replace function fijar_bulto(p_producto uuid, p_unidades int, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar los bultos'; end if;
  if p_unidades is null or p_unidades < 1 or p_unidades > 10000 then raise exception 'Unidades por bulto no válidas'; end if;
  update productos set unidades_bulto = p_unidades, tipo_bulto = coalesce(nullif(trim(p_tipo),''),'Caja') where id = p_producto;
end $$;
revoke execute on function fijar_bulto(uuid, int, text) from public, anon;
grant execute on function fijar_bulto(uuid, int, text) to authenticated;

-- El catálogo online también muestra el bulto
create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_prod jsonb; v_ult jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto)
           order by pp.descripcion), '[]'::jsonb)
    into v_prod from precios_productos pp join productos p on p.id = pp.producto_id where pp.costo > 0;
  select coalesce(jsonb_agg(jsonb_build_object('id', i.producto_id, 'q', i.cantidad)), '[]'::jsonb)
    into v_ult from pedido_items i
   where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1);
  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', v_prod, 'ultimo', v_ult);
end $$;

select 'bultos listo' as resultado,
       (select count(*) from productos where unidades_bulto > 1) as productos_con_bulto;
