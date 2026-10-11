-- =========================================================
-- VISITAS Y REPARTO — CRM Sabores de mi País
-- Faltantes que se reponen solos, historial de repartos, notas de voz
-- y fotos de la góndola del cliente. Requiere cobrar.sql y cuentas.sql.
-- Se puede correr más de una vez.
-- =========================================================

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
        tq text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.productos'::regclass and attname = 'id');
begin
  -- Lo que le debemos al cliente (faltó al armar) y se agrega a su próximo pedido
  execute format($f$
    create table if not exists pendientes_cliente (
      id             bigint generated always as identity primary key,
      cliente_id     %1$s not null references clientes(id) on delete cascade,
      producto_id    %2$s not null references productos(id) on delete cascade,
      cantidad       numeric(14,3) not null,
      pedido_origen  bigint,
      pedido_destino bigint,
      estado         text not null default 'pendiente' check (estado in ('pendiente', 'agregado', 'anulado')),
      creado_en      timestamptz not null default now())$f$, tc, tq);
  -- Fotos de la góndola del cliente
  execute format($f$
    create table if not exists fotos_cliente (
      id          bigint generated always as identity primary key,
      cliente_id  %s not null references clientes(id) on delete cascade,
      path        text not null,
      nota        text,
      creado_en   timestamptz not null default now())$f$, tc);
end $$;

-- Cada reparto terminado: paradas, km, combustible y ganancia
create table if not exists repartos_dia (
  id          bigint generated always as identity primary key,
  fecha       date not null default current_date,
  paradas     int not null default 0,
  entregados  int not null default 0,
  km          numeric(10,1) not null default 0,
  costo_km    numeric(14,2) not null default 0,
  combustible numeric(14,2) not null default 0,
  ganancia    numeric(14,2) not null default 0,
  cobrado     numeric(14,2) not null default 0,
  creado_en   timestamptz not null default now());

-- Notas de voz en la ficha del cliente
alter table notas_cliente add column if not exists audio text;

do $$
declare t text;
begin
  foreach t in array array['pendientes_cliente', 'fotos_cliente', 'repartos_dia'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- Usa la carpeta privada "documentos" (de cuentas.sql) para los audios y las fotos
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;

select 'visitas listo' as resultado;
