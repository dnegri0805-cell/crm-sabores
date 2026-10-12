-- =========================================================
-- MARGEN ADICIONAL POR FAMILIA — CRM Sabores de mi País
-- Puntos que se suman (o restan) al margen de cada lista solo para una familia.
--  · Ej.: lista mayorista 25 %, minorista 35 % y "Frutos secos" +5
--    → los frutos secos salen con 30 % en mayorista y 40 % en minorista.
--  · Sin ajuste (o 0) la familia usa el margen de la lista, como hasta ahora.
--  · El margen final nunca baja de 0 % ni pasa de 89 %. El redondeo de precios se aplica después, igual que antes.
-- Requiere: precios.sql y ventas-plan.sql. Se puede correr más de una vez
-- (y sigue funcionando aunque vuelvas a correr ventas-plan.sql o ventas-peso.sql).
-- =========================================================

create table if not exists margenes_familia (
  familia      text primary key,
  ajuste_pct   numeric(5,2) not null default 0,
  actualizado  timestamptz not null default now()
);
alter table margenes_familia enable row level security;
drop policy if exists "leer_margenes_familia" on margenes_familia;
create policy "leer_margenes_familia" on margenes_familia for select to authenticated using (true);
grant select on margenes_familia to authenticated;

-- Factor que lleva el precio de la lista al margen de la familia:
-- precio = costo / (1 − margen)  →  precio_familia = precio_lista × (1 − m_lista) / (1 − m_lista − ajuste)
create or replace function margen_familia_factor(p_familia text, p_lista text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (1 - coalesce(l.margen_pct, 0) / 100)
         / (1 - least(greatest(coalesce(l.margen_pct, 0) + f.ajuste_pct, 0), 89) / 100)
      from config_listas l
      join margenes_familia f on upper(f.familia) = upper(trim(p_familia))
     where l.lista::text = p_lista and f.ajuste_pct <> 0
     limit 1), 1)
$$;
grant execute on function margen_familia_factor(text, text) to anon, authenticated, service_role;

-- Guardar el ajuste de una familia (solo el dueño). 0 o vacío = sin ajuste.
create or replace function fijar_margen_familia(p_familia text, p_ajuste numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  if coalesce(trim(p_familia), '') = '' then raise exception 'Falta la familia'; end if;
  if p_ajuste is not null and (p_ajuste < -50 or p_ajuste > 50) then raise exception 'El ajuste tiene que estar entre -50 y +50 puntos'; end if;
  if coalesce(p_ajuste, 0) = 0 then
    delete from margenes_familia where upper(familia) = upper(trim(p_familia));
  else
    insert into margenes_familia (familia, ajuste_pct) values (trim(p_familia), round(p_ajuste, 2))
    on conflict (familia) do update set ajuste_pct = excluded.ajuste_pct, actualizado = now();
  end if;
end $$;
revoke execute on function fijar_margen_familia(text, numeric) from public, anon;
grant execute on function fijar_margen_familia(text, numeric) to authenticated;

-- Capa de precios: precios_lista (el cálculo original por lista) → precios_base (con el ajuste por familia)
-- → precios_productos (redondeo y precio por pieza, sin cambios).
do $$
declare def text; opts text[]; cols text;
begin
  if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'precios_base') then
    raise notice 'No existe precios_base: corré primero ventas-plan.sql y después este script';
    return;
  end if;
  if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'precios_lista') then
    def := pg_get_viewdef('public.precios_base'::regclass, true);
    select reloptions into opts from pg_class where oid = 'public.precios_base'::regclass;
    execute 'create view public.precios_lista as ' || def;
    if opts is not null then execute format('alter view public.precios_lista set (%s)', array_to_string(opts, ',')); end if;
    execute 'grant select on public.precios_lista to authenticated, service_role';
  end if;
  -- Mismas columnas, en el mismo orden y con el mismo tipo; solo cambian los precios de lista
  select string_agg(case when a.attname in ('precio_mayorista', 'precio_minorista', 'precio_especial')
                         then format('(%I * margen_familia_factor(familia, %L))::%s as %I', a.attname, replace(a.attname, 'precio_', ''), format_type(a.atttypid, a.atttypmod), a.attname)
                         else quote_ident(a.attname) end, ', ' order by a.attnum)
    into cols from pg_attribute a where a.attrelid = 'public.precios_lista'::regclass and a.attnum > 0 and not a.attisdropped;
  execute 'create or replace view public.precios_base as select ' || cols || ' from public.precios_lista';
end $$;

select 'margen por familia listo' as resultado,
       (select count(*) from margenes_familia) as familias_con_ajuste;
