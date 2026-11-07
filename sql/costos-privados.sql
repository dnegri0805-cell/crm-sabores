-- =========================================================
-- COSTOS PRIVADOS — CRM Sabores de mi País (2026-11-06)
-- Refuerzo: precios_base ya devolvía el costo vacío a los vendedores; esto lo repite
-- en precios_productos, agrega la columna con_costo para los filtros internos
-- (las funciones que filtraban "pp.costo > 0" ahora usan "pp.con_costo") y deja de
-- permitir leer precios_base y precios_lista directo desde la app.
-- Se puede correr más de una vez.
-- =========================================================

create or replace view public.precios_productos as
 WITH c AS (
         SELECT b.producto_id,
            b.codigo,
            b.ean,
            b.descripcion,
            b.familia,
            b.marca,
            (b.costo * factor_peso(b.producto_id::text))::numeric(14,4) AS costo,
            redondear_precio(b.precio_mayorista * factor_peso(b.producto_id::text), 'mayorista'::text) AS may,
            redondear_precio(b.precio_minorista * factor_peso(b.producto_id::text), 'minorista'::text) AS mino,
            redondear_precio(b.precio_especial * factor_peso(b.producto_id::text), 'especial'::text) AS esp,
            p.precio_fijo
           FROM precios_base b
             JOIN productos p ON p.id = b.producto_id
        )
 SELECT producto_id,
    codigo,
    ean,
    descripcion,
    familia,
    marca,
    (CASE WHEN es_vendedor() THEN NULL ELSE costo END)::numeric(14,4) AS costo,
        CASE
            WHEN precio_fijo > 0::numeric THEN precio_fijo
            ELSE may
        END AS precio_mayorista,
        CASE
            WHEN precio_fijo > 0::numeric THEN
            CASE
                WHEN may > 0::numeric THEN round(precio_fijo * mino / may, 2)
                ELSE mino
            END
            ELSE mino
        END AS precio_minorista,
        CASE
            WHEN precio_fijo > 0::numeric THEN precio_fijo
            ELSE esp
        END AS precio_especial,
    precio_fijo,
    coalesce(costo > 0::numeric, false) AS con_costo
   FROM c;

grant select on public.precios_productos to authenticated;

do $$
declare f regprocedure; def text;
begin
  foreach f in array array['public.generar_pedidos_fijos()'::regprocedure,
                           'public.productos_catalogo(text)'::regprocedure,
                           'public.crear_pedido_cliente(text,jsonb,text,text,boolean)'::regprocedure] loop
    def := pg_get_functiondef(f);
    if position('pp.costo > 0' in def) > 0 then
      execute replace(def, 'pp.costo > 0', 'pp.con_costo');
    end if;
  end loop;
end $$;

revoke select on public.precios_base, public.precios_lista from anon, authenticated;
