-- =========================================================
-- CUIDAR LA PLATA Y EL NEGOCIO — CRM Sabores de mi País
-- Merma, trazabilidad por lote, temperatura de cámara y tareas del dueño.
-- Requiere: control.sql (vencimientos). Se puede correr más de una vez.
-- =========================================================

do $$
declare tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
        tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  -- Merma: roturas, vencidos, diferencias de peso, faltantes
  execute format($f$
    create table if not exists mermas (
      id          bigint generated always as identity primary key,
      producto_id %s not null references productos(id) on delete cascade,
      cantidad    numeric(14,3) not null,
      motivo      text not null,
      costo       numeric(14,2) not null default 0,
      nota        text,
      fecha       timestamptz not null default now(),
      usuario_id  uuid default auth.uid())$f$, tq);
  -- Tareas y recordatorios del dueño
  execute format($f$
    create table if not exists tareas (
      id         bigint generated always as identity primary key,
      titulo     text not null,
      fecha      date not null default current_date,
      cliente_id %s references clientes(id) on delete set null,
      hecha      boolean not null default false,
      hecha_en   timestamptz,
      creado_en  timestamptz not null default now())$f$, tc);
end $$;

-- Temperatura de las cámaras
create table if not exists temperaturas (
  id      bigint generated always as identity primary key,
  camara  text not null default 'Cámara',
  temp    numeric(5,1) not null,
  nota    text,
  fecha   timestamptz not null default now(),
  usuario_id uuid default auth.uid());

create index if not exists mermas_fecha on mermas (fecha);
create index if not exists temperaturas_fecha on temperaturas (fecha);
create index if not exists tareas_pend on tareas (hecha, fecha);

-- Trazabilidad: qué lote se le entregó a cada cliente
alter table pedido_items add column if not exists lote text;

do $$
declare t text;
begin
  foreach t in array array['mermas','tareas','temperaturas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

select 'negocio listo' as resultado;
