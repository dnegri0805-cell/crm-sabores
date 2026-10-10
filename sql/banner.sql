-- =========================================================
-- BANNER DE PORTADA — CRM Sabores de mi País
-- Deja que el catálogo online (pedido.html) lea el banner que armás en el CRM
-- (🖼️ Banner del catálogo). Reemplaza marca_publica sumando la clave del banner.
-- Se puede correr más de una vez.
-- =========================================================

create or replace function marca_publica()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'c',      (select valor from config_app where clave = 'marca_color'),
    'n',      (select valor from config_app where clave = 'marca_oscuro'),
    'logo',   (select valor from config_app where clave = 'marca_logo'),
    'banner', (select valor from config_app where clave = 'banner_portada'))
$$;
revoke execute on function marca_publica() from public;
grant execute on function marca_publica() to anon, authenticated;

select 'banner listo' as resultado;
