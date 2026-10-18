-- Copia de seguridad automática todas las noches (03:00 de Argentina).
-- Guarda las últimas 7 noches dentro de Supabase. Gratis (usa pg_cron).
create extension if not exists pg_cron;
create schema if not exists respaldo;
revoke all on schema respaldo from public, anon, authenticated;

create table if not exists respaldo.copias(
  id bigserial primary key,
  creado_en timestamptz not null default now(),
  tabla text not null,
  filas int not null,
  datos jsonb not null
);
create index if not exists copias_fecha on respaldo.copias(creado_en);
revoke all on respaldo.copias from public, anon, authenticated;

create or replace function respaldo.hacer_copia() returns int
language plpgsql security definer set search_path to public, respaldo as $$
declare t text; n int; d jsonb; total int := 0; ahora timestamptz := now();
begin
  for t in
    select c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace
     where s.nspname='public' and c.relkind='r'
       and c.relname not in ('auditoria','historial_cambios','audit_log','crm_snapshot_history','crm_snapshot_recovery_backups','crm_restore_test_runs')
     order by c.relname
  loop
    execute format('select count(*), coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into n, d;
    insert into respaldo.copias(creado_en, tabla, filas, datos) values (ahora, t, n, d);
    total := total + 1;
  end loop;
  delete from respaldo.copias where creado_en < ahora - interval '7 days 12 hours';
  return total;
end $$;
revoke all on function respaldo.hacer_copia() from public, anon, authenticated;

create or replace view respaldo.resumen as
  select creado_en, count(*) tablas, sum(filas) filas, pg_size_pretty(sum(pg_column_size(datos))::bigint) tamano
  from respaldo.copias group by creado_en order by creado_en desc;
revoke all on respaldo.resumen from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'respaldo-nocturno';
select cron.schedule('respaldo-nocturno', '0 6 * * *', 'select respaldo.hacer_copia()');

-- Primera copia ahora mismo, para probar
select respaldo.hacer_copia() as tablas_copiadas;
