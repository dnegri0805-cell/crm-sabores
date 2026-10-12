-- Saca la marca "Jema's" del nombre y de la marca de los productos (JEMA'S sigue como proveedor).
update productos
   set descripcion = trim(regexp_replace(descripcion, '\s*jema[''´`]?s\M', '', 'gi')),
       marca = case when coalesce(marca, '') ~* '^\s*jema[''´`]?s\s*$' then null else marca end
 where descripcion ~* 'jema[''´`]?s' or coalesce(marca, '') ~* '^\s*jema[''´`]?s\s*$'
returning codigo, descripcion as queda_asi;
