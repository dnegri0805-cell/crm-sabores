-- UNIFICAR PROVEEDORES (2ª parte) — CRM Sabores de mi País
-- 1) "Mayoristas 18-Ago / Productos Nuevos" y "Mayoristas 18-Ago / SANCOR" → DISTRIBUIDORA CCP
-- 2) "JL SA" → "Maní JL S.A."
-- Mueve productos, órdenes, facturas, pagos y costos al proveedor que queda y borra el repetido.
-- Usa la función _unificar_proveedores() de unificar-proveedores.sql (ya ejecutado).
-- Se puede correr más de una vez.

do $$
declare d uuid; o uuid[]; nombres text; res jsonb;
begin
  -- 1) Mayoristas 18-Ago → DISTRIBUIDORA CCP
  select id into d from proveedores
   where upper(regexp_replace(razon_social, '\s+', ' ', 'g')) like 'DISTRIBUIDORA CCP%'
   order by activo desc nulls last limit 1;
  if d is null then raise exception 'No encontré DISTRIBUIDORA CCP'; end if;
  select array_agg(id), string_agg(razon_social, ' · ') into o, nombres from proveedores
   where id <> d and razon_social ~* '^\s*mayoristas?\s*18';
  if o is not null then
    res := _unificar_proveedores(d, o);
    raise notice 'A DISTRIBUIDORA CCP: % → %', nombres, res;
  end if;

  -- 2) JL SA → Maní JL S.A.
  d := null; o := null;
  select id into d from proveedores
   where razon_social ~* '^\s*man[ií]\s+jl\b'
   order by activo desc nulls last limit 1;
  if d is not null then
    update proveedores set activo = true where id = d;
    select array_agg(id), string_agg(razon_social, ' · ') into o, nombres from proveedores
     where id <> d and razon_social ~* '^\s*jl\s*s\.?\s*a\.?\s*$';
    if o is not null then
      res := _unificar_proveedores(d, o);
      raise notice 'A Maní JL S.A.: % → %', nombres, res;
    end if;
  end if;
end $$;

select string_agg(razon_social || case when activo then '' else ' (desactivado)' end, ' · ' order by razon_social) as proveedores_que_quedan
  from proveedores;
