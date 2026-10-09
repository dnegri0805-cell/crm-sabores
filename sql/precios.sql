-- =========================================================
-- PRECIOS — CRM Sabores de mi País
-- Cambiar costos (uno, varios o aumento por porcentaje) y márgenes de lista.
-- Solo el usuario con rol 'dueno' puede usarlas. Se puede correr más de una vez.
-- =========================================================

create or replace function es_dueno() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfiles where id = auth.uid() and rol::text = 'dueno' and activo)
$$;

-- Nuevos costos: p_items = '[{"id":"<uuid>","costo":1234.5}, ...]'
create or replace function fijar_costos(p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  update productos p set costo = round((x->>'costo')::numeric, 2)
    from jsonb_array_elements(p_items) x
   where p.id = (x->>'id')::uuid and (x->>'costo')::numeric > 0
     and p.costo is distinct from round((x->>'costo')::numeric, 2);
  get diagnostics n = row_count;
  return n;
end $$;

-- Aumento (o baja) por porcentaje a una lista de productos
create or replace function aumentar_costos(p_ids uuid[], p_pct numeric)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  if p_pct is null or p_pct <= -90 or p_pct > 500 then raise exception 'Porcentaje fuera de rango'; end if;
  update productos set costo = round(costo * (1 + p_pct / 100), 2)
   where id = any(p_ids) and costo > 0;
  get diagnostics n = row_count;
  return n;
end $$;

-- Margen de una lista (sobre el precio de venta)
create or replace function fijar_margen_lista(p_lista text, p_margen numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  if p_margen is null or p_margen < 0 or p_margen >= 90 then raise exception 'El margen tiene que estar entre 0 y 89 %%'; end if;
  update config_listas set margen_pct = p_margen where lista::text = p_lista;
  if not found then raise exception 'No existe la lista %', p_lista; end if;
end $$;

revoke execute on function fijar_costos(jsonb), aumentar_costos(uuid[], numeric), fijar_margen_lista(text, numeric), es_dueno() from public, anon;
grant execute on function fijar_costos(jsonb), aumentar_costos(uuid[], numeric), fijar_margen_lista(text, numeric), es_dueno() to authenticated;

grant select on config_listas, historial_costos to authenticated;
do $$
declare t text;
begin
  foreach t in array array['config_listas','historial_costos'] loop
    if (select relrowsecurity from pg_class where oid = ('public.'||t)::regclass)
       and not exists (select 1 from pg_policies where schemaname='public' and tablename=t and cmd in ('SELECT','ALL')) then
      execute format('create policy "leer_%s" on %I for select to authenticated using (true)', t, t);
    end if;
  end loop;
end $$;

select 'precios listo' as resultado;
