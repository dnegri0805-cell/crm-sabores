-- =========================================================
-- VENTAS 8 — CRM Sabores de mi País
-- Exhibidores en comodato y freno a morosos en el catálogo.
-- Requiere: ventas-plan.sql. Se puede correr más de una vez.
-- =========================================================

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists comodatos (
      id          bigint generated always as identity primary key,
      cliente_id  %s not null references clientes(id) on delete cascade,
      tipo        text not null,
      descripcion text,
      marca       text,
      desde       date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
      minimo_mes  numeric(14,2),
      activo      boolean not null default true,
      nota        text,
      creado_en   timestamptz default now())$f$, tc);
end $$;
alter table comodatos enable row level security;
drop policy if exists "auth_all" on comodatos;
create policy "auth_all" on comodatos for all to authenticated using (true) with check (true);
grant select, insert, update, delete on comodatos to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Catálogo: deuda vencida y freno a morosos
create or replace function catalogo_cliente(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; v_lista text; v_ult jsonb; v_r jsonb; v_viejo boolean;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(i), '[]'::jsonb) into v_ult from (
    select jsonb_build_object('id', i.producto_id, 'q', i.cantidad) i from pedido_items i
     where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1)) x;
  v_viejo := exists (select 1 from pedidos where cliente_id = v.id and estado::text <> 'cancelado');
  v_r := jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', productos_para(v_lista, v.id), 'ultimo', v_ult,
    'promos', promos_catalogo(v_lista), 'puntos', puntos_saldo(v.id), 'ref', v.codigo_ref,
    'sugerido', sugerido_cliente(v.id), 'rubro', v.rubro, 'surt', case when coalesce(v.rubro, '') <> '' then surtido_rubro(v.rubro) else '[]'::jsonb end,
    'llevas', compras_mes(v.id),
    'avisos', coalesce((select jsonb_agg(producto_id) from avisos_stock where cliente_id = v.id and avisado_en is null), '[]'::jsonb),
    'favs', coalesce(v.favoritos, '[]'::jsonb),
    'dias', to_jsonb(v.dias_visita), 'nivel', nivel_cliente(v.id),
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'),
    'deuda', (select jsonb_build_object('vencido', coalesce(sum(pendiente), 0), 'dias', coalesce(max(dias_mora), 0)) from facturas_estado where cliente_id = v.id and pendiente > 0.005 and dias_mora > 0),
    'freno', nullif((select valor from config_app where clave = 'freno_morosos'), '')::jsonb,
    'habituales', (select coalesce(jsonb_agg(pid order by n desc, ul desc), '[]'::jsonb) from (
        select i.producto_id pid, count(*) n, max(p.numero) ul from pedido_items i join pedidos p on p.id = i.pedido_id
         where p.cliente_id = v.id and p.estado::text <> 'cancelado' and p.creado_en > now() - interval '180 days' group by 1 order by 2 desc limit 60) z),
    'credito', case when coalesce(v.limite_credito, 0) > 0 or coalesce(v.condicion_pago_dias, 0) > 0 then jsonb_build_object('limite', coalesce(v.limite_credito, 0), 'dias', coalesce(v.condicion_pago_dias, 0),
        'saldo', coalesce((select saldo from saldos_clientes where cliente_id = v.id), 0)) end,
    'preventas', (select coalesce(jsonb_agg(jsonb_build_object('id', pv.id, 'n', pv.nombre, 'd', pv.descripcion, 'llega', pv.llega, 'p', pv.precio, 'img', coalesce(pv.foto, pr.foto), 'pid', pv.producto_id,
          'mia', (select coalesce(sum(cantidad), 0) from reservas r where r.preventa_id = pv.id and r.cliente_id = v.id)) order by pv.llega), '[]'::jsonb)
        from preventas pv left join productos pr on pr.id = pv.producto_id where pv.activa and (pv.llega is null or pv.llega >= current_date - 3))) || extras_catalogo(v_lista);
  if v_viejo then
    v_r := jsonb_set(v_r, '{combos}', coalesce((select jsonb_agg(c) from jsonb_array_elements(v_r->'combos') c where not coalesce((c->>'nuevo')::boolean, false)), '[]'::jsonb));
  end if;
  return v_r;
end $$;
grant execute on function catalogo_cliente(text) to anon, authenticated;
grant select on all tables in schema public to service_role;

select 'ventas proveedores lista' as resultado;
