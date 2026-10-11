-- =========================================================
-- IMPRESIÓN EN EL DEPÓSITO — CRM Sabores de mi País
-- Cola de impresión: desde el celular mandás a imprimir y la PC del
-- depósito (con el CRM abierto en la pantalla "Impresora") lo imprime sola.
-- Se puede correr más de una vez.
-- =========================================================

create table if not exists cola_impresion (
  id          bigint generated always as identity primary key,
  tipo        text not null default 'otro',          -- pedido, recibo, etiquetas, otro
  titulo      text not null default '',
  cuerpo      text not null,                         -- contenido del ticket (HTML)
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'impreso', 'error')),
  error       text,
  creado_en   timestamptz not null default now(),
  impreso_en  timestamptz,
  usuario_id  uuid default auth.uid());

create index if not exists cola_impresion_pend on cola_impresion (estado, id);

alter table cola_impresion enable row level security;
drop policy if exists "auth_all" on cola_impresion;
create policy "auth_all" on cola_impresion for all to authenticated using (true) with check (true);

-- Para que la PC del depósito se entere al instante (si no, igual revisa cada pocos segundos)
do $$ begin
  alter publication supabase_realtime add table cola_impresion;
exception when others then null; end $$;

-- Limpieza: borra lo impreso hace más de 30 días
delete from cola_impresion where estado = 'impreso' and impreso_en < now() - interval '30 days';

select 'cola de impresión lista' as resultado;
