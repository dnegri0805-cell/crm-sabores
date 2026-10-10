-- =========================================================
-- PROMOCIONES — CRM Sabores de mi País
-- Descuento % por marca/familia/producto/todo, con condición de cantidad o bulto cerrado.
-- Se aplica sola en pedidos del CRM y del catálogo online (el servidor recalcula).
-- Requiere: precios.sql (es_dueno), bultos.sql y pedidos-online.sql. Se puede correr más de una vez.
-- =========================================================

create table if not exists promociones (
  id              bigint generated always as identity primary key,
  nombre          text not null,
  descuento_pct   numeric(5,2) not null check (descuento_pct > 0 and descuento_pct < 90),
  alcance         text not null default 'todos' check (alcance in ('todos','marca','familia','producto')),
  alcance_valor   text,
  minimo_tipo     text not null default 'ninguno' check (minimo_tipo in ('ninguno','unidades','bulto')),
  minimo_unidades int not null default 0,
  listas          text[],
  desde           date not null default current_date,
  hasta           date,
  activa          boolean not null default true,
  creado_en       timestamptz default now()
);

alter table promociones enable row level security;
drop policy if exists "leer_promos" on promociones;
drop policy if exists "dueno_promos" on promociones;
create policy "leer_promos" on promociones for select to authenticated using (true);
create policy "dueno_promos" on promociones for all to authenticated using (es_dueno()) with check (es_dueno());
grant select, insert, update, delete on promociones to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table pedido_items add column if not exists promo text;

-- Mejor promo vigente para un producto, lista y cantidad
create or replace function mejor_promo(p_producto uuid, p_lista text, p_cant numeric)
returns table(pct numeric, nombre text) language sql stable security definer set search_path = public as $$
  select pr.descuento_pct, pr.nombre
    from promociones pr, productos p
   where p.id = p_producto and pr.activa
     and current_date >= pr.desde and (pr.hasta is null or current_date <= pr.hasta)
     and (pr.listas is null or cardinality(pr.listas) = 0 or p_lista = any(pr.listas))
     and (pr.alcance = 'todos'
          or (pr.alcance = 'marca'    and upper(coalesce(p.marca,''))   = upper(pr.alcance_valor))
          or (pr.alcance = 'familia'  and upper(coalesce(p.familia,'')) = upper(pr.alcance_valor))
          or (pr.alcance = 'producto' and p.id::text = pr.alcance_valor))
     and (pr.minimo_tipo = 'ninguno'
          or (pr.minimo_tipo = 'unidades' and p_cant >= pr.minimo_unidades)
          or (pr.minimo_tipo = 'bulto' and p.unidades_bulto > 1 and p_cant >= p.unidades_bulto))
   order by pr.descuento_pct desc
   limit 1
$$;
revoke execute on function mejor_promo(uuid, text, numeric) from public, anon;
grant execute on function mejor_promo(uuid, text, numeric) to authenticated;

-- Catálogo online: también manda las promos vigentes para su lista
create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_prod jsonb; v_ult jsonb; v_promos jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto)
           order by pp.descripcion), '[]'::jsonb)
    into v_prod from precios_productos pp join productos p on p.id = pp.producto_id where pp.costo > 0;
  select coalesce(jsonb_agg(i), '[]'::jsonb) into v_ult from (
    select jsonb_build_object('id', i.producto_id, 'q', i.cantidad) i from pedido_items i
     where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1)) x;
  select coalesce(jsonb_agg(jsonb_build_object('n', nombre, 'pct', descuento_pct, 'a', alcance, 'av', alcance_valor,
           'mt', minimo_tipo, 'mu', minimo_unidades)), '[]'::jsonb)
    into v_promos from promociones
   where activa and current_date >= desde and (hasta is null or current_date <= hasta)
     and (listas is null or cardinality(listas) = 0 or v_lista = any(listas));
  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', v_prod, 'ultimo', v_ult, 'promos', v_promos);
end $$;

-- Pedido online: el precio con la mejor promo se calcula acá
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
  v_vend := coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
  insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen)
  values (v.id, v_vend, v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'online')
  returning id, numero into v_ped;
  insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
  select v_ped.id, x.pid, x.q, round(x.base * (1 - coalesce(mp.pct,0) / 100), 2),
         case when mp.pct is not null then mp.nombre end
    from (select pp.producto_id pid, least(greatest(round((j->>'q')::numeric), 1), 100000) q,
                 case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end base
            from jsonb_array_elements(p_items) j
            join precios_productos pp on pp.producto_id::text = j->>'id'
           where (j->>'q')::numeric >= 1 and pp.costo > 0) x
    left join lateral mejor_promo(x.pid, v_lista, x.q) mp on true;
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

select 'promociones listo' as resultado;
