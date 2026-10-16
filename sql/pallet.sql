-- =========================================================
-- DISPLAY Y PALLET — CRM Sabores de mi País
-- Unidades por display (cajita dentro del bulto) y bultos por pallet,
-- para mostrar en el catálogo el precio por unidad, display, bulto y pallet.
-- Se puede correr más de una vez.
-- =========================================================

alter table productos add column if not exists unidades_display int;
alter table productos add column if not exists bultos_pallet int;

-- Maní JL según la lista de enero 2026
-- Packs: 4 displays de 12 flowpack (85 g / 65 g) = 48 u. · 120 packs por pallet
update productos set unidades_display = 12, bultos_pallet = 120
 where trim(ean) in ('7798148380568','7798148380483','7798148380490','7798148381107',
                     '7798148380711','7798148380728','7798148380704');
-- Cajas de 12 flowpack x 500 g · 80 cajas por pallet
update productos set unidades_display = null, bultos_pallet = 80
 where trim(ean) in ('7798148380186','7798148380346','7798148380384','7798148381299',
                     '7798148381305','7798148381312','7798148380209','7798148381336',
                     '7798148381329');
-- Cajas de 12 potes x 360 g · 187 cajas por pallet
update productos set unidades_display = null, bultos_pallet = 187
 where trim(ean) in ('7798148381398','7798148381381');

-- El catálogo (link del cliente y catálogo público) también manda display y pallet
create or replace function public.productos_catalogo(p_lista text)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case p_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto, 'img', p.foto, 'nv', coalesce(p.nuevo_hasta >= current_date, false))
           || case when p.unidades_display > 1 then jsonb_build_object('ud', p.unidades_display) else '{}'::jsonb end
           || case when p.bultos_pallet > 0 then jsonb_build_object('bp', p.bultos_pallet) else '{}'::jsonb end
           order by pp.descripcion), '[]'::jsonb)
    from precios_productos pp join productos p on p.id = pp.producto_id
   where pp.costo > 0 and coalesce(p.activo, true)
$function$;

select 'pallet listo' as resultado,
       (select count(*) from productos where bultos_pallet > 0) as productos_con_pallet;
