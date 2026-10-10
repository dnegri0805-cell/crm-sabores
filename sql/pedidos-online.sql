-- =========================================================
-- PEDIDOS ONLINE — CRM Sabores de mi País
-- Cada cliente tiene un link privado (token) para ver su catálogo y mandar pedidos.
-- Los precios se calculan acá, nunca se toman del navegador.
-- Se puede correr más de una vez.
-- =========================================================

alter table clientes add column if not exists token_pedidos text;
update clientes set token_pedidos = replace(gen_random_uuid()::text, '-', '') where token_pedidos is null;
alter table clientes alter column token_pedidos set default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists clientes_token_pedidos_key on clientes (token_pedidos);

alter table pedidos add column if not exists origen text default 'crm';

-- Catálogo de un cliente: sus datos, productos con el precio de su lista y su último pedido
create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_prod jsonb; v_ult jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', producto_id, 'd', descripcion, 'm', marca, 'f', familia, 'c', codigo,
           'p', case v_lista when 'minorista' then precio_minorista when 'especial' then precio_especial else precio_mayorista end)
           order by descripcion), '[]'::jsonb)
    into v_prod
    from precios_productos where costo > 0;

  select coalesce(jsonb_agg(jsonb_build_object('id', i.producto_id, 'q', i.cantidad)), '[]'::jsonb)
    into v_ult
    from pedido_items i
   where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado'
                         order by numero desc limit 1);

  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', v_prod, 'ultimo', v_ult);
end $$;

-- El cliente manda su pedido: queda "pendiente" (Por aprobar) con origen 'online'
create or replace function crear_pedido_cliente(p_token text, p_items jsonb, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v clientes%rowtype; vj jsonb; v_lista text; v_ped record; v_n int; v_total numeric; v_vend uuid;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  if jsonb_array_length(p_items) > 300 then raise exception 'El pedido tiene demasiados productos.'; end if;
  if (select count(*) from pedidos where cliente_id = v.id and origen = 'online' and estado::text = 'pendiente') >= 10 then
    raise exception 'Ya tenés varios pedidos esperando aprobación. Esperá a que los revisemos.'; end if;

  vj := to_jsonb(v);
  v_lista := coalesce(v.lista::text, 'mayorista');
  v_vend := coalesce((vj->>'vendedor_id')::uuid,
                     (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));

  insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen)
  values (v.id, v_vend, v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'online')
  returning id, numero into v_ped;

  insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
  select v_ped.id, pp.producto_id, least(greatest(round((x->>'q')::numeric), 1), 100000),
         case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end
    from jsonb_array_elements(p_items) x
    join precios_productos pp on pp.producto_id::text = x->>'id'
   where (x->>'q')::numeric >= 1 and pp.costo > 0;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Ninguno de los productos está disponible.'; end if;

  if nullif(trim(coalesce(p_nota,'')),'') is not null and exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='pedidos' and column_name='observaciones') then
    execute 'update pedidos set observaciones = $1 where id = $2' using left(trim(p_nota), 500), v_ped.id;
  end if;

  select total into v_total from pedidos where id = v_ped.id;
  return jsonb_build_object('numero', v_ped.numero, 'total', v_total, 'productos', v_n);
end $$;

revoke execute on function catalogo_cliente(text), crear_pedido_cliente(text, jsonb, text) from public;
grant execute on function catalogo_cliente(text), crear_pedido_cliente(text, jsonb, text) to anon, authenticated;

select 'pedidos online listo' as resultado,
       (select count(*) from clientes where token_pedidos is not null) as clientes_con_link;
