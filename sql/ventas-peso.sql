-- =========================================================
-- PRODUCTOS POR PESO (fiambres y quesos) — CRM Sabores de mi País
-- Se venden por pieza entera y se cobran por el peso real.
--  · En Precios cargás el costo POR KILO y el peso promedio de la pieza.
--  · Las listas de precios muestran el precio POR PIEZA (precio por kilo × peso promedio),
--    así los pedidos, el catálogo, los mínimos y los descuentos funcionan por pieza.
--  · Al preparar el pedido cargás el peso real y el renglón se ajusta solo.
-- Requiere: ventas-plan.sql (precios redondeados). Se puede correr más de una vez.
-- =========================================================

alter table productos    add column if not exists por_peso   boolean not null default false;
alter table productos    add column if not exists peso_pieza numeric(10,3);
alter table pedido_items add column if not exists peso_real  numeric(10,3);
alter table pedido_items add column if not exists precio_kg  numeric(14,2);

-- Factor de cada producto: el peso promedio de la pieza (o 1 si no se vende por peso)
create or replace function factor_peso(p_id text) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select case when por_peso and coalesce(peso_pieza, 0) > 0 then peso_pieza end from productos where id::text = p_id), 1)
$$;
grant execute on function factor_peso(text) to anon, authenticated, service_role;

-- Listas de precios: para los productos por peso, precio y costo por pieza
do $$
declare def text; opts text[]; cols text; tiene_red boolean := exists (select 1 from pg_proc where proname = 'redondear_precio');
begin
  if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'precios_base') then
    if not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'precios_productos') then
      raise notice 'precios_productos no es una vista: no se puede aplicar el precio por pieza';
      return;
    end if;
    def := pg_get_viewdef('public.precios_productos'::regclass, true);
    select reloptions into opts from pg_class where oid = 'public.precios_productos'::regclass;
    execute 'create view public.precios_base as ' || def;
    if opts is not null then execute format('alter view public.precios_base set (%s)', array_to_string(opts, ',')); end if;
    execute 'grant select on public.precios_base to authenticated, service_role';
  end if;
  select string_agg(case
           when a.attname in ('precio_mayorista', 'precio_minorista', 'precio_especial') then
             case when tiene_red then format('redondear_precio(b.%I * factor_peso(b.producto_id::text), %L)::%s as %I', a.attname, replace(a.attname, 'precio_', ''), format_type(a.atttypid, a.atttypmod), a.attname)
                  else format('(b.%I * factor_peso(b.producto_id::text))::%s as %I', a.attname, format_type(a.atttypid, a.atttypmod), a.attname) end
           when a.attname = 'costo' then format('(b.costo * factor_peso(b.producto_id::text))::%s as costo', format_type(a.atttypid, a.atttypmod))
           else 'b.' || quote_ident(a.attname) end, ', ' order by a.attnum)
    into cols from pg_attribute a where a.attrelid = 'public.precios_productos'::regclass and a.attnum > 0 and not a.attisdropped;
  execute 'create or replace view public.precios_productos as select ' || cols || ' from public.precios_base b';
end $$;

-- Costo de cada renglón: por pieza en los productos por peso
create or replace function poner_costo_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.costo_unitario is null then
    select costo * case when por_peso and coalesce(peso_pieza, 0) > 0 then peso_pieza else 1 end into new.costo_unitario from productos where id = new.producto_id;
  end if;
  return new;
end $$;

-- Para el catálogo: qué productos se venden por peso y cuánto pesa la pieza (0 = se pide por kilo)
create or replace function pesables() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(id::text, coalesce(peso_pieza, 0)), '{}'::jsonb) from productos where por_peso
$$;

-- Una sola vez: marca como "por peso" todos los quesos y fiambres (los envasados por gramos quedan afuera)
do $$
begin
  if exists (select 1 from config_app where clave = 'peso_auto') then return; end if;
  update productos set por_peso = true
   where not por_peso
     and coalesce(familia, '') ~* '(queso|fiambre|chacinad|jamoner|embutid|^secos$)'
     and coalesce(familia, '') !~* '(fetas|rallad|hebras|mendicrim|tholem|untable)'
     and coalesce(descripcion, '') !~* '([0-9]+ *(gr|grs|g|gs|ml|cc)\M|fetas|rallad|\munt\M|unt\.|hebras|crema\M|tholem|pizzeta|mascarpone|camembert|brie|mendicrim|\mman[ií]\M|salchicha|rodajitas|fuet|bandeja|\([0-9]+\))';
  insert into config_app (clave, valor) values ('peso_auto', now()::text);
end $$;
revoke execute on function pesables() from public;
grant execute on function pesables() to anon, authenticated;

select 'productos por peso listos: ' || (select count(*) from productos where por_peso) || ' quesos y fiambres por peso' as resultado;
