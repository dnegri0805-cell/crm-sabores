-- Conexión con Mercado Pago: guarda la credencial (Access Token) de forma protegida.
-- El dueño la puede cargar o borrar desde el CRM, pero nadie la puede leer desde la app:
-- solo el servidor (función mp-movimientos) la usa para consultar los movimientos.
create table if not exists public.mp_conexion (
  id int primary key default 1 check (id=1),
  token text,
  cuenta text,
  actualizado_en timestamptz default now()
);
alter table public.mp_conexion enable row level security;
revoke all on public.mp_conexion from anon, authenticated;

create or replace function public.mp_guardar_token(p_token text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.es_dueno() then raise exception 'Solo el dueño puede conectar Mercado Pago'; end if;
  insert into mp_conexion(id,token,cuenta,actualizado_en) values (1,nullif(trim(p_token),''),null,now())
  on conflict (id) do update set token=excluded.token, cuenta=null, actualizado_en=now();
end $$;
revoke all on function public.mp_guardar_token(text) from public, anon;
grant execute on function public.mp_guardar_token(text) to authenticated;

-- Para la app: solo dice si hay conexión y a qué cuenta, nunca la credencial
create or replace function public.mp_estado()
returns table(conectado boolean, cuenta text, actualizado_en timestamptz) language sql security definer set search_path=public as $$
  select coalesce((select token is not null from mp_conexion where id=1),false),(select cuenta from mp_conexion where id=1),(select actualizado_en from mp_conexion where id=1)
  where public.es_dueno();
$$;
revoke all on function public.mp_estado() from public, anon;
grant execute on function public.mp_estado() to authenticated;
