-- Registro de folletos mandados a clientes (para ver a quién se mandó y quién pidió después)
create table if not exists public.folletos_envios(
  id bigint generated always as identity primary key,
  folleto_id text not null,
  cliente_id uuid references public.clientes(id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfiles(id),
  formato text,
  creado_en timestamptz not null default now());
create index if not exists folletos_envios_f on public.folletos_envios(folleto_id,creado_en desc);
alter table public.folletos_envios enable row level security;
create policy fe_sel on public.folletos_envios for select to authenticated using (
  usuario_id=auth.uid() or exists(select 1 from public.perfiles p where p.id=auth.uid() and p.rol<>'vendedor'));
create policy fe_ins on public.folletos_envios for insert to authenticated with check (usuario_id=auth.uid());
grant select,insert on public.folletos_envios to authenticated;
grant select on public.folletos_envios to service_role;
