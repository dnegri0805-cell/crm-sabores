-- =========================================================
-- UNIFICAR PROVEEDORES — CRM Sabores de mi País
-- 1) Pasa todo lo de L.F MAYORISTA, MAYORISTA 18 AGOSTO y MAYORISTA 18 AGOS/SANCOR
--    (productos, órdenes de compra, facturas, pagos, costos…) a DISTRIBUIDORA CCP
--    y borra esos tres proveedores repetidos.
-- 2) Saca el proveedor MANI BUENO.
-- 3) Deja la función unificar_proveedores() para unificar desde el CRM
--    (Compras → Proveedores → 🔗 Unificar).
-- Se puede correr más de una vez. Si algo falla, no cambia nada.
-- =========================================================

-- Núcleo: mueve todas las referencias de los proveedores "origen" al "destino" y borra los origen
create or replace function _unificar_proveedores(p_destino uuid, p_origenes uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; n int; tot jsonb := '{}'::jsonb; o uuid; borrados int := 0; desact int := 0;
begin
  p_origenes := array(select distinct x from unnest(p_origenes) x where x is not null and x <> p_destino);
  if coalesce(array_length(p_origenes, 1), 0) = 0 then return jsonb_build_object('unificados', 0); end if;
  if not exists (select 1 from proveedores where id = p_destino) then raise exception 'No existe el proveedor destino'; end if;

  -- Costos por proveedor (un costo por producto y proveedor): queda el más nuevo
  if to_regclass('public.costos_proveedor') is not null then
    delete from costos_proveedor c
     where (c.proveedor_id = any(p_origenes) or c.proveedor_id = p_destino)
       and exists (select 1 from costos_proveedor d
                    where d.producto_id = c.producto_id
                      and (d.proveedor_id = any(p_origenes) or d.proveedor_id = p_destino)
                      and (d.fecha > c.fecha or (d.fecha = c.fecha and d.ctid > c.ctid)));
  end if;

  -- Todas las columnas que apuntan a proveedores (con clave foránea)
  for r in
    select cl.relname tabla, a.attname col
      from pg_constraint k
      join pg_class cl on cl.oid = k.conrelid
      join pg_namespace ns on ns.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
     where k.contype = 'f' and k.confrelid = 'public.proveedores'::regclass
       and ns.nspname = 'public' and array_length(k.conkey, 1) = 1
  loop
    execute format('update %I set %I = $1 where %I = any($2)', r.tabla, r.col, r.col) using p_destino, p_origenes;
    get diagnostics n = row_count;
    if n > 0 then tot := tot || jsonb_build_object(r.tabla, coalesce((tot->>r.tabla)::int, 0) + n); end if;
  end loop;

  -- Columnas proveedor_id sin clave foránea (por las dudas)
  for r in
    select c.table_name tabla, c.column_name col
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
       and c.column_name = 'proveedor_id' and c.data_type = 'uuid'
       and not exists (
         select 1 from pg_constraint k
           join pg_class cl on cl.oid = k.conrelid
           join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
          where k.contype = 'f' and k.confrelid = 'public.proveedores'::regclass
            and cl.relname = c.table_name and a.attname = c.column_name)
  loop
    execute format('update %I set %I = $1 where %I = any($2)', r.tabla, r.col, r.col) using p_destino, p_origenes;
    get diagnostics n = row_count;
    if n > 0 then tot := tot || jsonb_build_object(r.tabla, coalesce((tot->>r.tabla)::int, 0) + n); end if;
  end loop;

  -- Borra los repetidos (si alguno no se puede borrar, se desactiva)
  foreach o in array p_origenes loop
    begin
      delete from proveedores where id = o;
      borrados := borrados + 1;
    exception when others then
      update proveedores set activo = false where id = o;
      desact := desact + 1;
    end;
  end loop;
  return jsonb_build_object('unificados', array_length(p_origenes, 1), 'borrados', borrados, 'desactivados', desact, 'movidos', tot);
end $$;

-- Para el CRM: solo el dueño
create or replace function unificar_proveedores(p_destino uuid, p_origenes uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede unificar proveedores'; end if;
  return _unificar_proveedores(p_destino, p_origenes);
end $$;

revoke execute on function _unificar_proveedores(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function unificar_proveedores(uuid, uuid[]) from public, anon;
grant execute on function unificar_proveedores(uuid, uuid[]) to authenticated;

-- 1) L.F MAYORISTA + MAYORISTA 18 AGOSTO + MAYORISTA 18 AGOS/SANCOR → DISTRIBUIDORA CCP
do $$
declare d uuid; o uuid[]; nombres text; res jsonb;
begin
  select id into d from proveedores
   where upper(regexp_replace(razon_social, '\s+', ' ', 'g')) like 'DISTRIBUIDORA CCP%'
   order by activo desc nulls last limit 1;
  if d is null then raise exception 'No encontré el proveedor DISTRIBUIDORA CCP. Revisá cómo está escrito en Compras → Proveedores.'; end if;
  update proveedores set activo = true where id = d;
  select array_agg(id), string_agg(razon_social, ' · ') into o, nombres from proveedores
   where id <> d and (
         upper(razon_social) ~ '^\s*L\.?\s*F\.?\s*MAYORISTA'
      or upper(razon_social) ~ '^\s*MAYORISTA\s+18\s+(DE\s+)?AGOS');
  if o is null then raise notice 'No quedan proveedores para unificar en DISTRIBUIDORA CCP (ya estaba hecho).';
  else
    res := _unificar_proveedores(d, o);
    raise notice 'Unificados en DISTRIBUIDORA CCP: % → %', nombres, res;
  end if;
end $$;

-- 2) Sacar MANI BUENO de proveedores (sus productos, si tiene, quedan sin proveedor)
do $$
declare r record;
begin
  for r in select id, razon_social from proveedores where upper(razon_social) ~ 'MAN[IÍ]\s*BUENO' loop
    begin
      if to_regclass('public.costos_proveedor') is not null then delete from costos_proveedor where proveedor_id = r.id; end if;
      update productos set proveedor_id = null where proveedor_id = r.id;
      delete from proveedores where id = r.id;
      raise notice 'Borrado el proveedor %', r.razon_social;
    exception when others then
      update proveedores set activo = false where id = r.id;
      raise notice 'El proveedor % tiene compras cargadas: quedó desactivado (no aparece más)', r.razon_social;
    end;
  end loop;
end $$;

select string_agg(razon_social || case when activo then '' else ' (desactivado)' end, ' · ' order by razon_social) as proveedores_que_quedan
  from proveedores;
