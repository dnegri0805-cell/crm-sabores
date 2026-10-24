-- Avisos de pedidos con el CRM cerrado (notificaciones push). YA APLICADO en Supabase.
-- Las claves VAPID y el secreto viven en privado.push_cfg (no se guardan en este repositorio).
-- Piezas: tabla push_subs (un renglón por celular suscripto), push_clave_publica() para suscribirse,
-- push_config() solo para la función del servidor, push_probar() para el botón de prueba,
-- y el trigger push_pedido_nuevo en pedidos, que llama a la Edge Function "avisar-pedido" con pg_net.
-- Se avisa cuando entra un pedido online, fijo o cargado por un vendedor (no los de prueba).
create table if not exists public.push_subs(
  endpoint text primary key, p256dh text not null, auth text not null,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  equipo text, creado_en timestamptz not null default now());
alter table public.push_subs enable row level security;
-- (ver la migración push_avisos_pedidos en Supabase para el resto)
