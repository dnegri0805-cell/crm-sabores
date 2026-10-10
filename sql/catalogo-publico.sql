-- =========================================================
-- CATÁLOGO PÚBLICO — CRM Sabores de mi País
-- Un link para cualquier persona: ve productos y precios de la lista que elijas
-- en el CRM y te manda el pedido por WhatsApp. Se activa/desactiva desde el CRM.
-- Se puede correr más de una vez.
-- =========================================================

create or replace function catalogo_publico()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_lista text; v_prod jsonb; v_promos jsonb;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then
    raise exception 'El catálogo no está disponible en este momento.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto, 'img', p.foto)
           order by pp.descripcion), '[]'::jsonb)
    into v_prod from precios_productos pp join productos p on p.id = pp.producto_id
   where pp.costo > 0 and coalesce(p.activo, true);
  select coalesce(jsonb_agg(jsonb_build_object('n', nombre, 'pct', descuento_pct, 'a', alcance, 'av', alcance_valor,
           'mt', minimo_tipo, 'mu', minimo_unidades)), '[]'::jsonb)
    into v_promos from promociones
   where activa and current_date >= desde and (hasta is null or current_date <= hasta)
     and (listas is null or cardinality(listas) = 0 or v_lista = any(listas));
  return jsonb_build_object('cliente', null, 'lista', v_lista, 'productos', v_prod, 'ultimo', '[]'::jsonb, 'promos', v_promos, 'publico', true,
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'mp',  (select valor from config_app where clave = 'link_mp'));
end $$;
revoke execute on function catalogo_publico() from public;
grant execute on function catalogo_publico() to anon, authenticated;

select 'catalogo publico listo' as resultado;
