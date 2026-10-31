-- Registro de errores de la app (solo el dueño los lee) y permiso de la cola de impresión
create table if not exists public.errores_app(
  id bigint generated always as identity primary key,
  usuario_id uuid default auth.uid(),
  pantalla text, mensaje text, detalle text, version text, navegador text,
  creado_en timestamptz not null default now());
alter table public.errores_app enable row level security;
create policy ea_ins on public.errores_app for insert to authenticated with check (usuario_id=auth.uid());
create policy ea_sel on public.errores_app for select to authenticated using (exists(select 1 from public.perfiles p where p.id=auth.uid() and p.rol='dueno'));
grant insert,select on public.errores_app to authenticated;
grant select on public.errores_app to service_role;
grant select,insert,update,delete on public.cola_impresion to authenticated;
-- (ver también la migración papelera_y_copias_afuera: copias_registro, copia_mail_*, papelera_lista, papelera_recuperar y auditoría de pedido_items)
