-- =========================================================
-- CAJA DIARIA Y GASTOS — CRM Sabores de mi País
-- Solo el dueño puede ver y cargar (usa es_dueno() de precios.sql).
-- Se puede correr más de una vez.
-- =========================================================

create table if not exists gastos (
  id          bigint generated always as identity primary key,
  fecha       date not null default current_date,
  categoria   text not null,
  descripcion text,
  importe     numeric(14,2) not null check (importe > 0),
  medio       text not null default 'efectivo'
              check (medio in ('efectivo','transferencia','cheque','tarjeta','debito_automatico','otro')),
  usuario_id  uuid default auth.uid(),
  creado_en   timestamptz default now()
);
create index if not exists gastos_fecha on gastos (fecha);

create table if not exists cierres_caja (
  fecha             date primary key,
  efectivo_inicial  numeric(14,2) not null default 0,
  efectivo_esperado numeric(14,2) not null,
  efectivo_contado  numeric(14,2) not null,
  diferencia        numeric(14,2) generated always as (efectivo_contado - efectivo_esperado) stored,
  nota              text,
  usuario_id        uuid default auth.uid(),
  creado_en         timestamptz default now()
);

do $$
declare t text;
begin
  foreach t in array array['gastos','cierres_caja'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo_dueno" on %I', t);
    execute format('create policy "solo_dueno" on %I for all to authenticated using (es_dueno()) with check (es_dueno())', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

select 'caja lista' as resultado;
