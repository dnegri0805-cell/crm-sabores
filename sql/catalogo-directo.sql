-- Pedido desde el catálogo público: entra directo como pedido "Por aprobar" (ya aplicado en Supabase).
-- Si el teléfono ya es de un cliente, va a su nombre; si no, se da de alta solo y el pedido dice
-- "🌐 Catálogo · cliente nuevo: completar sus datos".
create or replace function public.pedido_publico(p_nombre text, p_telefono text, p_domicilio text, p_items jsonb, p_nota text default null, p_ref text default null, p_cupon text default null, p_rubro text default null)
returns jsonb language plpgsql security definer set search_path to public as $$
declare v_lista text; v_ref text; v_pro uuid; v_cli uuid; v_tok text; v_nuevo boolean := false; v_tel text; v_res jsonb; v_nota text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then raise exception 'El catálogo no está disponible en este momento.'; end if;
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Poné tu nombre o el de tu negocio.'; end if;
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if length(v_tel) < 8 then raise exception 'Poné tu WhatsApp para que te confirmemos el pedido.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'El pedido tiene demasiados productos.'; end if;
  if (select count(*) from clientes where origen = 'catalogo' and creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Hay muchos pedidos en este momento. Mandanos el pedido por WhatsApp.'; end if;
  v_ref := (select razon_social from clientes where codigo_ref = upper(trim(p_ref)));
  v_pro := alta_web(p_nombre, p_telefono, p_domicilio, p_rubro, null, null, case when v_ref is not null then 'Lo recomendó ' || v_ref || ' (código ' || upper(trim(p_ref)) || ')' end);
  select id, token_pedidos into v_cli, v_tok from clientes
   where coalesce(activo, true) and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 8) = right(v_tel, 8)
   order by creado_en limit 1;
  if v_cli is null then
    insert into clientes (razon_social, contacto, telefono, domicilio, condicion_iva, lista, condicion_pago_dias, rubro, origen, observaciones)
    values (left(trim(p_nombre), 80), nullif(split_part(trim(p_nombre), ' ', 1), ''), left(trim(p_telefono), 30), nullif(left(trim(coalesce(p_domicilio, '')), 160), ''),
            'consumidor_final', v_lista::lista_precio, 0, nullif(p_rubro, ''), 'catalogo',
            'Alta automática desde el catálogo público' || coalesce(' · Lo recomendó ' || v_ref, ''))
    returning id, token_pedidos into v_cli, v_tok;
    v_nuevo := true;
  end if;
  if v_tok is null then
    update clientes set token_pedidos = replace(gen_random_uuid()::text, '-', '') where id = v_cli returning token_pedidos into v_tok;
  end if;
  if v_pro is not null then
    update prospectos set estado = 'cliente', cliente_id = v_cli, actualizado_en = now() where id = v_pro;
  end if;
  v_nota := nullif(concat_ws(' · ', case when v_nuevo then '🌐 Catálogo · cliente nuevo: completar sus datos' else '🌐 Pedido desde el catálogo público' end,
                   nullif(left(trim(coalesce(p_nota, '')), 400), '')), '');
  v_res := crear_pedido_cliente(v_tok, p_items, v_nota, p_cupon, false);
  return coalesce(v_res, '{}'::jsonb) || jsonb_build_object('nuevo', v_nuevo);
end $$;
grant execute on function public.pedido_publico(text, text, text, jsonb, text, text, text, text) to anon, authenticated;
