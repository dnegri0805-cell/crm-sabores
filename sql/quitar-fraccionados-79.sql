-- Saca (por ahora) los productos del proveedor "Fraccionados Nº79" (aceitunas, etc.).
-- No los borra: los DESACTIVA, así no aparecen en ningún catálogo ni pedido,
-- pero se pueden volver a activar cuando quieras (ver el final del archivo).
-- El proveedor queda cargado; solo se ocultan sus productos.

do $$
declare
  f record;
  n int := 0;
  r record;
begin
  for f in select id, razon_social from proveedores
            where razon_social ~* 'fraccionados\s*n\s*[º°o.]?\s*79' loop
    for r in select p.id, p.descripcion from productos p
              where coalesce(p.activo, true)
                and ( p.proveedor_id = f.id
                   or ( p.proveedor_id is null
                        and to_regclass('public.costos_proveedor') is not null
                        and exists (select 1 from costos_proveedor c
                                     where c.producto_id = p.id and c.proveedor_id = f.id) ) ) loop
      update productos set activo = false where id = r.id;
      n := n + 1;
      raise notice 'Desactivado: %', r.descripcion;
    end loop;
    raise notice 'Proveedor %: % productos desactivados', f.razon_social, n;
  end loop;
  if n = 0 then raise notice 'No había productos activos de Fraccionados Nº79 (o el proveedor no existe).'; end if;
end $$;

-- Resultado: qué quedó desactivado y si queda alguna aceituna activa de otro proveedor
select
  coalesce((select string_agg(p.descripcion, ' · ' order by p.descripcion)
              from productos p join proveedores v on v.id = p.proveedor_id
             where v.razon_social ~* 'fraccionados\s*n\s*[º°o.]?\s*79' and not coalesce(p.activo, true)),
           '(ninguno)') as desactivados_fraccionados_79,
  coalesce((select string_agg(p.descripcion, ' · ' order by p.descripcion)
              from productos p
             where p.descripcion ~* 'aceitun' and coalesce(p.activo, true)),
           '(ninguna)') as aceitunas_que_siguen_activas;

-- Para VOLVER a mostrarlos más adelante, ejecutá solo esto:
-- update productos set activo = true
--  where proveedor_id in (select id from proveedores where razon_social ~* 'fraccionados\s*n\s*[º°o.]?\s*79');
