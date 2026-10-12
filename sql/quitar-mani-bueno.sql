-- Quita los productos de la marca propia "Maní Bueno" (todavía no existen).
-- Los borra; si alguno ya se usó en un pedido o movimiento, lo desactiva (no se ve en ningún catálogo).
do $$
declare r record;
begin
  for r in select id, descripcion from productos
            where coalesce(marca, '') ~* 'man[ií] ?bueno' or descripcion ~* 'man[ií] ?bueno' loop
    begin
      delete from productos where id = r.id;
      raise notice 'Borrado: %', r.descripcion;
    exception when others then
      update productos set activo = false where id = r.id;
      raise notice 'Desactivado (ya tenía movimientos): %', r.descripcion;
    end;
  end loop;
end $$;

select coalesce(
  (select string_agg(descripcion || ' (desactivado, no se ve en los catálogos)', ' · ') from productos
    where coalesce(marca, '') ~* 'man[ií] ?bueno' or descripcion ~* 'man[ií] ?bueno'),
  'Listo: ya no queda ningún producto Maní Bueno') as resultado;
