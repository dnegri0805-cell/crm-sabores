-- =========================================================
-- ARREGLO: "Could not choose the best candidate function"
-- Quedaron dos versiones de algunas funciones (una vieja y una nueva) y
-- Supabase no sabe cuál usar. Esto borra SOLO la versión vieja, y solo
-- si la nueva existe. No toca datos. Se puede correr más de una vez.
-- =========================================================
do $$
begin
  -- Enviar pedido desde el catálogo del cliente
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'crear_pedido_cliente' and p.pronargs = 5) then
    drop function if exists public.crear_pedido_cliente(text, jsonb, text);
  end if;
  -- Catálogo público
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'catalogo_publico' and p.pronargs = 2) then
    drop function if exists public.catalogo_publico();
    drop function if exists public.catalogo_publico(text);
  end if;
end $$;

select 'arreglo listo: ya se pueden enviar pedidos' as resultado;
