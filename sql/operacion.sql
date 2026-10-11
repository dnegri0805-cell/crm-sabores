-- =========================================================
-- OPERACIÓN Y MARGEN — CRM Sabores de mi País
-- Guarda el costo de cada producto en cada proveedor (de las listas que importás
-- y de lo que recibís), para saber cuál conviene. Se puede correr más de una vez.
-- =========================================================

do $$
declare tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
        tv text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.proveedores'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists costos_proveedor (
      producto_id  %1$s not null references productos(id) on delete cascade,
      proveedor_id %2$s not null references proveedores(id) on delete cascade,
      costo        numeric(14,2) not null,
      fecha        timestamptz not null default now(),
      fuente       text,
      primary key (producto_id, proveedor_id))$f$, tq, tv);
end $$;

alter table costos_proveedor enable row level security;
drop policy if exists "auth_all" on costos_proveedor;
create policy "auth_all" on costos_proveedor for all to authenticated using (true) with check (true);
grant select, insert, update, delete on costos_proveedor to authenticated;

-- Arranca con lo que ya compraste: el último costo de cada producto en cada proveedor
insert into costos_proveedor (producto_id, proveedor_id, costo, fecha, fuente)
select distinct on (i.producto_id, o.proveedor_id) i.producto_id, o.proveedor_id, i.costo_unitario, coalesce(o.fecha::timestamptz, now()), 'orden de compra'
  from ordenes_compra_items i join ordenes_compra o on o.id = i.orden_id
 where i.costo_unitario > 0 and o.proveedor_id is not null and o.estado::text <> 'anulada'
 order by i.producto_id, o.proveedor_id, i.id desc
on conflict (producto_id, proveedor_id) do nothing;

select 'operación lista: ' || (select count(*) from costos_proveedor) || ' costos por proveedor' as resultado;
