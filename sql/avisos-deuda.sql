-- =========================================================
-- AVISOS DE DEUDA — CRM Sabores de mi País
-- Guarda cuándo se le avisó a cada cliente y los datos de pago que van en el mensaje.
-- Se puede correr más de una vez.
-- =========================================================

do $$
declare tp text := (select format_type(atttypid, atttypmod) from pg_attribute
                     where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists avisos_deuda (
      id          bigint generated always as identity primary key,
      cliente_id  %s not null references clientes(id) on delete cascade,
      fecha       timestamptz not null default now(),
      medio       text not null default 'whatsapp',
      monto       numeric(14,2),
      usuario_id  uuid default auth.uid())$f$, tp);
end $$;
create index if not exists avisos_deuda_cliente on avisos_deuda (cliente_id, fecha desc);

create table if not exists config_app (
  clave text primary key,
  valor text
);

do $$
declare t text;
begin
  foreach t in array array['avisos_deuda','config_app'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

select 'avisos listo' as resultado;
