-- Esquema completo de la base del CRM Sabores de mi País
-- Exportado el 16/10/2026
-- Solo estructura, sin datos. Para recrear la base en un proyecto nuevo de Supabase:
-- pegar todo en SQL Editor → Run (con el proyecto nuevo vacío).

set check_function_bodies = off;

create extension if not exists "uuid-ossp" with schema extensions;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create type public.app_role as enum ('OWNER', 'ADMIN', 'SELLER', 'WAREHOUSE', 'DELIVERY');

create type public.condicion_iva as enum ('responsable_inscripto', 'monotributo', 'consumidor_final', 'exento');

create type public.estado_pedido as enum ('pendiente', 'aprobado', 'en_preparacion', 'listo', 'en_reparto', 'entregado', 'cancelado');

create type public.invoice_status as enum ('UNPAID', 'PARTIAL', 'PAID', 'VOID');

create type public.lista_precio as enum ('mayorista', 'minorista', 'especial');

create type public.medio_pago as enum ('efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro');

create type public.order_status as enum ('DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

create type public.payment_method as enum ('CASH', 'BANK_TRANSFER', 'CHECK', 'OTHER');

create type public.rol_usuario as enum ('dueno', 'administracion', 'vendedor', 'deposito');

create type public.tipo_factura as enum ('A', 'B', 'C');

CREATE OR REPLACE FUNCTION private.current_app_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select role from public.profiles where id = auth.uid() and active = true $function$
;

CREATE OR REPLACE FUNCTION private.current_organization_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select organization_id from public.profiles where id = auth.uid() and active = true $function$
;

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  test_org uuid;
  assigned_role public.app_role;
begin
  select organization_id into test_org
  from private.stage9_config where singleton = true;

  if not exists (
    select 1 from public.profiles
    where organization_id = test_org and active = true
  ) then
    assigned_role := 'OWNER';
  else
    assigned_role := 'SELLER';
  end if;

  insert into public.profiles(id, organization_id, full_name, role)
  values (
    new.id,
    test_org,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    assigned_role
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._unificar_proveedores(p_destino uuid, p_origenes uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; n int; tot jsonb := '{}'::jsonb; o uuid; borrados int := 0; desact int := 0;
begin
  p_origenes := array(select distinct x from unnest(p_origenes) x where x is not null and x <> p_destino);
  if coalesce(array_length(p_origenes, 1), 0) = 0 then return jsonb_build_object('unificados', 0); end if;
  if not exists (select 1 from proveedores where id = p_destino) then raise exception 'No existe el proveedor destino'; end if;

  -- Costos por proveedor (un costo por producto y proveedor): queda el más nuevo
  if to_regclass('public.costos_proveedor') is not null then
    delete from costos_proveedor c
     where (c.proveedor_id = any(p_origenes) or c.proveedor_id = p_destino)
       and exists (select 1 from costos_proveedor d
                    where d.producto_id = c.producto_id
                      and (d.proveedor_id = any(p_origenes) or d.proveedor_id = p_destino)
                      and (d.fecha > c.fecha or (d.fecha = c.fecha and d.ctid > c.ctid)));
  end if;

  -- Todas las columnas que apuntan a proveedores (con clave foránea)
  for r in
    select cl.relname tabla, a.attname col
      from pg_constraint k
      join pg_class cl on cl.oid = k.conrelid
      join pg_namespace ns on ns.oid = cl.relnamespace
      join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
     where k.contype = 'f' and k.confrelid = 'public.proveedores'::regclass
       and ns.nspname = 'public' and array_length(k.conkey, 1) = 1
  loop
    execute format('update %I set %I = $1 where %I = any($2)', r.tabla, r.col, r.col) using p_destino, p_origenes;
    get diagnostics n = row_count;
    if n > 0 then tot := tot || jsonb_build_object(r.tabla, coalesce((tot->>r.tabla)::int, 0) + n); end if;
  end loop;

  -- Columnas proveedor_id sin clave foránea (por las dudas)
  for r in
    select c.table_name tabla, c.column_name col
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
       and c.column_name = 'proveedor_id' and c.data_type = 'uuid'
       and not exists (
         select 1 from pg_constraint k
           join pg_class cl on cl.oid = k.conrelid
           join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
          where k.contype = 'f' and k.confrelid = 'public.proveedores'::regclass
            and cl.relname = c.table_name and a.attname = c.column_name)
  loop
    execute format('update %I set %I = $1 where %I = any($2)', r.tabla, r.col, r.col) using p_destino, p_origenes;
    get diagnostics n = row_count;
    if n > 0 then tot := tot || jsonb_build_object(r.tabla, coalesce((tot->>r.tabla)::int, 0) + n); end if;
  end loop;

  -- Borra los repetidos (si alguno no se puede borrar, se desactiva)
  foreach o in array p_origenes loop
    begin
      delete from proveedores where id = o;
      borrados := borrados + 1;
    exception when others then
      update proveedores set activo = false where id = o;
      desact := desact + 1;
    end;
  end loop;
  return jsonb_build_object('unificados', array_length(p_origenes, 1), 'borrados', borrados, 'desactivados', desact, 'movidos', tot);
end $function$
;

CREATE OR REPLACE FUNCTION public.ahorro_cliente(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; r record;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then return null; end if;
  select coalesce(sum(greatest(0, i.precio_lista - i.precio_unitario) * i.cantidad)
                    filter (where p.creado_en >= date_trunc('year', now())), 0) anio,
         coalesce(sum(greatest(0, i.precio_lista - i.precio_unitario) * i.cantidad), 0) total,
         min(p.creado_en) desde
    into r
    from pedido_items i join pedidos p on p.id = i.pedido_id
   where p.cliente_id = v_id and p.estado::text <> 'cancelado'
     and i.precio_lista is not null and i.precio_lista > 0
     and coalesce(i.promo, '') <> ''
     and (to_jsonb(i)->>'peso_real') is null;
  return jsonb_build_object('anio', round(r.anio), 'total', round(r.total), 'desde', r.desde);
end $function$
;

CREATE OR REPLACE FUNCTION public.ajustar_stock(p_producto uuid, p_contado numeric, p_motivo text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_actual numeric; v_dif numeric;
begin
  if p_contado is null or p_contado < 0 then raise exception 'La cantidad contada no puede ser negativa'; end if;
  select fisico into v_actual from stock where producto_id = p_producto for update;
  v_dif := p_contado - coalesce(v_actual, 0);
  if v_dif <> 0 then perform mover_stock(p_producto, v_dif, 0, 'ajuste', coalesce(nullif(p_motivo,''), 'Ajuste de inventario')); end if;
  return v_dif;
end $function$
;

CREATE OR REPLACE FUNCTION public.alerta_oferta(p_token text, p_producto text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; n int;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  delete from alertas_oferta where cliente_id = v_id and producto_id::text = p_producto and avisado_en is null;
  get diagnostics n = row_count;
  if n > 0 then return jsonb_build_object('on', false); end if;
  if (select count(*) from alertas_oferta where cliente_id = v_id and avisado_en is null) >= 50 then raise exception 'Ya tenés muchos avisos activos.'; end if;
  insert into alertas_oferta (cliente_id, producto_id) select v_id, id from productos where id::text = p_producto;
  return jsonb_build_object('on', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.alta_web(p_nombre text, p_telefono text, p_domicilio text DEFAULT NULL::text, p_rubro text DEFAULT NULL::text, p_contacto text DEFAULT NULL::text, p_cuit text DEFAULT NULL::text, p_nota text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_tel text := left(trim(coalesce(p_telefono, '')), 30); v_nom text := left(trim(coalesce(p_nombre, '')), 80);
begin
  if length(v_nom) < 2 then raise exception 'Poné el nombre de tu negocio.'; end if;
  if length(regexp_replace(v_tel, '\D', '', 'g')) < 8 then raise exception 'Poné un teléfono de WhatsApp válido.'; end if;
  if (select count(*) from prospectos where origen = 'catalogo' and creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Hay demasiadas altas en este momento. Probá en un rato o escribinos por WhatsApp.'; end if;
  select id into v_id from prospectos where origen = 'catalogo' and regexp_replace(telefono, '\D', '', 'g') = regexp_replace(v_tel, '\D', '', 'g')
     and creado_en > now() - interval '30 days' order by creado_en desc limit 1;
  if v_id is null then
    insert into prospectos (nombre, telefono, domicilio, rubro, contacto, cuit, observaciones, estado, origen, proximo_seguimiento)
    values (v_nom, v_tel, nullif(left(trim(coalesce(p_domicilio, '')), 120), ''), nullif(left(trim(coalesce(p_rubro, '')), 40), ''),
            nullif(left(trim(coalesce(p_contacto, '')), 60), ''), nullif(left(trim(coalesce(p_cuit, '')), 20), ''),
            nullif(left(trim(coalesce(p_nota, '')), 300), ''), 'nuevo', 'catalogo', (now() at time zone 'America/Argentina/Buenos_Aires')::date)
    returning id into v_id;
  else
    update prospectos set domicilio = coalesce(nullif(left(trim(coalesce(p_domicilio, '')), 120), ''), domicilio),
                          rubro = coalesce(nullif(left(trim(coalesce(p_rubro, '')), 40), ''), rubro), actualizado_en = now()
     where id = v_id;
  end if;
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.auditar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into auditoria (tabla, registro_id, accion, datos_antes, datos_despues)
  values (
    tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'lista', to_jsonb(old)->>'lista'),
    tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $function$
;

CREATE OR REPLACE FUNCTION public.aumentar_costos(p_ids uuid[], p_pct numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  if p_pct is null or p_pct <= -90 or p_pct > 500 then raise exception 'Porcentaje fuera de rango'; end if;
  update productos set costo = round(costo * (1 + p_pct / 100), 2) where id = any(p_ids) and costo > 0;
  get diagnostics n = row_count;
  return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.auto_aprobar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c jsonb; v pedidos%rowtype; cl clientes%rowtype; v_min numeric; v_sal numeric; n int;
begin
  begin c := nullif((select valor from config_app where clave = 'auto_aprobar'), '')::jsonb; exception when others then c := null; end;
  if c is null or not coalesce((c->>'activa')::boolean, false) then return null; end if;
  select * into v from pedidos where id = new.id;
  if not found or v.estado::text <> 'pendiente' or coalesce(v.origen, '') <> 'online' or coalesce(v.total, 0) <= 0 then return null; end if;
  select * into cl from clientes where id = v.cliente_id;
  if not found or not coalesce(cl.activo, true) then return null; end if;
  begin v_min := nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric; exception when others then v_min := null; end;
  if v_min is not null and v.total < v_min then return null; end if;
  if coalesce((c->>'max')::numeric, 0) > 0 and v.total > (c->>'max')::numeric then return null; end if;
  if exists (select 1 from facturas_estado where cliente_id = v.cliente_id and pendiente > 0.005 and dias_mora > 0) then return null; end if;
  if coalesce(cl.limite_credito, 0) > 0 then
    select coalesce(saldo, 0) into v_sal from saldos_clientes where cliente_id = v.cliente_id;
    if coalesce(v_sal, 0) + v.total > cl.limite_credito then return null; end if;
  end if;
  select count(*) into n from pedidos where cliente_id = v.cliente_id and estado::text = 'entregado';
  if n < coalesce((c->>'min_pedidos')::int, 2) then return null; end if;
  update pedidos set estado = 'aprobado', auto_aprobado = true where id = v.id;
  return null;
exception when others then
  return null;  -- ante cualquier duda, el pedido queda por aprobar
end $function$
;

CREATE OR REPLACE FUNCTION public.borrar_datos_prueba(p_confirma text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tabs text[] := array[
    'recibo_imputaciones','recibos','notas_credito','facturas_venta','pedido_items','pedidos',
    'movimientos_stock','vencimientos','mermas','fraccionados','reservas','preventas',
    'ordenes_compra_items','recepciones','ordenes_compra','pagos_proveedor','facturas_proveedor',
    'gastos','cierres_caja','movimientos_cuenta','cheques','retenciones','avisos_deuda',
    'cupones_usos','puntos_mov','presupuestos','carritos','avisos_stock','busquedas',
    'vistas_catalogo','reclamos','encuestas','promesas_pago','pendientes_cliente',
    'repartos_dia','comprobantes_cliente','cargas_combustible','envios_auto','cola_impresion'];
  pend text[]; t text; avanzo boolean; vuelta int := 0; res jsonb := '{}'::jsonb; n bigint; err text := '';
  r record;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede borrar los datos de prueba.'; end if;
  if coalesce(p_confirma, '') <> 'BORRAR' then raise exception 'Falta confirmar escribiendo BORRAR.'; end if;
  select array_agg(x) into pend from unnest(tabs) x
   where exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                  where s.nspname = 'public' and c.relname = x and c.relkind = 'r');
  pend := coalesce(pend, '{}');
  loop
    vuelta := vuelta + 1; avanzo := false;
    foreach t in array pend loop
      begin
        execute format('delete from public.%I where true', t);
        get diagnostics n = row_count;
        res := res || jsonb_build_object(t, n);
        pend := array_remove(pend, t); avanzo := true;
      exception when foreign_key_violation then err := sqlerrm;
      end;
    end loop;
    exit when cardinality(pend) = 0 or not avanzo or vuelta > 12;
  end loop;
  if cardinality(pend) > 0 then
    raise exception 'No se pudo borrar (no se tocó nada): % — %', array_to_string(pend, ', '), err;
  end if;
  foreach t in array tabs loop
    begin
      if to_regclass('public.' || t) is not null then execute format('delete from public.%I where true', t); end if;
    exception when others then null;
    end;
  end loop;
  for r in
    select c.table_name, c.column_name, c.column_default
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = any(tabs)
       and (c.column_default like 'nextval(%' or c.is_identity = 'YES')
  loop
    begin
      t := coalesce(pg_get_serial_sequence('public.' || quote_ident(r.table_name), r.column_name),
                    substring(r.column_default from $re$nextval\('([^']+)'$re$));
      if t is not null then perform setval(t, 1, false); end if;
    exception when others then null;
    end;
  end loop;
  begin
    if exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                where s.nspname = 'public' and c.relname = 'stock' and c.relkind = 'r') then
      execute 'update public.stock set fisico = 0, reservado = 0 where true';
    end if;
  exception when others then null;
  end;
  insert into config_app (clave, valor) values ('datos_prueba_borrados', now()::text)
  on conflict (clave) do update set valor = excluded.valor;
  return res;
end $function$
;

CREATE OR REPLACE FUNCTION public.cancelar_pedido_cliente(p_token text, p_numero bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o pedidos%rowtype;
begin
  o := pedido_editable_cliente(p_token, p_numero);
  perform devolver_beneficios(o.id);
  update pedidos set estado = 'cancelado',
         observaciones = concat_ws(' · ', nullif(observaciones, ''), '❌ Cancelado por el cliente')
   where id = o.id;
  return jsonb_build_object('ok', true, 'numero', o.numero);
end $function$
;

CREATE OR REPLACE FUNCTION public.catalogo_cliente(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; v_lista text; v_ult jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  v_lista := coalesce(v.lista::text, 'mayorista');
  select coalesce(jsonb_agg(i), '[]'::jsonb) into v_ult from (
    select jsonb_build_object('id', i.producto_id, 'q', i.cantidad) i from pedido_items i
     where i.pedido_id = (select id from pedidos where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 1)) x;
  return jsonb_build_object('cliente', v.razon_social, 'lista', v_lista, 'productos', productos_catalogo(v_lista), 'ultimo', v_ult,
    'promos', promos_catalogo(v_lista),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa')) || extras_catalogo(v_lista);
end $function$
;

CREATE OR REPLACE FUNCTION public.catalogo_extra()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_top jsonb := '[]'::jsonb; v_pocas jsonb := '[]'::jsonb;
begin
  begin
    select coalesce(jsonb_agg(pid order by n desc), '[]'::jsonb) into v_top from (
      select i.producto_id::text pid, count(distinct p.cliente_id) * 10 + count(*) n
        from pedido_items i join pedidos p on p.id = i.pedido_id
       where p.estado::text <> 'cancelado' and p.creado_en > now() - interval '45 days'
       group by 1 order by 2 desc limit 15) t;
  exception when others then v_top := '[]'::jsonb; end;
  begin
    select coalesce(jsonb_agg(pid), '[]'::jsonb) into v_pocas from (
      select s.producto_id::text pid
        from stock s join productos pr on pr.id = s.producto_id
       where coalesce((to_jsonb(pr)->>'activo')::boolean, true)
       group by s.producto_id, pr.id
      having sum(s.disponible) > 0
         and sum(s.disponible) <= greatest(coalesce((to_jsonb(pr)->>'stock_minimo')::numeric, 0), 3)
       limit 80) t;
  exception when others then v_pocas := '[]'::jsonb; end;
  return jsonb_build_object('top', v_top, 'pocas', v_pocas);
end $function$
;

CREATE OR REPLACE FUNCTION public.catalogo_publico(p_ref text DEFAULT NULL::text, p_rubro text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_lista text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then
    raise exception 'El catálogo no está disponible en este momento.';
  end if;
  return jsonb_build_object('cliente', null, 'lista', v_lista, 'productos', productos_para(v_lista, null), 'ultimo', '[]'::jsonb,
    'promos', promos_catalogo(v_lista), 'publico', true,
    'ref_nombre', (select razon_social from clientes where codigo_ref = upper(trim(p_ref)) and coalesce(activo, true)),
    'rubro', nullif(left(trim(coalesce(p_rubro, '')), 40), ''),
    'surt', case when coalesce(trim(p_rubro), '') <> '' then surtido_rubro(p_rubro) else '[]'::jsonb end,
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'mp',  (select valor from config_app where clave = 'link_mp')) || extras_catalogo(v_lista) - 'desafio';
end $function$
;

CREATE OR REPLACE FUNCTION public.cfg_num(p_clave text, p_def numeric)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(nullif((select valor from config_app where clave = p_clave), '')::numeric, p_def)
$function$
;

CREATE OR REPLACE FUNCTION public.compras_mes(p_cliente uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(total), 0) from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado'
     and to_char(creado_en at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') = to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM')
$function$
;

CREATE OR REPLACE FUNCTION public.comprobante_cliente(p_token text, p_numero bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; o pedidos%rowtype;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where cliente_id = v.id and numero = p_numero;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  return jsonb_build_object('numero', o.numero, 'fecha', o.creado_en, 'estado', o.estado, 'total', o.total,
    'cliente', v.razon_social, 'cuit', v.cuit, 'domicilio', v.domicilio,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('d', coalesce(pp.descripcion, 'Producto'), 'q', i.cantidad, 'pu', i.precio_unitario, 'promo', i.promo) order by pp.descripcion), '[]'::jsonb)
                from pedido_items i left join precios_productos pp on pp.producto_id = i.producto_id where i.pedido_id = o.id));
end $function$
;

CREATE OR REPLACE FUNCTION public.contar_stock(p_items jsonb, p_motivo text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare x jsonb; n int := 0;
begin
  for x in select * from jsonb_array_elements(p_items) loop
    if x->>'contado' is not null and x->>'contado' <> '' then
      perform ajustar_stock((x->>'id')::uuid, (x->>'contado')::numeric, coalesce(nullif(p_motivo,''), 'Conteo de inventario'));
      update productos set ultimo_conteo = (now() at time zone 'America/Argentina/Buenos_Aires')::date where id = (x->>'id')::uuid;
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.corregir_pedido_cliente(p_token text, p_numero bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; o pedidos%rowtype; it jsonb;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where numero = p_numero and cliente_id = v_id;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  if o.estado::text <> 'pendiente' then raise exception 'Este pedido ya lo estamos preparando: escribinos por WhatsApp para cambiarlo.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', producto_id::text, 'q', cantidad)), '[]'::jsonb) into it from pedido_items where pedido_id = o.id;
  update pedidos set estado = 'cancelado', observaciones = concat_ws(' · ', nullif(observaciones, ''), 'Cancelado por el cliente para corregirlo') where id = o.id;
  return jsonb_build_object('items', it, 'nota', o.observaciones);
end $function$
;

CREATE OR REPLACE FUNCTION public.crear_grupo(p_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; c text; i int;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '' and coalesce(activo, true);
  if not found then raise exception 'Este link no es válido.'; end if;
  select codigo into c from grupos_pedido where creador = v.id::text and vence > now() order by creado_en desc limit 1;
  if c is not null then return c; end if;
  for i in 1 .. 20 loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    begin insert into grupos_pedido (codigo, creador) values (c, v.id::text); return c;
    exception when unique_violation then null; end;
  end loop;
  raise exception 'No se pudo crear el grupo. Probá de nuevo.';
end $function$
;

CREATE OR REPLACE FUNCTION public.crear_pedido_cliente(p_token text, p_items jsonb, p_nota text DEFAULT NULL::text, p_cupon text DEFAULT NULL::text, p_puntos boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; vj jsonb; v_lista text; v_ped record; v_n int; v_total numeric; v_vend uuid;
        v_it jsonb; v_sub numeric; v_esc numeric := 0; v_min numeric; e jsonb; v_cup numeric := 0; v_base numeric;
        v_ptos int := 0; v_canje numeric := 0; v_fac numeric; v_vp numeric; v_niv jsonb; v_npct numeric := 0;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  if jsonb_array_length(p_items) > 300 then raise exception 'El pedido tiene demasiados productos.'; end if;
  if (select count(*) from pedidos where cliente_id = v.id and origen = 'online' and estado::text = 'pendiente') >= 10 then
    raise exception 'Ya tenés varios pedidos esperando aprobación. Esperá a que los revisemos.'; end if;
  vj := to_jsonb(v);
  v_lista := coalesce(v.lista::text, 'mayorista');

  with base as (
    select pp.producto_id pid, pc.precio is not null pac, case when coalesce(px.solo_bulto, false) and px.unidades_bulto > 1 then px.unidades_bulto else 1 end mb,
           coalesce(pc.precio, case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end) precio
      from precios_productos pp left join precios_cliente pc on pc.producto_id = pp.producto_id and pc.cliente_id = v.id
      left join productos px on px.id = pp.producto_id
     where pp.costo > 0),
  sueltos as (
    select b.pid, b.pac, ceil(least(greatest(round((j->>'q')::numeric), 1), 100000) / b.mb) * b.mb q, b.precio
      from jsonb_array_elements(p_items) j join base b on b.pid::text = j->>'id'
     where (j->>'q')::numeric >= 1),
  lineas as (
    select s.pid, s.q, round(s.precio * (1 - coalesce(case when not s.pac then mp.pct end, 0) / 100), 2) pu,
           case when s.pac then 'Precio pactado' when mp.pct is not null then mp.nombre end promo
      from sueltos s left join lateral mejor_promo(s.pid, v_lista, s.q) mp on true
    union all
    select b.pid, (ci->>'q')::numeric * least(greatest(round((j->>'q')::numeric), 1), 1000), round(b.precio * (1 - c.descuento_pct / 100), 2),
           case when c.nombre ilike 'combo%' then c.nombre else 'Combo ' || c.nombre end
      from jsonb_array_elements(p_items) j
      join combos c on 'combo:' || c.id = j->>'id' and c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)
                   and (not coalesce(c.solo_nuevos, false) or not exists (select 1 from pedidos px2 where px2.cliente_id = v.id and px2.estado::text <> 'cancelado'))
      cross join jsonb_array_elements(c.items) ci
      join base b on b.pid::text = ci->>'id'
     where (j->>'q')::numeric >= 1)
  select jsonb_agg(jsonb_build_object('pid', pid, 'q', q, 'pu', round(t / q, 2), 'promo', promo)) into v_it
    from (select pid, sum(q) q, sum(q * pu) t, string_agg(distinct promo, ' + ') promo from lineas group by pid) z;

  if v_it is null then raise exception 'Ninguno de los productos está disponible.'; end if;
  select sum((x->>'q')::numeric * (x->>'pu')::numeric) into v_sub from jsonb_array_elements(v_it) x;
  v_min := nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric;
  if v_min is not null and v_sub < v_min then
    raise exception 'El pedido mínimo es de $ %. Te faltan $ %.', to_char(v_min, 'FM999G999G990'), to_char(v_min - v_sub, 'FM999G999G990'); end if;
  for e in select * from jsonb_array_elements(coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb)) loop
    if v_sub >= (e->>'desde')::numeric and (e->>'pct')::numeric > v_esc then v_esc := (e->>'pct')::numeric; end if;
  end loop;
  v_base := v_sub * (1 - v_esc / 100);
  v_niv := nivel_cliente(v.id); v_npct := coalesce((v_niv->>'pct')::numeric, 0);
  v_base := v_base * (1 - v_npct / 100);
  v_cup := cupon_pct(p_cupon, v.id, v_base);
  v_base := v_base * (1 - v_cup / 100);
  if p_puntos and puntos_activos() then
    v_vp := cfg_num('valor_punto', 10);
    v_canje := least(puntos_saldo(v.id) * v_vp, v_base * cfg_num('canje_max_pct', 20) / 100);
    v_ptos := floor(v_canje / v_vp); v_canje := v_ptos * v_vp;
  end if;
  v_fac := (1 - v_esc / 100) * (1 - v_npct / 100) * (1 - v_cup / 100) * (case when v_base > 0 then 1 - v_canje / v_base else 1 end);

  v_vend := coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
  insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen)
  values (v.id, v_vend, v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'online')
  returning id, numero into v_ped;
  insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
  select v_ped.id, (x->>'pid')::uuid, (x->>'q')::numeric, round((x->>'pu')::numeric * v_fac, 2),
         nullif(concat_ws(' + ', x->>'promo',
           case when v_esc > 0 then 'Descuento por monto ' || trim_scale(v_esc) || ' %' end,
           case when v_npct > 0 then 'Nivel ' || (v_niv->>'n') || ' ' || trim_scale(v_npct) || ' %' end,
           case when v_cup > 0 then 'Cupón ' || upper(trim(p_cupon)) || ' ' || trim_scale(v_cup) || ' %' end,
           case when v_ptos > 0 then 'Canje de ' || v_ptos || ' puntos' end), '')
    from jsonb_array_elements(v_it) x;
  get diagnostics v_n = row_count;
  if v_cup > 0 then insert into cupones_usos (codigo, cliente_id, pedido_id) values (upper(trim(p_cupon)), v.id, v_ped.id); end if;
  if v_ptos > 0 then insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (v.id, -v_ptos, 'Canje en pedido N° ' || v_ped.numero, v_ped.id); end if;
  if nullif(trim(coalesce(p_nota,'')),'') is not null then
    update pedidos set observaciones = left(trim(p_nota), 500) where id = v_ped.id;
  end if;
  delete from carritos where cliente_id = v.id;
  select total into v_total from pedidos where id = v_ped.id;
  return jsonb_build_object('numero', v_ped.numero, 'total', v_total, 'productos', v_n, 'descuento', v_esc, 'cupon', v_cup, 'puntos', v_ptos, 'nivel', v_npct);
end $function$
;

CREATE OR REPLACE FUNCTION public.crear_pedido_grupo(p_token text, p_items jsonb, p_grupo text, p_nota text DEFAULT NULL::text, p_cupon text DEFAULT NULL::text, p_puntos boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; g grupos_pedido%rowtype; v_old text; v_min numeric; r jsonb; o numeric; n int;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '' and coalesce(activo, true);
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into g from grupos_pedido where codigo = upper(trim(p_grupo));
  if not found or g.vence < now() then raise exception 'El grupo no existe o ya venció.'; end if;
  select coalesce(sum(total), 0), count(distinct cliente_id) into o, n from pedidos
   where grupo = g.codigo and cliente_id <> v.id and estado::text in ('pendiente', 'aprobado', 'en_preparacion', 'listo');
  select valor into v_old from config_app where clave = 'pedido_minimo';
  v_min := nullif(v_old, '')::numeric;
  if v_old is not null then update config_app set valor = '' where clave = 'pedido_minimo'; end if;
  r := crear_pedido_cliente(p_token, p_items, coalesce(nullif(trim(p_nota), '') || ' · ', '') || '🤝 Pedido en grupo ' || g.codigo, p_cupon, p_puntos);
  if v_old is not null then update config_app set valor = v_old where clave = 'pedido_minimo'; end if;
  if v_min is not null and o + coalesce((r->>'total')::numeric, 0) < v_min and not (g.creador = v.id::text and n = 0) then
    raise exception 'Entre todos todavía no llegan al mínimo de $ %. Les faltan $ %.', to_char(v_min, 'FM999G999G990'), to_char(v_min - o - (r->>'total')::numeric, 'FM999G999G990');
  end if;
  update pedidos set grupo = g.codigo where numero = (r->>'numero')::bigint;
  update grupos_pedido set vence = greatest(vence, now() + interval '1 day') where codigo = g.codigo;
  return r || jsonb_build_object('grupo', g.codigo, 'grupo_total', o + coalesce((r->>'total')::numeric, 0));
end $function$
;

CREATE OR REPLACE FUNCTION public.crear_perfil_nuevo_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email));
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.crear_reclamo(p_token text, p_numero bigint, p_tipo text, p_detalle text DEFAULT NULL::text, p_foto text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_r bigint;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if (select count(*) from reclamos where cliente_id = v_id and creado_en > now() - interval '1 day') >= 10 then raise exception 'Ya mandaste varios reclamos hoy. Escribinos por WhatsApp.'; end if;
  if p_foto is not null and (length(p_foto) > 700000 or p_foto not like 'data:image/%') then p_foto := null; end if;
  insert into reclamos (cliente_id, pedido_numero, tipo, detalle, foto)
  values (v_id, p_numero, left(coalesce(nullif(trim(p_tipo), ''), 'Otro'), 60), nullif(left(trim(coalesce(p_detalle, '')), 800), ''), p_foto)
  returning id into v_r;
  return jsonb_build_object('ok', true, 'id', v_r);
end $function$
;

CREATE OR REPLACE FUNCTION public.crm_snapshot_fefo_delivery_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_raw jsonb := '[]'::jsonb;
  v_new_raw jsonb := '[]'::jsonb;
  v_old_arr jsonb := '[]'::jsonb;
  v_new_arr jsonb := '[]'::jsonb;
  v_new_entry jsonb;
  v_old_entry jsonb;
  v_order_id text;
  v_new_state text;
  v_old_state text;
begin
  begin v_old_raw := coalesce((old.payload->'localData'->>'sdmp_pipeline_v1')::jsonb,'[]'::jsonb); exception when others then v_old_raw := '[]'::jsonb; end;
  begin v_new_raw := coalesce((new.payload->'localData'->>'sdmp_pipeline_v1')::jsonb,'[]'::jsonb); exception when others then v_new_raw := '[]'::jsonb; end;

  if jsonb_typeof(v_old_raw)='array' then v_old_arr:=v_old_raw;
  elsif jsonb_typeof(v_old_raw)='object' then select coalesce(jsonb_agg(value),'[]'::jsonb) into v_old_arr from jsonb_each(v_old_raw);
  end if;
  if jsonb_typeof(v_new_raw)='array' then v_new_arr:=v_new_raw;
  elsif jsonb_typeof(v_new_raw)='object' then select coalesce(jsonb_agg(value),'[]'::jsonb) into v_new_arr from jsonb_each(v_new_raw);
  else return new; end if;

  for v_new_entry in select value from jsonb_array_elements(v_new_arr) loop
    v_order_id := coalesce(v_new_entry->>'id',v_new_entry->>'pedido');
    if v_order_id is null then continue; end if;
    select value into v_old_entry from jsonb_array_elements(v_old_arr) where coalesce(value->>'id',value->>'pedido')=v_order_id limit 1;
    v_new_state := upper(coalesce(v_new_entry->>'estado',''));
    v_old_state := upper(coalesce(v_old_entry->>'estado',''));

    -- La salida física ocurre al pasar a ENTREGADO. FACTURADO solo completa
    -- una entrega que ya venía marcada como entregada, evitando facturas anticipadas.
    if (v_new_state='ENTREGADO' and v_old_state<>'ENTREGADO')
       or (v_new_state='FACTURADO' and v_old_state='ENTREGADO') then
      perform public.exit_fefo_for_delivered_order(new.organization_id,v_order_id,new.payload);
    end if;
  end loop;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_snapshot_fefo_reserve_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_note jsonb;
  v_old_notes jsonb := coalesce(old.payload->'arrays'->'NOTAS_PEDIDO','[]'::jsonb);
begin
  for v_note in
    select value
    from jsonb_array_elements(coalesce(new.payload->'arrays'->'NOTAS_PEDIDO','[]'::jsonb))
  loop
    -- Se considera nueva nota si su numero/pedido no existía en el snapshot anterior.
    if not exists (
      select 1
      from jsonb_array_elements(v_old_notes) o
      where coalesce(o->>'numero','') = coalesce(v_note->>'numero','')
         or (v_note ? 'pedido' and o->>'pedido' = v_note->>'pedido')
    ) then
      perform public.reserve_fefo_for_order_note(new.organization_id, v_note);
    end if;
  end loop;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cuenta_cliente(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; v_fac jsonb; v_pag jsonb; v_pm jsonb; d jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found or coalesce(p_token,'') = '' then raise exception 'Este link no es válido. Pedile uno nuevo a Sabores de mi País.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', tipo, 'n', numero, 'f', fecha, 'v', vencimiento, 'tot', total, 'p', pendiente, 'dm', dias_mora) order by vencimiento), '[]'::jsonb)
    into v_fac from facturas_estado where cliente_id = v.id and pendiente > 0.005;
  select coalesce(jsonb_agg(x order by (x->>'n')::bigint desc), '[]'::jsonb) into v_pag from (
    select jsonb_build_object('n', numero, 'f', fecha, 'i', importe, 'm', medio) x from recibos
     where cliente_id = v.id and not coalesce(anulado, false) order by numero desc limit 15) r;
  select coalesce(jsonb_agg(x order by x->>'f' desc), '[]'::jsonb) into v_pm from (
    select jsonb_build_object('f', fecha, 'p', puntos, 'm', motivo) x from puntos_mov where cliente_id = v.id order by fecha desc limit 12) r;
  d := desafio_mes();
  if d is not null then
    d := d || jsonb_build_object('llevas', compras_mes(v.id), 'logrado', exists (select 1 from puntos_mov where cliente_id = v.id and motivo = 'Desafío ' || (d->>'mes')));
  end if;
  return jsonb_build_object('cliente', v.razon_social,
    'saldo', coalesce((select saldo from saldos_clientes where cliente_id = v.id), 0),
    'vencido', coalesce((select sum(pendiente) from facturas_estado where cliente_id = v.id and pendiente > 0.005 and dias_mora > 0), 0),
    'facturas', v_fac, 'pagos', v_pag,
    'puntos', puntos_saldo(v.id), 'puntos_mov', v_pm, 'puntos_activo', puntos_activos(),
    'valor_punto', cfg_num('valor_punto', 10), 'puntos_cada', cfg_num('puntos_cada', 1000), 'referido_puntos', cfg_num('referido_puntos', 500),
    'ref', v.codigo_ref, 'referidos', (select count(*) from clientes where referido_por = v.id),
    'desafio', d,
    'sorteo', (select s || jsonb_build_object('llevas', compras_mes(v.id), 'numeros', floor(compras_mes(v.id) / greatest((s->>'cada')::numeric, 1)))
                 from (select sorteo_mes() s) z where s is not null),
    'nivel', nivel_cliente(v.id),
    'pedidos', (select coalesce(jsonb_agg(x order by (x->>'n')::bigint desc), '[]'::jsonb) from (
       select jsonb_build_object('n', numero, 'f', creado_en, 'e', estado, 't', total, 'ent', entregado_en) x from pedidos
        where cliente_id = v.id and estado::text <> 'cancelado' order by numero desc limit 8) z),
    'reclamos', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', pedido_numero, 'tipo', tipo, 'e', estado, 'r', respuesta, 'f', creado_en) order by id desc), '[]'::jsonb)
                   from (select * from reclamos where cliente_id = v.id order by id desc limit 5) r),
    'pronto', nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb,
    'fijo', (select jsonb_build_object('dias', dias, 'items', items, 'activo', activo) from pedidos_fijos where cliente_id = v.id),
    'mp',   (select valor from config_app where clave = 'link_mp'),
    'pago', (select valor from config_app where clave = 'datos_pago'),
    'tel',  (select valor from config_app where clave = 'telefono_empresa'));
end $function$
;

CREATE OR REPLACE FUNCTION public.cupo_promos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(new.promo, '') = '' then return new; end if;
  update promociones p set usados = (
      select count(distinct i.pedido_id) from pedido_items i join pedidos o on o.id = i.pedido_id
       where o.estado::text <> 'cancelado' and o.creado_en >= p.creado_en and i.promo ilike '%' || p.nombre || '%')
   where p.cupo is not null and p.activa and new.promo ilike '%' || p.nombre || '%';
  update promociones set activa = false where cupo is not null and activa and usados >= cupo;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.cupon_pct(p_codigo text, p_cliente uuid, p_monto numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c cupones%rowtype;
begin
  if coalesce(trim(p_codigo), '') = '' then return 0; end if;
  select * into c from cupones where codigo = upper(trim(p_codigo));
  if not found or not c.activo then raise exception 'El cupón % no existe.', upper(trim(p_codigo)); end if;
  if c.cliente_id is not null and c.cliente_id is distinct from p_cliente then raise exception 'El cupón % es personal de otro cliente.', c.codigo; end if;
  if c.hasta is not null and c.hasta < current_date then raise exception 'El cupón % ya venció.', c.codigo; end if;
  if c.usos_max is not null and (select count(*) from cupones_usos where codigo = c.codigo) >= c.usos_max then raise exception 'El cupón % ya se usó todas las veces permitidas.', c.codigo; end if;
  if p_cliente is not null and c.cliente_id is null and exists (select 1 from cupones_usos where codigo = c.codigo and cliente_id = p_cliente) then raise exception 'Ya usaste el cupón %.', c.codigo; end if;
  if c.solo_nuevos and p_cliente is not null and exists (select 1 from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado') then
    raise exception 'El cupón % es solo para la primera compra.', c.codigo; end if;
  if c.minimo is not null and p_monto is not null and p_monto < c.minimo then raise exception 'El cupón % es para compras desde $ %.', c.codigo, to_char(c.minimo, 'FM999G999G990'); end if;
  return c.descuento_pct;
end $function$
;

CREATE OR REPLACE FUNCTION public.desafio_mes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d from (select nullif((select valor from config_app where clave = 'desafio'), '')::jsonb d) z
   where d->>'mes' = to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') and coalesce((d->>'meta')::numeric, 0) > 0
$function$
;

CREATE OR REPLACE FUNCTION public.descuento_pronto_pago(p_factura uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d jsonb; f record; v_d numeric; v_num bigint; v_rec bigint; v_bruto numeric; v_items jsonb;
begin
  d := nullif((select valor from config_app where clave = 'pronto_pago'), '')::jsonb;
  if d is null or coalesce((d->>'pct')::numeric, 0) <= 0 then raise exception 'El descuento por pronto pago no está configurado.'; end if;
  select fe.factura_id, fe.cliente_id, fe.pendiente, fv.fecha, fv.pedido_id, fv.tipo, fv.numero into f
    from facturas_estado fe join facturas_venta fv on fv.id = fe.factura_id where fe.factura_id = p_factura;
  if not found or f.pendiente <= 0.005 then raise exception 'La factura no tiene saldo pendiente.'; end if;
  if (now() at time zone 'America/Argentina/Buenos_Aires')::date > f.fecha + coalesce((d->>'dias')::int, 7) then
    raise exception 'Ya pasó el plazo de pronto pago de esta factura.'; end if;
  if exists (select 1 from notas_credito where motivo = 'Pronto pago · factura ' || f.tipo || ' ' || f.numero) then
    raise exception 'Esta factura ya tuvo el descuento por pronto pago.'; end if;
  v_d := round(f.pendiente * (d->>'pct')::numeric / 100, 2);
  -- Detalle proporcional a los productos del pedido, así el IVA de la nota de crédito queda bien
  select sum(cantidad * precio_unitario) into v_bruto from pedido_items where pedido_id = f.pedido_id;
  select coalesce(jsonb_agg(jsonb_build_object('id', producto_id, 'q', round(cantidad * v_d / v_bruto, 6), 'pu', precio_unitario, 'cu', 0)), '[]'::jsonb)
    into v_items from pedido_items where pedido_id = f.pedido_id and v_bruto > 0;
  perform pg_advisory_xact_lock(424242);
  select coalesce(max(numero), 0) + 1 into v_num from notas_credito;
  v_rec := registrar_cobranza(p_cliente => f.cliente_id, p_importe => v_d, p_medio => 'otro',
                              p_imputaciones => jsonb_build_array(jsonb_build_object('factura_id', f.factura_id, 'importe', v_d)));
  update recibos set observacion = 'Nota de crédito N° ' || v_num || ' · pronto pago' where numero = v_rec;
  insert into notas_credito (numero, cliente_id, pedido_id, total, motivo, repuesto, items, recibo_numero)
  values (v_num, f.cliente_id, f.pedido_id, v_d, 'Pronto pago · factura ' || f.tipo || ' ' || f.numero, false, v_items, v_rec);
  return jsonb_build_object('numero', v_num, 'descuento', v_d, 'resta', f.pendiente - v_d);
end $function$
;

CREATE OR REPLACE FUNCTION public.devolver_beneficios(p_pedido uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin delete from puntos_mov where pedido_id = p_pedido and puntos < 0; exception when others then null; end;
  begin delete from cupones_usos where pedido_id = p_pedido; exception when others then null; end;
end $function$
;

CREATE OR REPLACE FUNCTION public.encuesta_responder(p_token text, p_puntaje integer, p_comentario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_puntaje is null or p_puntaje < 1 or p_puntaje > 5 then raise exception 'Elegí de 1 a 5 estrellas.'; end if;
  update encuestas set puntaje = p_puntaje, comentario = nullif(left(trim(coalesce(p_comentario, '')), 600), ''), respondida_en = now(),
         atendida = p_puntaje >= 4
   where token = p_token;
  if not found then raise exception 'Esta encuesta no existe.'; end if;
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.encuesta_ver(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('cliente', c.razon_social, 'pedido', p.numero, 'puntaje', e.puntaje)
    from encuestas e left join clientes c on c.id = e.cliente_id left join pedidos p on p.id = e.pedido_id where e.token = p_token
$function$
;

CREATE OR REPLACE FUNCTION public.entrega_cliente(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; z jsonb; f jsonb; k text; zr jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then return '{}'::jsonb; end if;
  begin z := nullif((select valor from config_app where clave = 'zonas_reparto'), '')::jsonb; exception when others then z := null; end;
  begin f := nullif((select valor from config_app where clave = 'feriados'), '')::jsonb; exception when others then f := null; end;
  if z is not null then
    for k in select jsonb_object_keys(z) loop
      if lower(k) = lower(zona_de(v.ciudad)) then zr := z -> k; end if;
    end loop;
  end if;
  return jsonb_build_object(
    'zona', zona_de(v.ciudad),
    'dias', coalesce(zr -> 'dias', '[]'::jsonb),
    'minimo', coalesce((zr ->> 'minimo')::numeric, 0),
    'feriados', coalesce((select jsonb_agg(x ->> 'f') from jsonb_array_elements(case when jsonb_typeof(f) = 'array' then f when jsonb_typeof(f -> 'l') = 'array' then f -> 'l' else '[]'::jsonb end) x where (x ->> 'f')::date >= current_date), '[]'::jsonb));
end $function$
;

CREATE OR REPLACE FUNCTION public.es_dueno()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from perfiles where id = auth.uid() and rol::text = 'dueno' and activo)
$function$
;

CREATE OR REPLACE FUNCTION public.es_usuario_activo()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from perfiles where id = auth.uid() and activo)
$function$
;

CREATE OR REPLACE FUNCTION public.estado_sistema()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare v_db bigint; v_st bigint := 0; v_n bigint := 0;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede ver el estado del sistema.'; end if;
  v_db := pg_database_size(current_database());
  begin
    select coalesce(sum((metadata->>'size')::bigint), 0), count(*) into v_st, v_n from storage.objects;
  exception when others then v_st := null; end;
  return jsonb_build_object('db_bytes', v_db, 'archivos_bytes', v_st, 'archivos', v_n,
    'clientes', (select count(*) from clientes), 'pedidos', (select count(*) from pedidos));
end $function$
;

CREATE OR REPLACE FUNCTION public.estrategia_cliente(p_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; r jsonb; l jsonb; lg jsonb; ac jsonb; mc jsonb; ck jsonb; po jsonb;
        ini timestamptz := date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires';
begin
  r := jsonb_build_object('cupos', (select coalesce(jsonb_object_agg(nombre, greatest(cupo - usados, 0)), '{}'::jsonb) from promociones
                                     where cupo is not null and activa and (hasta is null or hasta >= current_date)),
    'social', (select coalesce(jsonb_object_agg(pid, n), '{}'::jsonb) from (
        select i.producto_id::text pid, count(distinct o.cliente_id) n from pedido_items i join pedidos o on o.id = i.pedido_id
         where o.creado_en > now() - interval '7 days' and o.estado::text <> 'cancelado' group by 1 having count(distinct o.cliente_id) >= 3) z));
  begin ck := nullif((select valor from config_app where clave = 'oferta_checkout'), '')::jsonb; exception when others then ck := null; end;
  if ck is not null and coalesce((ck->>'activa')::boolean, false) and (ck->>'hasta' is null or (ck->>'hasta')::date >= current_date) then r := r || jsonb_build_object('checkout', ck); end if;
  begin po := nullif((select valor from config_app where clave = 'premio_online'), '')::jsonb; exception when others then po := null; end;
  if po is not null and coalesce((po->>'activa')::boolean, false) then r := r || jsonb_build_object('premio', po); end if;
  if coalesce(p_token, '') = '' then return r; end if;
  select * into v from clientes where token_pedidos = p_token and coalesce(activo, true);
  if not found then return r; end if;
  begin l := nullif((select valor from config_app where clave = 'liga'), '')::jsonb; exception when others then l := null; end;
  if l is not null and coalesce((l->>'activa')::boolean, false) and coalesce(trim(v.rubro), '') <> '' then
    with t as (
      select c.id, coalesce((select sum(o.total) from pedidos o where o.cliente_id = c.id and o.estado::text <> 'cancelado' and o.creado_en >= ini), 0) tot
        from clientes c where coalesce(c.activo, true) and lower(trim(c.rubro)) = lower(trim(v.rubro))),
    rk as (select id, tot, rank() over (order by tot desc) pos, count(*) over () n from t)
    select jsonb_build_object('rubro', v.rubro, 'pos', pos, 'total', n, 'tot', tot,
             'falta', (select min(t2.tot) from rk t2 where t2.tot > rk.tot) - tot + 1, 'premios', l->'premios')
      into lg from rk where id = v.id;
  end if;
  select jsonb_build_object('monto', a.monto_mes, 'tipo', a.tipo, 'pct', a.pct,
           'lleva', (select coalesce(sum(total), 0) from pedidos where cliente_id = v.id and estado::text <> 'cancelado' and creado_en >= ini))
    into ac from acuerdos a where a.cliente_id = v.id and a.activo and (a.hasta is null or a.hasta >= current_date) order by a.id desc limit 1;
  select jsonb_build_object('codigo', codigo, 'pct', descuento_pct, 'minimo', minimo, 'items', case when nota like '[%' then nota::jsonb else '[]'::jsonb end)
    into mc from cupones where cliente_id = v.id and codigo like 'MICOMBO-%' and activo and (hasta is null or hasta >= current_date) order by creado_en desc limit 1;
  return r || jsonb_build_object('liga', lg, 'acuerdo', ac, 'micombo', mc,
    'alertas', (select coalesce(jsonb_agg(producto_id::text), '[]'::jsonb) from alertas_oferta where cliente_id = v.id and avisado_en is null),
    'toprubro', case when coalesce(trim(v.rubro), '') = '' then '[]'::jsonb else (select coalesce(jsonb_agg(pid), '[]'::jsonb) from (
        select i.producto_id::text pid from pedido_items i join pedidos o on o.id = i.pedido_id join clientes c on c.id = o.cliente_id
         where lower(trim(c.rubro)) = lower(trim(v.rubro)) and o.creado_en > now() - interval '30 days' and o.estado::text <> 'cancelado'
         group by 1 having count(distinct o.cliente_id) >= 3 order by count(distinct o.cliente_id) desc limit 8) z) end);
end $function$
;

CREATE OR REPLACE FUNCTION public.exit_fefo_for_delivered_order(p_org uuid, p_order_id text, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_note jsonb;
  v_remito jsonb;
  v_np text;
  v_r text;
  v_item jsonb;
  v_code text;
  v_qty numeric;
  v_remaining numeric;
  v_take numeric;
  v_res record;
begin
  if p_org is null or p_order_id is null or p_payload is null then return; end if;

  select n.value into v_note
  from jsonb_array_elements(coalesce(p_payload->'arrays'->'NOTAS_PEDIDO','[]'::jsonb)) n(value)
  where n.value->>'pedido'=p_order_id limit 1;
  if v_note is null then return; end if;

  v_np := coalesce(nullif(v_note->>'numero',''),p_order_id);
  select r.value into v_remito
  from jsonb_array_elements(coalesce(p_payload->'arrays'->'REMITOS_CRM','[]'::jsonb)) r(value)
  where r.value->>'pedido'=p_order_id limit 1;
  v_r := coalesce(nullif(v_remito->>'numero',''),'PEDIDO-'||p_order_id);

  if exists (
    select 1 from public.inventory_lot_movements m
    where m.organization_id=p_org and m.movement_type='EXIT' and m.reference=v_r
  ) then return; end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(v_note->'items','[]'::jsonb))
  loop
    v_code := nullif(trim(v_item->>'codigo'),'');
    v_qty := coalesce((v_item->>'cantidad')::numeric,0);
    if v_code is null or v_qty <= 0 then continue; end if;

    v_remaining := v_qty;
    for v_res in
      select m.lot_id,m.quantity,
        greatest(
          m.quantity-coalesce((
            select sum(x.quantity)
            from public.inventory_lot_movements x
            where x.organization_id=p_org
              and x.movement_type='EXIT'
              and x.lot_id=m.lot_id
              and x.product_code=v_code
              and x.notes like '%'||v_np||'%'
          ),0),0
        ) as remaining_alloc
      from public.inventory_lot_movements m
      join public.inventory_lots l on l.id=m.lot_id
      where m.organization_id=p_org
        and m.movement_type='RESERVE'
        and m.reference=v_np
        and m.product_code=v_code
      order by l.expires_on asc,m.id asc
    loop
      exit when v_remaining <= 0;
      if v_res.remaining_alloc <= 0 then continue; end if;
      v_take := least(v_remaining,v_res.remaining_alloc);

      update public.inventory_lots l
      set quantity_reserved=greatest(0,l.quantity_reserved-v_take),
          quantity_available=greatest(0,l.quantity_available-v_take),
          status=case when greatest(0,l.quantity_available-v_take)<=0 then 'EXHAUSTED' else l.status end,
          updated_at=now()
      where l.id=v_res.lot_id;

      insert into public.inventory_lot_movements(
        organization_id,lot_id,product_code,movement_type,quantity,reference,notes,created_by
      ) values (
        p_org,v_res.lot_id,v_code,'EXIT',v_take,v_r,
        'Salida FEFO por entrega; reserva '||v_np,auth.uid()
      );
      v_remaining := v_remaining-v_take;
    end loop;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.extras_catalogo(p_lista text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'combos', coalesce((select jsonb_agg(jsonb_build_object('id', 'combo:' || c.id, 'n', c.nombre, 'desc', c.descripcion, 'pct', c.descuento_pct, 'items', c.items) order by c.id)
                          from combos c where c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)), '[]'::jsonb),
    'escalas', coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb),
    'minimo',  nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric,
    'envio',   nullif((select valor from config_app where clave = 'envio_gratis_desde'), '')::numeric)
$function$
;

CREATE OR REPLACE FUNCTION public.factor_peso(p_id text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select case when por_peso and coalesce(peso_pieza, 0) > 0 then peso_pieza end from productos where id::text = p_id), 1)
$function$
;

CREATE OR REPLACE FUNCTION public.faq_info()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare z jsonb; f jsonb; k text; zs jsonb := '[]'::jsonb; cf jsonb; g jsonb; fe jsonb;
  val text;
begin
  begin z := nullif((select valor from config_app where clave = 'zonas_reparto'), '')::jsonb; exception when others then z := null; end;
  begin f := nullif((select valor from config_app where clave = 'feriados'), '')::jsonb; exception when others then f := null; end;
  begin cf := nullif((select valor from config_app where clave = 'faq'), '')::jsonb; exception when others then cf := null; end;
  begin g := nullif((select valor from config_app where clave = 'garantia'), '')::jsonb; exception when others then g := null; end;
  begin fe := nullif((select valor from config_app where clave = 'entregas'), '')::jsonb; exception when others then fe := null; end;
  if jsonb_typeof(z) = 'object' then
    for k in select jsonb_object_keys(z) order by 1 loop
      if jsonb_typeof(z -> k -> 'dias') = 'array' and jsonb_array_length(z -> k -> 'dias') > 0 and k <> 'Sin zona' then
        zs := zs || jsonb_build_array(jsonb_build_object('z', k, 'dias', z -> k -> 'dias', 'minimo', coalesce((z -> k ->> 'minimo')::numeric, 0)));
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'faq', coalesce(cf, '{}'::jsonb),
    'zonas', zs,
    'entrega', fe,
    'minimo', (select nullif(valor, '')::numeric from config_app where clave = 'pedido_minimo' and valor ~ '^\s*[0-9.]+\s*$'),
    'envio', (select nullif(valor, '')::numeric from config_app where clave = 'envio_gratis_desde' and valor ~ '^\s*[0-9.]+\s*$'),
    'pago', coalesce((select length(trim(valor)) > 0 from config_app where clave = 'datos_pago'), false),
    'mp', coalesce((select length(trim(valor)) > 0 from config_app where clave = 'link_mp'), false),
    'tel', (select valor from config_app where clave = 'telefono_empresa'),
    'garantia', case when coalesce((g ->> 'activa')::boolean, false) then g end,
    'feriados', coalesce((select jsonb_agg(x ->> 'f' order by x ->> 'f') from jsonb_array_elements(case when jsonb_typeof(f) = 'array' then f when jsonb_typeof(f -> 'l') = 'array' then f -> 'l' else '[]'::jsonb end) x
                          where (x ->> 'f')::date between current_date and current_date + 45), '[]'::jsonb));
end $function$
;

CREATE OR REPLACE FUNCTION public.fav_cliente(p_token text, p_producto text, p_on boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; f jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  f := coalesce(v.favoritos, '[]'::jsonb) - p_producto;
  if p_on and jsonb_array_length(f) < 200 then f := f || to_jsonb(left(p_producto, 60)); end if;
  update clientes set favoritos = f where id = v.id;
  return f;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_alicuota(p_ids uuid[], p_alic numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar el IVA de los productos'; end if;
  if p_alic not in (0, 10.5, 21, 27) then raise exception 'Alícuota no válida'; end if;
  update productos set alicuota_iva = p_alic where id = any(p_ids);
  get diagnostics n = row_count; return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_bulto(p_producto uuid, p_unidades integer, p_tipo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar los bultos'; end if;
  if p_unidades is null or p_unidades < 1 or p_unidades > 10000 then raise exception 'Unidades por bulto no válidas'; end if;
  update productos set unidades_bulto = p_unidades, tipo_bulto = coalesce(nullif(trim(p_tipo),''),'Caja') where id = p_producto;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_comision(p_perfil uuid, p_pct numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar las comisiones'; end if;
  if p_pct is null or p_pct < 0 or p_pct > 50 then raise exception 'La comisión tiene que estar entre 0 y 50 %%'; end if;
  update perfiles set comision_pct = p_pct where id = p_perfil;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_costos(p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  update productos p set costo = round((x->>'costo')::numeric, 2)
    from jsonb_array_elements(p_items) x
   where p.id = (x->>'id')::uuid and (x->>'costo')::numeric > 0
     and p.costo is distinct from round((x->>'costo')::numeric, 2);
  get diagnostics n = row_count;
  return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_entrega(p_token text, p_numero bigint, p_fecha date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if p_fecha < (now() at time zone 'America/Argentina/Buenos_Aires')::date or p_fecha > current_date + 30 then raise exception 'Elegí una fecha válida.'; end if;
  update pedidos set entrega = p_fecha where numero = p_numero and cliente_id = v_id and estado::text in ('pendiente', 'aprobado', 'en_preparacion');
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_foto(p_producto uuid, p_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar las fotos'; end if;
  update productos set foto = nullif(trim(p_url), '') where id = p_producto;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_margen_familia(p_familia text, p_ajuste numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  if coalesce(trim(p_familia), '') = '' then raise exception 'Falta la familia'; end if;
  if p_ajuste is not null and (p_ajuste < -50 or p_ajuste > 50) then raise exception 'El ajuste tiene que estar entre -50 y +50 puntos'; end if;
  if coalesce(p_ajuste, 0) = 0 then
    delete from margenes_familia where upper(familia) = upper(trim(p_familia));
  else
    insert into margenes_familia (familia, ajuste_pct) values (trim(p_familia), round(p_ajuste, 2))
    on conflict (familia) do update set ajuste_pct = excluded.ajuste_pct, actualizado = now();
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_margen_lista(p_lista text, p_margen numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede cambiar precios'; end if;
  if p_margen is null or p_margen < 0 or p_margen >= 90 then raise exception 'El margen tiene que estar entre 0 y 89 %%'; end if;
  update config_listas set margen_pct = p_margen where lista::text = p_lista;
  if not found then raise exception 'No existe la lista %', p_lista; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_minimo(p_producto uuid, p_minimo numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_minimo is null or p_minimo < 0 then raise exception 'El mínimo no puede ser negativo'; end if;
  update productos set stock_minimo = p_minimo where id = p_producto;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_nuevo(p_ids uuid[], p_dias integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede marcar novedades'; end if;
  update productos set nuevo_hasta = case when coalesce(p_dias, 0) > 0 then current_date + p_dias end where id = any(p_ids);
  get diagnostics n = row_count; return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijar_stock(p_producto uuid, p_nuevo numeric, p_ref text DEFAULT 'Recuento'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v numeric;
begin
  if not tiene_rol('dueno', 'administracion', 'deposito') then
    raise exception 'No tenés permiso para modificar el stock';
  end if;
  if p_nuevo < 0 then raise exception 'La existencia no puede ser negativa'; end if;
  select coalesce((select fisico from stock where producto_id = p_producto), 0) into v;
  if p_nuevo <> v then
    perform mover_stock(p_producto, p_nuevo - v, 0, 'ajuste', p_ref);
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.fijo_cliente(p_token text, p_dias integer[], p_items jsonb, p_activo boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_d int[];
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '' and coalesce(activo, true);
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  select coalesce(array_agg(distinct d order by d), '{}') into v_d from unnest(coalesce(p_dias, '{}')) d where d between 1 and 7;
  if p_activo and cardinality(v_d) = 0 then raise exception 'Elegí al menos un día.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 150 then raise exception 'El pedido no es válido.'; end if;
  if p_activo and jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  insert into pedidos_fijos (cliente_id, dias, items, activo, nota)
  values (v_id, v_d, (select coalesce(jsonb_agg(jsonb_build_object('id', j->>'id', 'q', greatest(round((j->>'q')::numeric), 1))), '[]'::jsonb)
                        from jsonb_array_elements(p_items) j where j->>'id' not like 'combo:%' and (j->>'q')::numeric >= 1), p_activo, 'Pedido automático (lo eligió el cliente)')
  on conflict (cliente_id) do update set dias = case when p_activo then excluded.dias else pedidos_fijos.dias end,
     items = case when p_activo then excluded.items else pedidos_fijos.items end, activo = p_activo;
  return jsonb_build_object('ok', true, 'dias', v_d);
end $function$
;

CREATE OR REPLACE FUNCTION public.fraccionar(p jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id bigint; d jsonb; v_ref text;
begin
  if auth.uid() is null then raise exception 'Tenés que entrar al CRM.'; end if;
  if coalesce((p->>'kg_bruto')::numeric, 0) <= 0 then raise exception 'Poné cuánto pesó la pieza entera.'; end if;
  if jsonb_array_length(coalesce(p->'destinos', '[]')) = 0 then raise exception 'Elegí en qué la fraccionaste.'; end if;
  insert into fraccionados (origen_id, cantidad, kg_bruto, kg_util, merma_kg, costo, costo_kg, destinos, nota)
  values ((p->>'origen')::uuid, (p->>'cantidad')::numeric, (p->>'kg_bruto')::numeric, (p->>'kg_util')::numeric,
          greatest(coalesce((p->>'merma_kg')::numeric, 0), 0), coalesce((p->>'costo')::numeric, 0), coalesce((p->>'costo_kg')::numeric, 0),
          p->'destinos', nullif(p->>'nota', ''))
  returning id into v_id;
  v_ref := 'Fraccionado N° ' || v_id;
  if coalesce((p->>'stock')::boolean, true) then
    perform mover_stock((p->>'origen')::uuid, -(p->>'cantidad')::numeric, 0, 'ajuste', v_ref);
    for d in select * from jsonb_array_elements(p->'destinos') loop
      if coalesce((d->>'q')::numeric, 0) > 0 then
        perform mover_stock((d->>'id')::uuid, (d->>'q')::numeric, 0, 'ajuste', v_ref);
      end if;
    end loop;
  end if;
  if coalesce((p->>'merma_kg')::numeric, 0) > 0 and to_regclass('public.mermas') is not null then
    execute 'insert into mermas (producto_id, cantidad, motivo, costo, nota) values ($1, $2, $3, $4, $5)'
      using (p->>'origen')::uuid, coalesce((p->>'merma_q')::numeric, (p->>'merma_kg')::numeric), 'Corte / fraccionado',
            round((p->>'merma_kg')::numeric * coalesce((p->>'costo_kg_bruto')::numeric, 0), 2), v_ref || ' · ' || (p->>'merma_kg') || ' kg';
  end if;
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.garantia_info()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select case when valor ~ '^\s*\{' then valor::jsonb end from config_app where clave = 'garantia'), '{}'::jsonb)
$function$
;

CREATE OR REPLACE FUNCTION public.generar_pedidos_fijos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f record; v clientes%rowtype; vj jsonb; v_lista text; v_ped record; n int := 0; k int;
        hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  for f in select * from pedidos_fijos
            where activo and extract(isodow from hoy)::int = any(dias)
              and (ultimo_generado is null or ultimo_generado < hoy)
              and jsonb_array_length(items) > 0
            for update skip locked loop
    update pedidos_fijos set ultimo_generado = hoy where id = f.id;
    select * into v from clientes where id = f.cliente_id and coalesce(activo, true);
    if not found then continue; end if;
    if v.cerrado_hasta is not null and hoy between coalesce(v.cerrado_desde, hoy) and v.cerrado_hasta then continue; end if;
    vj := to_jsonb(v); v_lista := coalesce(v.lista::text, 'mayorista');
    insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen, observaciones)
    values (v.id, coalesce((vj->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1)),
            v.lista, coalesce((vj->>'descuento_pct')::numeric, 0), 'fijo', coalesce(nullif(trim(f.nota), ''), 'Pedido fijo'))
    returning id, numero into v_ped;
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
    select v_ped.id, x.pid, x.q, round(x.base * (1 - coalesce(mp.pct, 0) / 100), 2), case when mp.pct is not null then mp.nombre end
      from (select pp.producto_id pid, least(greatest(round((j->>'q')::numeric), 1), 100000) q,
                   case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end base
              from jsonb_array_elements(f.items) j
              join precios_productos pp on pp.producto_id::text = j->>'id'
             where pp.costo > 0) x
      left join lateral mejor_promo(x.pid, v_lista, x.q) mp on true;
    get diagnostics k = row_count;
    if k = 0 then delete from pedidos where id = v_ped.id; else n := n + 1; end if;
  end loop;
  return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.grupo_info(p_token text, p_codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; g grupos_pedido%rowtype; o numeric; n int; nom text;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into g from grupos_pedido where codigo = upper(trim(p_codigo));
  if not found then return jsonb_build_object('ok', false, 'msg', 'No encontramos ese código de grupo.'); end if;
  if g.vence < now() then return jsonb_build_object('ok', false, 'msg', 'Ese grupo ya venció. Creá uno nuevo.'); end if;
  select coalesce(sum(total), 0), count(distinct cliente_id), string_agg(distinct split_part(c.razon_social, ' ', 1) || ' ' || coalesce(split_part(c.razon_social, ' ', 2), ''), ', ')
    into o, n, nom
    from pedidos p join clientes c on c.id = p.cliente_id
   where p.grupo = g.codigo and p.cliente_id <> v.id and p.estado::text in ('pendiente', 'aprobado', 'en_preparacion', 'listo');
  return jsonb_build_object('ok', true, 'codigo', g.codigo, 'otros', o, 'n', n, 'nombres', trim(coalesce(nom, '')), 'creador', g.creador = v.id::text,
    'vence', g.vence, 'minimo', nullif((select valor from config_app where clave = 'pedido_minimo'), '')::numeric);
end $function$
;

CREATE OR REPLACE FUNCTION public.guardar_carrito(p_token text, p_items jsonb, p_total numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then return; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then delete from carritos where cliente_id = v_id; return; end if;
  if jsonb_array_length(p_items) > 300 then return; end if;
  insert into carritos (cliente_id, items, total, actualizado_en, contactado_en) values (v_id, p_items, least(greatest(coalesce(p_total, 0), 0), 999999999), now(), null)
  on conflict (cliente_id) do update set items = excluded.items, total = excluded.total, actualizado_en = now(), contactado_en = null;
end $function$
;

CREATE OR REPLACE FUNCTION public.items_pedido_cliente(p_token text, p_numero bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o pedidos%rowtype; it jsonb;
begin
  o := pedido_editable_cliente(p_token, p_numero);
  select coalesce(jsonb_agg(jsonb_build_object('id', producto_id::text, 'q', cantidad)), '[]'::jsonb) into it
    from pedido_items where pedido_id = o.id;
  return jsonb_build_object('numero', o.numero, 'items', it, 'nota', o.observaciones,
                            'entrega', coalesce(to_jsonb(o)->>'entrega', to_jsonb(o)->>'fecha_entrega'));
end $function$
;

CREATE OR REPLACE FUNCTION public.km_entre(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select 2 * 6371 * asin(sqrt(power(sin(radians(b_lat - a_lat) / 2), 2) + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)))
$function$
;

CREATE OR REPLACE FUNCTION public.marca_publica()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'c',    (select valor from config_app where clave = 'marca_color'),
    'n',    (select valor from config_app where clave = 'marca_oscuro'),
    'logo', (select valor from config_app where clave = 'marca_logo'))
$function$
;

CREATE OR REPLACE FUNCTION public.marcar_campania(p_codigo text, p_telefono text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v text := upper(trim(coalesce(p_codigo, ''))); v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
begin
  if v = '' or length(v_tel) < 8 or not exists (select 1 from campanias_qr where codigo = v) then return; end if;
  update prospectos set campania = v
   where campania is null and origen = 'catalogo' and creado_en > now() - interval '1 day'
     and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 8) = right(v_tel, 8);
  update presupuestos set campania = v
   where campania is null and origen = 'catalogo' and creado_en > now() - interval '1 hour'
     and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 8) = right(v_tel, 8);
end $function$
;

CREATE OR REPLACE FUNCTION public.marcar_entrega()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.estado::text = 'entregado' and old.estado::text is distinct from 'entregado' then new.entregado_en := now(); end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.margen_familia_factor(p_familia text, p_lista text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((
    select (1 - coalesce(l.margen_pct, 0) / 100)
         / (1 - least(greatest(coalesce(l.margen_pct, 0) + f.ajuste_pct, 0), 89) / 100)
      from config_listas l
      join margenes_familia f on upper(f.familia) = upper(trim(p_familia))
     where l.lista::text = p_lista and f.ajuste_pct <> 0
     limit 1), 1)
$function$
;

CREATE OR REPLACE FUNCTION public.mejor_promo(p_producto uuid, p_lista text, p_cant numeric)
 RETURNS TABLE(pct numeric, nombre text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when pr.nombre like 'Bonificación%' and pr.minimo_tipo = 'unidades' and pr.minimo_unidades > 0 and p_cant > 0
              then round(pr.descuento_pct * floor(p_cant / pr.minimo_unidades) * pr.minimo_unidades / p_cant, 4)
              else pr.descuento_pct end, pr.nombre
    from promociones pr, productos p
   where p.id = p_producto and pr.activa
     and current_date >= pr.desde and (pr.hasta is null or current_date <= pr.hasta)
     and (pr.dias_semana is null or cardinality(pr.dias_semana) = 0 or extract(isodow from (now() at time zone 'America/Argentina/Buenos_Aires'))::int = any(pr.dias_semana))
     and (pr.listas is null or cardinality(pr.listas) = 0 or p_lista = any(pr.listas))
     and (pr.alcance = 'todos'
          or (pr.alcance = 'marca'    and upper(coalesce(p.marca,''))   = upper(pr.alcance_valor))
          or (pr.alcance = 'familia'  and upper(coalesce(p.familia,'')) = upper(pr.alcance_valor))
          or (pr.alcance = 'producto' and p.id::text = pr.alcance_valor))
     and (pr.minimo_tipo = 'ninguno'
          or (pr.minimo_tipo = 'unidades' and p_cant >= pr.minimo_unidades)
          or (pr.minimo_tipo = 'bulto' and p.unidades_bulto > 1 and p_cant >= p.unidades_bulto))
   order by 1 desc
   limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.mover_stock(p_producto uuid, p_fisico numeric, p_reservado numeric, p_tipo text, p_ref text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into stock (producto_id) values (p_producto) on conflict do nothing;
  update stock set fisico = fisico + p_fisico,
                   reservado = greatest(reservado + p_reservado, 0)
   where producto_id = p_producto;
  insert into movimientos_stock (producto_id, tipo, cantidad, referencia)
  values (p_producto, p_tipo, case when p_fisico <> 0 then p_fisico else p_reservado end, p_ref);
end $function$
;

CREATE OR REPLACE FUNCTION public.nivel_cliente(p_cliente uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d jsonb; v_c numeric; e jsonb; v_act jsonb; v_prox jsonb;
begin
  d := nullif((select valor from config_app where clave = 'niveles'), '')::jsonb;
  if d is null or not coalesce((d->>'activo')::boolean, false) then return null; end if;
  select coalesce(sum(total), 0) into v_c from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado'
     and creado_en > now() - make_interval(days => coalesce((d->>'dias')::int, 90));
  for e in select x from jsonb_array_elements(d->'niveles') x order by (x->>'desde')::numeric loop
    if v_c >= (e->>'desde')::numeric then v_act := e; elsif v_prox is null then v_prox := e; end if;
  end loop;
  return coalesce(v_act, '{}'::jsonb) || jsonb_build_object('compras', v_c, 'dias', coalesce((d->>'dias')::int, 90), 'prox', v_prox);
end $function$
;

CREATE OR REPLACE FUNCTION public.no_estare(p_token text, p_numero bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  update pedidos set cliente_ausente = true,
         observaciones = left(concat_ws(' · ', nullif(observaciones, ''), '🚫 El cliente avisó que no va a estar'), 500)
   where numero = p_numero and cliente_id = v_id and estado::text in ('pendiente', 'aprobado', 'en_preparacion', 'listo') and not cliente_ausente;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.oc_recalcular_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare v_id bigint := coalesce(new.orden_id, old.orden_id);
begin
  update ordenes_compra
     set total = coalesce((select sum(subtotal) from ordenes_compra_items where orden_id = v_id),0)
   where id = v_id;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.opiniones_publicas()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(x order by f desc), '[]'::jsonb) from (
    select jsonb_build_object('t', left(e.comentario, 280), 'n', c.razon_social, 'r', c.rubro, 'p', e.puntaje) x, e.respondida_en f
      from encuestas e join clientes c on c.id = e.cliente_id
     where e.publicar and e.puntaje >= 4 and coalesce(trim(e.comentario), '') <> ''
     order by e.respondida_en desc nulls last limit 8) z
$function$
;

CREATE OR REPLACE FUNCTION public.pedido_mueve_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ro int := rank_estado(old.estado);
  rn int := rank_estado(new.estado);
  act_o boolean := ro in (1, 2);
  act_n boolean := rn in (1, 2);
  ref text := 'Pedido N° ' || new.numero;
  i record;
begin
  if old.estado = new.estado then return new; end if;
  for i in select producto_id, cantidad from pedido_items where pedido_id = new.id loop
    if rn >= 3 and ro >= 0 and ro < 3 then
      perform mover_stock(i.producto_id, -i.cantidad, case when act_o then -i.cantidad else 0 end, 'venta', ref);
    elsif act_n and not act_o then
      perform mover_stock(i.producto_id, 0, i.cantidad, 'reserva', ref);
    elsif act_o and not act_n and rn < 3 then
      perform mover_stock(i.producto_id, 0, -i.cantidad, 'liberacion', ref);
    end if;
  end loop;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.pedido_publico(p_nombre text, p_telefono text, p_domicilio text, p_items jsonb, p_nota text DEFAULT NULL::text, p_ref text DEFAULT NULL::text, p_cupon text DEFAULT NULL::text, p_rubro text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_lista text; v_it jsonb; v_sub numeric; v_esc numeric := 0; e jsonb; v_cup numeric := 0; v_fac numeric; v_tot numeric;
        v_num bigint; v_pro uuid; v_ref text;
begin
  v_lista := (select valor from config_app where clave = 'catalogo_publico');
  if coalesce(v_lista, '') not in ('mayorista', 'minorista', 'especial') then raise exception 'El catálogo no está disponible en este momento.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío.'; end if;
  if jsonb_array_length(p_items) > 200 then raise exception 'El pedido tiene demasiados productos.'; end if;
  if (select count(*) from presupuestos where origen = 'catalogo' and creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'Hay muchos pedidos en este momento. Mandanos el pedido por WhatsApp.'; end if;
  v_ref := (select razon_social from clientes where codigo_ref = upper(trim(p_ref)));
  v_pro := alta_web(p_nombre, p_telefono, p_domicilio, p_rubro, null, null, case when v_ref is not null then 'Lo recomendó ' || v_ref || ' (código ' || upper(trim(p_ref)) || ')' end);

  with base as (
    select pp.producto_id pid, case v_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end precio
      from precios_productos pp where pp.costo > 0),
  sueltos as (
    select b.pid, least(greatest(round((j->>'q')::numeric), 1), 100000) q, b.precio
      from jsonb_array_elements(p_items) j join base b on b.pid::text = j->>'id' where (j->>'q')::numeric >= 1),
  lineas as (
    select s.pid, s.q, round(s.precio * (1 - coalesce(mp.pct, 0) / 100), 2) pu, case when mp.pct is not null then mp.nombre end promo
      from sueltos s left join lateral mejor_promo(s.pid, v_lista, s.q) mp on true
    union all
    select b.pid, (ci->>'q')::numeric * least(greatest(round((j->>'q')::numeric), 1), 1000), round(b.precio * (1 - c.descuento_pct / 100), 2),
           case when c.nombre ilike 'combo%' then c.nombre else 'Combo ' || c.nombre end
      from jsonb_array_elements(p_items) j
      join combos c on 'combo:' || c.id = j->>'id' and c.activo and current_date >= c.desde and (c.hasta is null or current_date <= c.hasta)
      cross join jsonb_array_elements(c.items) ci join base b on b.pid::text = ci->>'id'
     where (j->>'q')::numeric >= 1)
  select jsonb_agg(jsonb_build_object('id', pid, 'q', q, 'pu', round(t / q, 2), 'promo', promo)) into v_it
    from (select pid, sum(q) q, sum(q * pu) t, string_agg(distinct promo, ' + ') promo from lineas group by pid) z;
  if v_it is null then raise exception 'Ninguno de los productos está disponible.'; end if;

  select sum((x->>'q')::numeric * (x->>'pu')::numeric) into v_sub from jsonb_array_elements(v_it) x;
  for e in select * from jsonb_array_elements(coalesce((select valor from config_app where clave = 'escalas_descuento')::jsonb, '[]'::jsonb)) loop
    if v_sub >= (e->>'desde')::numeric and (e->>'pct')::numeric > v_esc then v_esc := (e->>'pct')::numeric; end if;
  end loop;
  v_cup := cupon_pct(p_cupon, null, v_sub * (1 - v_esc / 100));
  v_fac := (1 - v_esc / 100) * (1 - v_cup / 100);
  select jsonb_agg(jsonb_build_object('id', x->>'id', 'q', (x->>'q')::numeric, 'pu', round((x->>'pu')::numeric * v_fac, 2),
           'promo', nullif(concat_ws(' + ', x->>'promo', case when v_esc > 0 then 'Descuento por monto ' || trim_scale(v_esc) || ' %' end,
                                     case when v_cup > 0 then 'Cupón ' || upper(trim(p_cupon)) || ' ' || trim_scale(v_cup) || ' %' end), '')))
    into v_it from jsonb_array_elements(v_it) x;
  select round(sum((x->>'q')::numeric * (x->>'pu')::numeric), 2) into v_tot from jsonb_array_elements(v_it) x;

  perform pg_advisory_xact_lock(434343);
  select coalesce(max(numero), 0) + 1 into v_num from presupuestos;
  insert into presupuestos (numero, nombre, telefono, lista, items, total, nota, estado, origen, respuesta)
  values (v_num, left(trim(p_nombre), 80), left(trim(p_telefono), 30), v_lista, v_it, v_tot,
          nullif(concat_ws(' · ', nullif(left(trim(coalesce(p_domicilio, '')), 120), ''), nullif(left(trim(coalesce(p_nota, '')), 400), ''),
                 case when v_ref is not null then 'Lo recomendó ' || v_ref end), ''),
          'aceptado', 'catalogo', 'Pedido desde el catálogo público');
  if v_cup > 0 then insert into cupones_usos (codigo, cliente_id) values (upper(trim(p_cupon)), null); end if;
  return jsonb_build_object('numero', v_num, 'total', v_tot, 'productos', jsonb_array_length(v_it), 'descuento', v_esc, 'cupon', v_cup);
end $function$
;

CREATE OR REPLACE FUNCTION public.pedir_aviso(p_token text, p_producto text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if not exists (select 1 from productos where id::text = p_producto) then raise exception 'Ese producto no existe.'; end if;
  insert into avisos_stock (cliente_id, producto_id) select v_id, id from productos where id::text = p_producto
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.pesables()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_object_agg(id::text, coalesce(peso_pieza, 0)), '{}'::jsonb) from productos where por_peso
$function$
;

CREATE OR REPLACE FUNCTION public.pi_precio_lista()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.precio_lista is null then
    begin
      select coalesce(pc.precio, case coalesce(p.lista::text, 'mayorista')
                                   when 'minorista' then pp.precio_minorista
                                   when 'especial' then pp.precio_especial
                                   else pp.precio_mayorista end)
        into new.precio_lista
        from pedidos p
        join precios_productos pp on pp.producto_id = new.producto_id
        left join precios_cliente pc on pc.cliente_id = p.cliente_id and pc.producto_id = new.producto_id
       where p.id = new.pedido_id;
    exception when others then null;
    end;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.poner_costo_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.costo_unitario is null then
    select costo * case when por_peso and coalesce(peso_pieza, 0) > 0 then peso_pieza else 1 end into new.costo_unitario from productos where id = new.producto_id;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.premio_online()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c jsonb;
begin
  if coalesce(new.origen, '') <> 'online' then return new; end if;
  begin c := nullif((select valor from config_app where clave = 'premio_online'), '')::jsonb; exception when others then c := null; end;
  if c is null or not coalesce((c->>'activa')::boolean, false) or coalesce((c->>'puntos')::int, 0) <= 0 then return new; end if;
  insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, (c->>'puntos')::int, 'Premio por pedir online', new.id);
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.presupuesto_aceptar(p_token text, p_respuesta text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b presupuestos%rowtype; v clientes%rowtype; v_pid uuid; v_num bigint; v_vend uuid;
begin
  select * into b from presupuestos where token = p_token for update;
  if not found then raise exception 'Este presupuesto no existe.'; end if;
  if b.estado <> 'enviado' then raise exception 'Este presupuesto ya está %.', b.estado; end if;
  if b.vence is not null and b.vence < current_date then update presupuestos set estado = 'vencido' where id = b.id; raise exception 'Este presupuesto venció. Pedinos uno nuevo.'; end if;
  if b.cliente_id is not null then
    select * into v from clientes where id = b.cliente_id;
    v_vend := coalesce(b.usuario_id, (to_jsonb(v)->>'vendedor_id')::uuid, (select id from perfiles where rol::text = 'dueno' and activo order by id limit 1));
    insert into pedidos (cliente_id, vendedor_id, lista, descuento_pct, origen, observaciones)
    values (v.id, v_vend, v.lista, 0, 'presupuesto', 'Presupuesto N° ' || b.numero || coalesce(' · ' || nullif(trim(p_respuesta), ''), ''))
    returning id, numero into v_pid, v_num;
    insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario, promo)
    select v_pid, (x->>'id')::uuid, (x->>'q')::numeric, (x->>'pu')::numeric, nullif(x->>'promo', '') from jsonb_array_elements(b.items) x;
  end if;
  update presupuestos set estado = 'aceptado', respuesta = nullif(left(trim(coalesce(p_respuesta, '')), 500), ''), pedido_id = v_pid where id = b.id;
  return jsonb_build_object('ok', true, 'pedido', v_num);
end $function$
;

CREATE OR REPLACE FUNCTION public.presupuesto_ver(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b presupuestos%rowtype;
begin
  select * into b from presupuestos where token = p_token;
  if not found then raise exception 'Este presupuesto no existe.'; end if;
  if b.estado = 'enviado' and b.vence is not null and b.vence < current_date then update presupuestos set estado = 'vencido' where id = b.id; b.estado := 'vencido'; end if;
  return jsonb_build_object('numero', b.numero, 'cliente', coalesce((select razon_social from clientes where id = b.cliente_id), b.nombre),
    'fecha', b.creado_en, 'vence', b.vence, 'estado', b.estado, 'total', b.total, 'nota', b.nota, 'lista', b.lista,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('d', coalesce(p.descripcion, 'Producto'), 'q', x->>'q', 'pu', x->>'pu', 'promo', x->>'promo', 'img', p.foto)), '[]'::jsonb)
                from jsonb_array_elements(b.items) x left join productos p on p.id::text = x->>'id'),
    'tel', (select valor from config_app where clave = 'telefono_empresa'));
end $function$
;

CREATE OR REPLACE FUNCTION public.productos_catalogo(p_lista text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', pp.producto_id, 'd', pp.descripcion, 'm', pp.marca, 'f', pp.familia, 'c', pp.codigo,
           'p', case p_lista when 'minorista' then pp.precio_minorista when 'especial' then pp.precio_especial else pp.precio_mayorista end,
           'b', p.unidades_bulto, 'tb', p.tipo_bulto, 'img', p.foto, 'nv', coalesce(p.nuevo_hasta >= current_date, false))
           order by pp.descripcion), '[]'::jsonb)
    from precios_productos pp join productos p on p.id = pp.producto_id
   where pp.costo > 0 and coalesce(p.activo, true)
$function$
;

CREATE OR REPLACE FUNCTION public.productos_para(p_lista text, p_cliente uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(
           (case when pc.precio is not null then e.x || jsonb_build_object('p', pc.precio, 'pac', true) else e.x end)
           || (case when coalesce(pq.ean, '') <> '' then jsonb_build_object('e', pq.ean) else '{}'::jsonb end)
           || (case when coalesce(pr.solo_bulto, false) and pr.unidades_bulto > 1 then '{"sb": true}'::jsonb else '{}'::jsonb end)
           || (case when pr.pvp > 0 then jsonb_build_object('pvp', pr.pvp) else '{}'::jsonb end)
           || (case when cfg.ss and st.disp is not null and st.disp <= 0 then '{"ss": true}'::jsonb else '{}'::jsonb end)
         order by e.o), '[]'::jsonb)
    from jsonb_array_elements(productos_catalogo(p_lista)) with ordinality e(x, o)
    cross join (select coalesce((select valor from config_app where clave = 'avisar_sin_stock'), 'no') = 'si' ss) cfg
    left join productos pr on pr.id::text = e.x->>'id'
    left join precios_productos pq on pq.producto_id::text = e.x->>'id'
    left join precios_cliente pc on pc.cliente_id = p_cliente and pc.producto_id::text = e.x->>'id'
    left join lateral (select sum(s.disponible) disp from stock s where cfg.ss and s.producto_id::text = e.x->>'id') st on true
$function$
;

CREATE OR REPLACE FUNCTION public.promos_catalogo(p_lista text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('n', nombre, 'pct', descuento_pct, 'a', alcance, 'av', alcance_valor,
           'mt', minimo_tipo, 'mu', minimo_unidades)), '[]'::jsonb)
    from promociones
   where activa and current_date >= desde and (hasta is null or current_date <= hasta)
     and (listas is null or cardinality(listas) = 0 or p_lista = any(listas))
$function$
;

CREATE OR REPLACE FUNCTION public.puntos_activos()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select valor from config_app where clave = 'puntos_activo'), 'si') = 'si'
$function$
;

CREATE OR REPLACE FUNCTION public.puntos_por_entrega()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_p int; v_ref uuid; v_bono int; d jsonb; v_mes text;
begin
  if new.estado::text = 'entregado' and old.estado::text is distinct from 'entregado' and puntos_activos() then
    if not exists (select 1 from puntos_mov where pedido_id = new.id and puntos > 0 and motivo like 'Compra%') then
      v_p := floor(coalesce(new.total, 0) / greatest(cfg_num('puntos_cada', 1000), 1));
      if v_p > 0 then insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, v_p, 'Compra pedido N° ' || new.numero, new.id); end if;
    end if;
    select referido_por into v_ref from clientes where id = new.cliente_id;
    v_bono := cfg_num('referido_puntos', 500)::int;
    if v_ref is not null and v_bono > 0
       and not exists (select 1 from puntos_mov where cliente_id = new.cliente_id and motivo = 'Bienvenida por recomendación') then
      insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, v_bono, 'Bienvenida por recomendación', new.id);
      insert into puntos_mov (cliente_id, puntos, motivo, pedido_id)
        values (v_ref, v_bono, 'Recomendaste a ' || (select razon_social from clientes where id = new.cliente_id), new.id);
    end if;
    d := desafio_mes();
    if d is not null and coalesce((d->>'puntos')::int, 0) > 0 then
      v_mes := d->>'mes';
      if not exists (select 1 from puntos_mov where cliente_id = new.cliente_id and motivo = 'Desafío ' || v_mes)
         and (select coalesce(sum(total), 0) from pedidos where cliente_id = new.cliente_id and estado::text = 'entregado'
                and to_char(creado_en at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') = v_mes) >= (d->>'meta')::numeric then
        insert into puntos_mov (cliente_id, puntos, motivo, pedido_id) values (new.cliente_id, (d->>'puntos')::int, 'Desafío ' || v_mes, new.id);
      end if;
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.puntos_saldo(p_cliente uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(puntos), 0)::int from puntos_mov where cliente_id = p_cliente
$function$
;

CREATE OR REPLACE FUNCTION public.rank_estado(e estado_pedido)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case e when 'pendiente' then 0 when 'aprobado' then 1 when 'en_preparacion' then 2
                when 'listo' then 3 when 'en_reparto' then 4 when 'entregado' then 5 else -1 end
$function$
;

CREATE OR REPLACE FUNCTION public.recalcular_total_pedido()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare v_id uuid := coalesce(new.pedido_id, old.pedido_id);
begin
  update pedidos p
     set total = round(coalesce((select sum(subtotal) from pedido_items where pedido_id = v_id), 0)
                       * (1 - p.descuento_pct / 100), 2)
   where p.id = v_id;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.recibir_orden(p_orden_id bigint, p_remito text, p_items jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rec_id bigint; it jsonb; v_item ordenes_compra_items%rowtype;
  v_cant numeric; v_pend numeric; v_estado text; v_ref text;
begin
  select estado into v_estado from ordenes_compra where id = p_orden_id for update;
  if v_estado is null then raise exception 'La orden % no existe', p_orden_id; end if;
  if v_estado in ('anulada','recibida') then raise exception 'La orden % está %', p_orden_id, v_estado; end if;
  v_ref := 'OC ' || p_orden_id || coalesce(' · remito ' || nullif(p_remito,''), '');
  insert into recepciones (orden_id, remito) values (p_orden_id, nullif(p_remito,'')) returning id into v_rec_id;
  for it in select * from jsonb_array_elements(p_items) loop
    v_cant := (it->>'cantidad')::numeric;
    continue when v_cant is null or v_cant <= 0;
    select * into v_item from ordenes_compra_items where id = (it->>'oc_item_id')::bigint and orden_id = p_orden_id;
    if not found then raise exception 'El ítem % no pertenece a la orden', it->>'oc_item_id'; end if;
    insert into recepciones_items (recepcion_id, oc_item_id, cantidad) values (v_rec_id, v_item.id, v_cant);
    update ordenes_compra_items set cantidad_recibida = cantidad_recibida + v_cant where id = v_item.id;
    perform mover_stock(v_item.producto_id, v_cant, 0, 'compra', v_ref);
    if v_item.costo_unitario > 0 then update productos set costo = v_item.costo_unitario where id = v_item.producto_id; end if;
  end loop;
  select coalesce(sum(greatest(cantidad - cantidad_recibida,0)),0) into v_pend from ordenes_compra_items where orden_id = p_orden_id;
  update ordenes_compra set estado = case when v_pend <= 0 then 'recibida' else 'recibida_parcial' end where id = p_orden_id;
  return v_rec_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.recordarme(p_token text, p_dias integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; f date;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  f := (now() at time zone 'America/Argentina/Buenos_Aires')::date + greatest(1, least(coalesce(p_dias, 7), 60));
  delete from recordatorios where cliente_id = v_id and hecho_en is null;
  insert into recordatorios (cliente_id, fecha) values (v_id, f);
  return jsonb_build_object('ok', true, 'fecha', f);
end $function$
;

CREATE OR REPLACE FUNCTION public.redondear_precio(v numeric, p_lista text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when v is null or r is null or coalesce((r->>'paso')::numeric, 0) <= 0 then v
              else greatest(ceil((v - coalesce((r->>'fin')::numeric, 0)) / (r->>'paso')::numeric) * (r->>'paso')::numeric + coalesce((r->>'fin')::numeric, 0), (r->>'paso')::numeric) end
    from (select (select nullif(valor, '')::jsonb from config_app where clave = 'redondeo_precios') -> p_lista r) z
$function$
;

CREATE OR REPLACE FUNCTION public.reemplazar_pedido_cliente(p_token text, p_numero bigint, p_items jsonb, p_nota text DEFAULT NULL::text, p_cupon text DEFAULT NULL::text, p_puntos boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o pedidos%rowtype; r jsonb; v_nuevo pedidos.id%type; v_ent text;
begin
  o := pedido_editable_cliente(p_token, p_numero);
  perform devolver_beneficios(o.id);
  update pedidos set estado = 'cancelado',
         observaciones = concat_ws(' · ', nullif(observaciones, ''), 'Reemplazado por el cliente (lo modificó)')
   where id = o.id;
  r := crear_pedido_cliente(p_token, p_items, p_nota, p_cupon, p_puntos);
  select id into v_nuevo from pedidos where numero = (r->>'numero')::bigint;
  update pedidos set observaciones = concat_ws(' · ', '✏️ Modificó el pedido N° ' || o.numero, nullif(observaciones, ''))
   where id = v_nuevo;
  v_ent := coalesce(to_jsonb(o)->>'entrega', to_jsonb(o)->>'fecha_entrega');
  if v_ent is not null then
    begin execute 'update pedidos set entrega = $1::date where id = $2' using v_ent, v_nuevo; exception when others then null; end;
    begin execute 'update pedidos set fecha_entrega = $1::date where id = $2' using v_ent, v_nuevo; exception when others then null; end;
  end if;
  return r || jsonb_build_object('anterior', o.numero);
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_busqueda(p_token text, p_texto text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; t text := lower(left(trim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g')), 60));
begin
  if length(t) < 3 then return; end if;
  if (select count(*) from busquedas where fecha > now() - interval '1 minute') > 40 then return; end if;
  if coalesce(p_token, '') <> '' then select id into v_id from clientes where token_pedidos = p_token; end if;
  if exists (select 1 from busquedas where texto = t and cliente_id is not distinct from v_id and fecha > now() - interval '6 hours') then return; end if;
  insert into busquedas (texto, cliente_id) values (t, v_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_cambio_costo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.costo is distinct from old.costo then
    insert into historial_costos (producto_id, costo_anterior, costo_nuevo)
    values (new.id, old.costo, new.costo);
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_cobranza(p_cliente uuid, p_importe numeric, p_medio medio_pago DEFAULT 'transferencia'::medio_pago, p_imputaciones jsonb DEFAULT '[]'::jsonb, p_observacion text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
declare
  v_recibo uuid;
  v_numero bigint;
  v_item   jsonb;
begin
  insert into recibos (cliente_id, importe, medio, observacion)
  values (p_cliente, p_importe, p_medio, p_observacion)
  returning id, numero into v_recibo, v_numero;

  for v_item in select * from jsonb_array_elements(p_imputaciones) loop
    insert into recibo_imputaciones (recibo_id, factura_id, importe)
    values (v_recibo, (v_item->>'factura_id')::uuid, (v_item->>'importe')::numeric);
  end loop;

  return v_numero;   -- número del recibo emitido
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_devolucion(p_pedido uuid, p_items jsonb, p_motivo text DEFAULT NULL::text, p_reponer boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o pedidos%rowtype; x jsonb; v_items jsonb := '[]'; v_total numeric := 0; v_num bigint; v_q numeric; v_pi record;
        v_dev numeric; v_imp jsonb := '[]'; v_rest numeric; f record; v_rec bigint; v_fact boolean;
begin
  select * into o from pedidos where id = p_pedido;
  if not found then raise exception 'No encuentro el pedido'; end if;
  for x in select * from jsonb_array_elements(p_items) loop
    v_q := round((x->>'q')::numeric, 3);
    if v_q is null or v_q <= 0 then continue; end if;
    select producto_id, sum(cantidad) cant, max(precio_unitario) pu, max(costo_unitario) cu into v_pi
      from pedido_items where pedido_id = p_pedido and producto_id = (x->>'id')::uuid group by producto_id;
    if not found then raise exception 'Un producto no es de este pedido'; end if;
    select coalesce(sum((it->>'q')::numeric), 0) into v_dev from notas_credito nc, jsonb_array_elements(nc.items) it
     where nc.pedido_id = p_pedido and it->>'id' = x->>'id' and coalesce(nc.motivo, '') not like 'Pronto pago%';
    if v_q > v_pi.cant - v_dev then raise exception 'Se devuelven más unidades de las que se entregaron'; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('id', v_pi.producto_id, 'q', v_q, 'pu', v_pi.pu, 'cu', v_pi.cu));
    v_total := v_total + round(v_q * v_pi.pu, 2);
  end loop;
  if jsonb_array_length(v_items) = 0 then raise exception 'No elegiste nada para devolver'; end if;
  perform pg_advisory_xact_lock(424242);
  select coalesce(max(numero), 0) + 1 into v_num from notas_credito;
  if p_reponer then
    for x in select * from jsonb_array_elements(v_items) loop
      perform mover_stock((x->>'id')::uuid, (x->>'q')::numeric, 0, 'ajuste', 'Devolución · Nota de crédito N° ' || v_num);
    end loop;
  end if;
  select exists(select 1 from facturas_venta where pedido_id = p_pedido and not coalesce(anulada, false)) into v_fact;
  if v_fact then
    v_rest := v_total;
    for f in select factura_id, pendiente from facturas_estado where cliente_id = o.cliente_id and pendiente > 0.005 order by vencimiento loop
      exit when v_rest <= 0;
      v_imp := v_imp || jsonb_build_array(jsonb_build_object('factura_id', f.factura_id, 'importe', round(least(v_rest, f.pendiente), 2)));
      v_rest := v_rest - least(v_rest, f.pendiente);
    end loop;
    v_rec := registrar_cobranza(p_cliente => o.cliente_id, p_importe => v_total, p_medio => 'otro', p_imputaciones => v_imp);
    update recibos set observacion = 'Nota de crédito N° ' || v_num where numero = v_rec;
  end if;
  insert into notas_credito (numero, cliente_id, pedido_id, total, motivo, repuesto, items, recibo_numero)
  values (v_num, o.cliente_id, p_pedido, v_total, nullif(trim(p_motivo), ''), p_reponer, v_items, v_rec);
  return jsonb_build_object('numero', v_num, 'total', v_total, 'recibo', v_rec, 'facturado', v_fact);
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_historial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old jsonb; v_new jsonb; v_c jsonb := '{}'; k text;
        ign text[] := array['actualizado_en','updated_at','creado_en','created_at','token_pedidos','foto','subtotal'];
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new) - ign;
    insert into historial_cambios (usuario_id, tabla, registro_id, accion, cambios) values (auth.uid(), tg_table_name, v_new->>'id', 'alta', v_new);
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old) - ign;
    insert into historial_cambios (usuario_id, tabla, registro_id, accion, cambios) values (auth.uid(), tg_table_name, v_old->>'id', 'baja', v_old);
  else
    v_old := to_jsonb(old) - ign; v_new := to_jsonb(new) - ign;
    for k in select jsonb_object_keys(v_new) loop
      if v_new->k is distinct from v_old->k then v_c := v_c || jsonb_build_object(k, jsonb_build_array(v_old->k, v_new->k)); end if;
    end loop;
    if v_c <> '{}'::jsonb then
      insert into historial_cambios (usuario_id, tabla, registro_id, accion, cambios) values (auth.uid(), tg_table_name, v_new->>'id', 'cambio', v_c);
    end if;
  end if;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_qr(p_codigo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v text := upper(trim(coalesce(p_codigo, '')));
begin
  if v = '' or not exists (select 1 from campanias_qr where codigo = v and activa) then return; end if;
  insert into qr_visitas (codigo, dia, n) values (v, (now() at time zone 'America/Argentina/Buenos_Aires')::date, 1)
  on conflict (codigo, dia) do update set n = least(qr_visitas.n + 1, 1000000);
end $function$
;

CREATE OR REPLACE FUNCTION public.registrar_vista(p_token text, p_fam text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; r record; f text := nullif(left(trim(coalesce(p_fam, '')), 40), '');
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then return; end if;
  select * into r from vistas_catalogo where cliente_id = v_id and ultima > now() - interval '40 minutes' order by id desc limit 1;
  if found then
    update vistas_catalogo set ultima = now(), veces = veces + case when f is null then 1 else 0 end,
           fams = case when f is not null and not (f = any(fams)) and cardinality(fams) < 20 then fams || f else fams end where id = r.id;
  else
    insert into vistas_catalogo (cliente_id, fams) values (v_id, case when f is null then '{}'::text[] else array[f] end);
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.remito_cliente(p_token text, p_numero bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; o pedidos%rowtype;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where numero = p_numero and cliente_id = v.id;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  return jsonb_build_object('numero', o.numero, 'cliente', v.razon_social, 'entregado', coalesce(o.entregado_en, o.firmado_en), 'firma', o.firma,
    'firmado_en', o.firmado_en, 'firmado_por', o.firmado_por,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('d', pr.descripcion, 'q', i.cantidad, 'kg', i.peso_real) order by pr.descripcion), '[]'::jsonb)
                from pedido_items i join productos pr on pr.id = i.producto_id where i.pedido_id = o.id));
end $function$
;

CREATE OR REPLACE FUNCTION public.reservar(p_token text, p_preventa bigint, p_cantidad numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if not exists (select 1 from preventas where id = p_preventa and activa) then raise exception 'Esta preventa ya no está disponible.'; end if;
  if coalesce(p_cantidad, 0) <= 0 then
    delete from reservas where preventa_id = p_preventa and cliente_id = v_id and pedido_id is null;
    return jsonb_build_object('ok', true, 'cantidad', 0);
  end if;
  insert into reservas (preventa_id, cliente_id, cantidad) values (p_preventa, v_id, least(round(p_cantidad), 100000))
  on conflict (preventa_id, cliente_id) do update set cantidad = excluded.cantidad, creado_en = now();
  return jsonb_build_object('ok', true, 'cantidad', least(round(p_cantidad), 100000));
end $function$
;

CREATE OR REPLACE FUNCTION public.reserve_fefo_for_order_note(p_org uuid, p_note jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_code text;
  v_qty numeric;
  v_remaining numeric;
  v_take numeric;
  v_total_available numeric;
  v_has_lots boolean;
  v_ref text;
  v_lot record;
begin
  if p_org is null or p_note is null then return; end if;
  v_ref := coalesce(nullif(p_note->>'numero',''), nullif(p_note->>'pedido',''), 'PEDIDO');

  if exists (
    select 1 from public.inventory_lot_movements m
    where m.organization_id=p_org
      and m.movement_type='RESERVE'
      and m.reference=v_ref
  ) then return; end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_note->'items','[]'::jsonb))
  loop
    v_code := nullif(trim(v_item->>'codigo'),'');
    v_qty := coalesce((v_item->>'cantidad')::numeric,0);
    if v_code is null or v_qty <= 0 then continue; end if;

    select exists(
      select 1 from public.inventory_lots l
      where l.organization_id=p_org and l.product_code=v_code
    ) into v_has_lots;
    if not v_has_lots then continue; end if;

    select coalesce(sum(l.quantity_available-l.quantity_reserved),0)
      into v_total_available
    from public.inventory_lots l
    where l.organization_id=p_org
      and l.product_code=v_code
      and l.status='ACTIVE'
      and l.expires_on >= current_date
      and (l.quantity_available-l.quantity_reserved) > 0;

    if v_total_available < v_qty then
      raise exception 'STAGE10_FEFO_INSUFFICIENT_LOT_STOCK: producto %, solicitado %, disponible %',
        v_code,v_qty,v_total_available;
    end if;

    v_remaining := v_qty;
    for v_lot in
      select l.id,(l.quantity_available-l.quantity_reserved) as unreserved_available
      from public.inventory_lots l
      where l.organization_id=p_org
        and l.product_code=v_code
        and l.status='ACTIVE'
        and l.expires_on >= current_date
        and (l.quantity_available-l.quantity_reserved) > 0
      order by l.expires_on asc,l.created_at asc,l.id asc
      for update
    loop
      exit when v_remaining <= 0;
      v_take := least(v_remaining,v_lot.unreserved_available);

      update public.inventory_lots
      set quantity_reserved=quantity_reserved+v_take,
          updated_at=now()
      where id=v_lot.id;

      insert into public.inventory_lot_movements(
        organization_id,lot_id,product_code,movement_type,quantity,reference,notes,created_by
      ) values (
        p_org,v_lot.id,v_code,'RESERVE',v_take,v_ref,
        'Reserva automática FEFO al confirmar Nota de Pedido',auth.uid()
      );
      v_remaining := v_remaining-v_take;
    end loop;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restaurar_tabla(p_tabla text, p_filas jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n integer; v_seq text;
begin
  if not es_dueno() then raise exception 'Solo el dueño puede restaurar copias.'; end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = p_tabla and c.relkind = 'r') then
    return -1;
  end if;
  execute format('insert into public.%I overriding system value select * from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing', p_tabla, p_tabla)
    using p_filas;
  get diagnostics v_n = row_count;
  begin
    v_seq := pg_get_serial_sequence('public.' || quote_ident(p_tabla), 'id');
    if v_seq is not null then
      execute format('select setval(%L, greatest((select coalesce(max(id), 0) from public.%I), 1))', v_seq, p_tabla);
    end if;
  exception when others then null; end;
  return v_n;
end $function$
;

CREATE OR REPLACE FUNCTION public.save_crm_snapshot_if_version(p_expected_version bigint, p_payload jsonb)
 RETURNS TABLE(saved boolean, current_version bigint, current_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_version bigint;
  v_updated_at timestamptz;
  v_old_payload jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;

  select p.organization_id into v_org
  from public.profiles p
  where p.id=v_user and p.active=true;
  if v_org is null then raise exception 'active profile required'; end if;

  select s.version,s.updated_at,s.payload
    into v_version,v_updated_at,v_old_payload
  from public.crm_snapshots s
  where s.organization_id=v_org
  for update;

  if not found then
    if coalesce(p_expected_version,0)<>0 then
      return query select false,0::bigint,null::timestamptz; return;
    end if;
    insert into public.crm_snapshots(organization_id,payload,version,updated_by,updated_at)
    values(v_org,p_payload,1,v_user,now())
    returning version,updated_at into v_version,v_updated_at;
    return query select true,v_version,v_updated_at; return;
  end if;

  if v_version<>coalesce(p_expected_version,-1) then
    return query select false,v_version,v_updated_at; return;
  end if;

  insert into public.crm_snapshot_history
    (organization_id,source_version,payload,checksum,reason,saved_by)
  values(v_org,v_version,v_old_payload,md5(v_old_payload::text),'AUTO_BEFORE_SAVE',v_user)
  on conflict (organization_id,source_version,reason) do nothing;

  update public.crm_snapshots s
  set payload=p_payload,version=s.version+1,updated_by=v_user,updated_at=now()
  where s.organization_id=v_org
  returning s.version,s.updated_at into v_version,v_updated_at;

  delete from public.crm_snapshot_history h
  where h.organization_id=v_org
    and h.history_id in (
      select history_id from public.crm_snapshot_history
      where organization_id=v_org
      order by created_at desc,history_id desc
      offset 100
    );

  return query select true,v_version,v_updated_at;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.seguimiento_pedido(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; o pedidos%rowtype; r reparto_vivo%rowtype; i int; pos int; antes int := 0; km double precision := 0;
        la double precision; ln double precision; s record;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then return '{}'::jsonb; end if;
  select * into o from pedidos where cliente_id = v.id and estado::text = 'en_reparto' order by numero desc limit 1;
  if not found then return jsonb_build_object('en_camino', false); end if;
  select * into r from reparto_vivo where id = 1;
  if not found or not r.activo or r.at is null or r.at < now() - interval '3 hours' then
    return jsonb_build_object('en_camino', true, 'numero', o.numero, 'sin_ubicacion', true);
  end if;
  pos := array_position(r.ruta, o.id);
  la := r.lat; ln := r.lng;
  if pos is not null then
    for i in 1 .. pos - 1 loop
      select c.lat, c.lng into s from pedidos p join clientes c on c.id = p.cliente_id where p.id = r.ruta[i] and p.estado::text = 'en_reparto';
      if found then
        antes := antes + 1;
        if s.lat is not null then km := km + km_entre(la, ln, s.lat, s.lng); la := s.lat; ln := s.lng; end if;
      end if;
    end loop;
  end if;
  if v.lat is not null then km := km + km_entre(la, ln, v.lat, v.lng); end if;
  return jsonb_build_object('en_camino', true, 'numero', o.numero, 'lat', r.lat, 'lng', r.lng, 'at', r.at, 'antes', antes,
    'km', round(km::numeric, 1), 'eta_min', round((antes * 10 + km / 25 * 60)::numeric), 'mi_lat', v.lat, 'mi_lng', v.lng);
end $function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin new.updated_at = now(); return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.sorteo_mes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d from (select nullif((select valor from config_app where clave = 'sorteo'), '')::jsonb d) z
   where d->>'mes' = to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') and coalesce((d->>'cada')::numeric, 0) > 0
$function$
;

CREATE OR REPLACE FUNCTION public.subir_comprobante(p_token text, p_monto numeric, p_nota text, p_img text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; r bigint;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  if p_img is null or p_img !~ '^data:image/(webp|jpeg|png);base64,' then raise exception 'Mandá una foto del comprobante.'; end if;
  if length(p_img) > 900000 then raise exception 'La foto es muy pesada. Probá de nuevo.'; end if;
  if (select count(*) from comprobantes_cliente where cliente_id = v.id and creado_en > now() - interval '1 day') >= 10 then
    raise exception 'Ya mandaste varios comprobantes hoy. Si hace falta, escribinos por WhatsApp.'; end if;
  insert into comprobantes_cliente (cliente_id, monto, nota, imagen) values (v.id, nullif(p_monto, 0), left(nullif(trim(p_nota), ''), 300), p_img) returning id into r;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.sugerencias_juntos()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with o as (select distinct i.pedido_id, i.producto_id from pedido_items i join pedidos p on p.id = i.pedido_id
              where p.estado::text <> 'cancelado' and p.creado_en > now() - interval '180 days'),
  pr as (select a.producto_id x, b.producto_id y, count(*) n from o a join o b on a.pedido_id = b.pedido_id and a.producto_id <> b.producto_id
          group by 1, 2 having count(*) >= 2),
  rk as (select x, y, n, row_number() over (partition by x order by n desc) r from pr)
  select coalesce(jsonb_object_agg(x, ys), '{}'::jsonb) from (select x, jsonb_agg(y order by n desc) ys from rk where r <= 5 group by x) z
$function$
;

CREATE OR REPLACE FUNCTION public.sugerido_cliente(p_cliente uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with u as (select id from pedidos where cliente_id = p_cliente and estado::text <> 'cancelado' order by numero desc limit 6),
  n as (select count(*) n from u),
  x as (select i.producto_id pid, count(distinct i.pedido_id) veces, sum(i.cantidad) / count(distinct i.pedido_id) q
          from pedido_items i join u on u.id = i.pedido_id group by 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', pid, 'q', greatest(round(q), 1)) order by veces desc, q desc), '[]'::jsonb)
    from x, n where n.n >= 2 and x.veces >= greatest(2, ceil(n.n * 0.5))
$function$
;

CREATE OR REPLACE FUNCTION public.sugerir_producto(p_token text, p_texto text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; t text := left(trim(coalesce(p_texto, '')), 120);
begin
  if length(t) < 3 then raise exception 'Escribí qué producto te gustaría.'; end if;
  if coalesce(p_token, '') <> '' then select id into v_id from clientes where token_pedidos = p_token; end if;
  if (select count(*) from pedidos_sugeridos where creado_en > now() - interval '1 hour') > 60 then raise exception 'Probá de nuevo en un rato.'; end if;
  insert into pedidos_sugeridos (cliente_id, texto) values (v_id, t);
  return jsonb_build_object('ok', true);
end $function$
;

CREATE OR REPLACE FUNCTION public.surtido_rubro(p_rubro text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(pid order by n desc), '[]'::jsonb) from (
    select i.producto_id pid, count(distinct p.cliente_id) n
      from pedido_items i join pedidos p on p.id = i.pedido_id join clientes c on c.id = p.cliente_id
     where lower(trim(c.rubro)) = lower(trim(p_rubro)) and p.estado::text <> 'cancelado' and p.creado_en > now() - interval '180 days'
     group by 1 order by 2 desc limit 24) z
$function$
;

CREATE OR REPLACE FUNCTION public.test_crm_snapshot_restore()
 RETURNS TABLE(ok boolean, tested_history_id bigint, tested_version bigint, payload_bytes bigint, clients_count integer, suppliers_count integer, checksum text, tested_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid:=auth.uid();
  v_org uuid;
  v_role text;
  v_history_id bigint;
  v_version bigint;
  v_payload jsonb;
  v_expected text;
  v_test_id bigint;
  v_actual text;
  v_ok boolean;
  v_clients integer:=0;
  v_suppliers integer:=0;
  v_time timestamptz:=now();
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select p.organization_id,p.role::text into v_org,v_role
  from public.profiles p where p.id=v_user and p.active=true;
  if v_org is null then raise exception 'active profile required'; end if;
  if v_role not in ('OWNER','ADMIN') then raise exception 'owner or admin required'; end if;

  select h.history_id,h.source_version,h.payload,h.checksum
    into v_history_id,v_version,v_payload,v_expected
  from public.crm_snapshot_history h
  where h.organization_id=v_org
  order by h.created_at desc,h.history_id desc
  limit 1;
  if v_history_id is null then raise exception 'no historical backup available'; end if;

  insert into public.crm_restore_test_runs
    (organization_id,history_id,source_version,restored_payload,expected_checksum,tested_by,created_at)
  values(v_org,v_history_id,v_version,v_payload,v_expected,v_user,v_time)
  returning test_id into v_test_id;

  select md5(t.restored_payload::text) into v_actual
  from public.crm_restore_test_runs t where t.test_id=v_test_id;

  v_ok := v_actual=v_expected
    and jsonb_typeof(v_payload)='object'
    and v_payload ? 'arrays'
    and v_payload ? 'objects'
    and v_payload ? 'values'
    and v_payload ? 'localData';

  begin
    v_clients:=jsonb_array_length((v_payload->'localData'->>'sdmp_clientes_admin_v1')::jsonb);
  exception when others then v_clients:=0; end;
  begin
    v_suppliers:=jsonb_array_length((v_payload->'localData'->>'sdmp_proveedores_admin_v1')::jsonb);
  exception when others then v_suppliers:=0; end;

  update public.crm_restore_test_runs
  set actual_checksum=v_actual,verified=v_ok
  where test_id=v_test_id;

  delete from public.crm_restore_test_runs t
  where t.organization_id=v_org
    and t.test_id in (
      select test_id from public.crm_restore_test_runs
      where organization_id=v_org
      order by created_at desc,test_id desc
      offset 10
    );

  return query select v_ok,v_history_id,v_version,
    octet_length(v_payload::text)::bigint,v_clients,v_suppliers,v_actual,v_time;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tiene_rol(VARIADIC roles rol_usuario[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select rol = any(roles) from perfiles where id = auth.uid() and activo),
    false)
$function$
;

CREATE OR REPLACE FUNCTION public.tocar_actualizado_en()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.actualizado_en = now(); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.unificar_clientes(p_queda uuid, p_sale uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; rr record; n int := 0; a clientes%rowtype; b clientes%rowtype;
begin
  if not exists (select 1 from perfiles where id = auth.uid() and rol::text = 'dueno') then raise exception 'Solo el dueño puede unificar clientes.'; end if;
  if p_queda = p_sale then raise exception 'Elegí dos clientes distintos.'; end if;
  select * into a from clientes where id = p_queda; select * into b from clientes where id = p_sale;
  if a.id is null or b.id is null then raise exception 'No encontré los clientes.'; end if;
  for r in
    select c.conrelid::regclass::text tabla, att.attname col
      from pg_constraint c join pg_attribute att on att.attrelid = c.conrelid and att.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.clientes'::regclass and array_length(c.conkey, 1) = 1
  loop
    begin
      execute format('update %s set %I = $1 where %I = $2', r.tabla, r.col, r.col) using p_queda, p_sale;
    exception when unique_violation then
      -- uno por uno: lo que choca (ej.: el mismo precio pactado en los dos) queda el del que se queda
      for rr in execute format('select ctid c from %s where %I = $1', r.tabla, r.col) using p_sale loop
        begin
          execute format('update %s set %I = $1 where ctid = $2', r.tabla, r.col) using p_queda, rr.c;
        exception when unique_violation then
          execute format('delete from %s where ctid = $1', r.tabla) using rr.c;
        end;
      end loop;
    end;
    n := n + 1;
  end loop;
  -- Completa los datos que le falten al que queda
  update clientes set telefono = coalesce(nullif(a.telefono, ''), b.telefono), domicilio = coalesce(nullif(a.domicilio, ''), b.domicilio),
         cuit = coalesce(nullif(a.cuit, ''), b.cuit), email = coalesce(nullif(a.email, ''), b.email), ciudad = coalesce(nullif(a.ciudad, ''), b.ciudad),
         contacto = coalesce(nullif(a.contacto, ''), b.contacto), rubro = coalesce(nullif(a.rubro, ''), b.rubro),
         lat = coalesce(a.lat, b.lat), lng = coalesce(a.lng, b.lng), cumpleanos = coalesce(a.cumpleanos, b.cumpleanos),
         observaciones = nullif(concat_ws(' · ', nullif(a.observaciones, ''), nullif(b.observaciones, '')), '')
   where id = p_queda;
  begin
    delete from clientes where id = p_sale;
  exception when others then
    update clientes set activo = false, razon_social = '(unificado) ' || b.razon_social where id = p_sale;
  end;
  return 'Unificados (' || n || ' tablas revisadas)';
end $function$
;

CREATE OR REPLACE FUNCTION public.unificar_proveedores(p_destino uuid, p_origenes uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not es_dueno() then raise exception 'Solo el dueño puede unificar proveedores'; end if;
  return _unificar_proveedores(p_destino, p_origenes);
end $function$
;

CREATE OR REPLACE FUNCTION public.validar_cupon(p_token text, p_codigo text, p_monto numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cli uuid; v_pct numeric;
begin
  if coalesce(p_token, '') <> '' then select id into v_cli from clientes where token_pedidos = p_token; end if;
  v_pct := cupon_pct(p_codigo, v_cli, p_monto);
  return jsonb_build_object('ok', true, 'codigo', upper(trim(p_codigo)), 'pct', v_pct);
exception when others then
  return jsonb_build_object('ok', false, 'msg', sqlerrm);
end $function$
;

CREATE OR REPLACE FUNCTION public.validar_imputacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_total numeric; v_cli_f uuid;
  v_importe numeric; v_cli_r uuid;
  v_imputado_factura numeric; v_imputado_recibo numeric;
begin
  select total, cliente_id into v_total, v_cli_f from facturas_venta where id = new.factura_id;
  select importe, cliente_id into v_importe, v_cli_r from recibos where id = new.recibo_id;

  if v_cli_f is distinct from v_cli_r then
    raise exception 'La factura y el recibo pertenecen a clientes distintos';
  end if;

  select coalesce(sum(i.importe), 0) into v_imputado_factura
    from recibo_imputaciones i join recibos r on r.id = i.recibo_id
   where i.factura_id = new.factura_id and not r.anulado;
  if v_imputado_factura > v_total + 0.005 then
    raise exception 'No se puede cobrar más que el saldo de la factura';
  end if;

  select coalesce(sum(importe), 0) into v_imputado_recibo
    from recibo_imputaciones where recibo_id = new.recibo_id;
  if v_imputado_recibo > v_importe + 0.005 then
    raise exception 'Las imputaciones superan el importe del recibo';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.vendedores()
 RETURNS TABLE(id uuid, nombre text, rol text, comision_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id, nombre, rol::text, comision_pct from perfiles order by nombre
$function$
;

CREATE OR REPLACE FUNCTION public.votacion_info(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; cf jsonb; mi text; tot jsonb;
begin
  begin cf := nullif((select valor from config_app where clave = 'votacion'), '')::jsonb; exception when others then cf := null; end;
  if cf is null or not coalesce((cf->>'activa')::boolean, false) then return '{}'::jsonb; end if;
  if cf->>'hasta' is not null and (cf->>'hasta')::date < current_date then return '{}'::jsonb; end if;
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if found then select opcion into mi from votos_producto where votacion = cf->>'id' and cliente_id = v.id; end if;
  select coalesce(jsonb_object_agg(opcion, n), '{}'::jsonb) into tot from (select opcion, count(*) n from votos_producto where votacion = cf->>'id' group by opcion) z;
  return jsonb_build_object('id', cf->>'id', 'pregunta', cf->>'pregunta', 'opciones', cf->'opciones', 'mi', mi, 'votos', tot);
end $function$
;

CREATE OR REPLACE FUNCTION public.votar_producto(p_token text, p_opcion text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v clientes%rowtype; cf jsonb;
begin
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if not found then raise exception 'Este link no es válido.'; end if;
  begin cf := nullif((select valor from config_app where clave = 'votacion'), '')::jsonb; exception when others then cf := null; end;
  if cf is null or not coalesce((cf->>'activa')::boolean, false) then raise exception 'La votación ya terminó.'; end if;
  if not exists (select 1 from jsonb_array_elements(cf->'opciones') o where o->>'id' = p_opcion) then raise exception 'Esa opción no existe.'; end if;
  insert into votos_producto (votacion, cliente_id, opcion) values (cf->>'id', v.id, p_opcion)
  on conflict (votacion, cliente_id) do update set opcion = excluded.opcion, creado_en = now();
  return votacion_info(p_token);
end $function$
;

CREATE OR REPLACE FUNCTION public.zona_de(p_ciudad text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when coalesce(trim(regexp_replace(p_ciudad, '\s*\(.*\)$', '')), '') = '' then 'Sin zona'
    else upper(left(trim(regexp_replace(p_ciudad, '\s*\(.*\)$', '')), 1)) || lower(substr(trim(regexp_replace(p_ciudad, '\s*\(.*\)$', '')), 2)) end
$function$
;

create table if not exists private.stage9_config (
  singleton boolean default true not null,
  organization_id uuid not null
);

create table if not exists public.acuerdos (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  monto_mes numeric(14,2) not null,
  tipo text default 'pct'::text not null,
  pct numeric(5,2),
  desde date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date not null,
  hasta date,
  productos jsonb default '[]'::jsonb not null,
  activo boolean default true not null,
  nota text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.alertas_oferta (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  producto_id uuid not null,
  creado_en timestamp with time zone default now() not null,
  avisado_en timestamp with time zone
);

create table if not exists public.audit_log (
  id bigint generated always as identity not null,
  organization_id uuid default private.current_organization_id(),
  user_id uuid default auth.uid(),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  actor_role app_role default private.current_app_role(),
  session_id uuid,
  result text default 'OK'::text not null
);

create table if not exists public.auditoria (
  id bigint generated always as identity not null,
  tabla text not null,
  registro_id text,
  accion text not null,
  datos_antes jsonb,
  datos_despues jsonb,
  usuario_id uuid default auth.uid(),
  fecha timestamp with time zone default now() not null
);

create table if not exists public.avisos_deuda (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha timestamp with time zone default now() not null,
  medio text default 'whatsapp'::text not null,
  monto numeric(14,2),
  usuario_id uuid default auth.uid()
);

create table if not exists public.avisos_stock (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  producto_id uuid not null,
  creado_en timestamp with time zone default now() not null,
  avisado_en timestamp with time zone
);

create table if not exists public.busquedas (
  id bigint generated always as identity not null,
  texto text not null,
  cliente_id uuid,
  fecha timestamp with time zone default now() not null
);

create table if not exists public.campanias_qr (
  codigo text not null,
  nombre text not null,
  tipo text default 'volante'::text not null,
  vendedor_id uuid,
  zona text,
  rubro text,
  activa boolean default true not null,
  creado_en timestamp with time zone default now()
);

create table if not exists public.cargas_combustible (
  id bigint generated always as identity not null,
  fecha date default CURRENT_DATE not null,
  km integer,
  litros numeric(10,2),
  importe numeric(14,2) default 0 not null,
  lleno boolean default true not null,
  nota text,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.carritos (
  cliente_id uuid not null,
  items jsonb default '[]'::jsonb not null,
  total numeric(14,2) default 0 not null,
  actualizado_en timestamp with time zone default now() not null,
  contactado_en timestamp with time zone
);

create table if not exists public.cheques (
  id bigint generated always as identity not null,
  tipo text not null,
  echeq boolean default false not null,
  numero text,
  banco text,
  librador text,
  cuit_librador text,
  importe numeric(14,2) not null,
  fecha_emision date,
  fecha_pago date not null,
  estado text default 'en_cartera'::text not null,
  cliente_id uuid,
  proveedor_id uuid,
  destino text,
  cuenta_id bigint,
  notas text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.cierres_caja (
  fecha date not null,
  efectivo_inicial numeric(14,2) default 0 not null,
  efectivo_esperado numeric(14,2) not null,
  efectivo_contado numeric(14,2) not null,
  diferencia numeric(14,2) generated always as ((efectivo_contado - efectivo_esperado)) stored,
  nota text,
  usuario_id uuid default auth.uid(),
  creado_en timestamp with time zone default now()
);

create table if not exists public.clientes (
  id uuid default gen_random_uuid() not null,
  razon_social text not null,
  cuit text,
  condicion_iva condicion_iva default 'consumidor_final'::condicion_iva not null,
  telefono text,
  domicilio text,
  codigo_postal text,
  ciudad text,
  provincia text,
  email text,
  web text,
  contacto text,
  observaciones text,
  lista lista_precio default 'mayorista'::lista_precio not null,
  condicion_pago_dias integer default 0 not null,
  limite_credito numeric(14,2) default 0 not null,
  descuento_pct numeric(5,2) default 0 not null,
  vendedor_id uuid,
  activo boolean default true not null,
  creado_en timestamp with time zone default now() not null,
  actualizado_en timestamp with time zone default now() not null,
  token_pedidos text default replace((gen_random_uuid())::text, '-'::text, ''::text),
  dias_visita integer[] default '{}'::integer[] not null,
  orden_visita integer default 0 not null,
  lat numeric(9,6),
  lng numeric(9,6),
  codigo_ref text default upper(substr(md5((random())::text), 1, 6)),
  referido_por uuid,
  rubro text,
  favoritos jsonb default '[]'::jsonb not null,
  cliente_desde date,
  origen text,
  campania text,
  cumpleanos date,
  perdido_en date,
  perdido_con text,
  perdido_motivo text,
  cuenta_clave boolean default false not null,
  recibe_desde text,
  recibe_hasta text,
  cerrado_desde date,
  cerrado_hasta date,
  barrio text,
  zona text
);

create table if not exists public.clients (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  code text not null,
  name text not null,
  tax_id text,
  address text,
  city text,
  province text,
  postal_code text,
  phone text,
  email text,
  website text,
  credit_limit numeric(14,2) default 0 not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.cola_impresion (
  id bigint generated always as identity not null,
  tipo text default 'otro'::text not null,
  titulo text default ''::text not null,
  cuerpo text not null,
  estado text default 'pendiente'::text not null,
  error text,
  creado_en timestamp with time zone default now() not null,
  impreso_en timestamp with time zone,
  usuario_id uuid default auth.uid()
);

create table if not exists public.combos (
  id bigint generated always as identity not null,
  nombre text not null,
  descripcion text,
  items jsonb default '[]'::jsonb not null,
  descuento_pct numeric(5,2) default 0 not null,
  activo boolean default true not null,
  desde date default CURRENT_DATE not null,
  hasta date,
  creado_en timestamp with time zone default now(),
  solo_nuevos boolean default false not null
);

create table if not exists public.comodatos (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  tipo text not null,
  descripcion text,
  marca text,
  desde date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date not null,
  minimo_mes numeric(14,2),
  activo boolean default true not null,
  nota text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.comprobantes_cliente (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  monto numeric(14,2),
  nota text,
  imagen text not null,
  estado text default 'nuevo'::text not null,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.config_app (
  clave text not null,
  valor text
);

create table if not exists public.config_listas (
  lista lista_precio not null,
  margen_pct numeric(5,2) not null
);

create table if not exists public.contactos_clientes (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha timestamp with time zone default now() not null,
  tipo text not null,
  detalle text,
  usuario_id uuid default auth.uid()
);

create table if not exists public.costos_proveedor (
  producto_id uuid not null,
  proveedor_id uuid not null,
  costo numeric(14,2) not null,
  fecha timestamp with time zone default now() not null,
  fuente text
);

create table if not exists public.crm_restore_test_runs (
  test_id bigint generated always as identity not null,
  organization_id uuid not null,
  history_id bigint,
  source_version bigint not null,
  restored_payload jsonb not null,
  expected_checksum text not null,
  actual_checksum text,
  verified boolean default false not null,
  tested_by uuid not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.crm_snapshot_history (
  history_id bigint generated always as identity not null,
  organization_id uuid not null,
  source_version bigint not null,
  payload jsonb not null,
  checksum text not null,
  reason text default 'AUTO_BEFORE_SAVE'::text not null,
  saved_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.crm_snapshot_recovery_backups (
  backup_id bigint generated always as identity not null,
  organization_id uuid not null,
  payload jsonb not null,
  source_version bigint,
  reason text not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.crm_snapshots (
  organization_id uuid not null,
  payload jsonb default '{}'::jsonb not null,
  version bigint default 1 not null,
  updated_by uuid,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.cuentas (
  id bigint generated always as identity not null,
  nombre text not null,
  tipo text default 'banco'::text not null,
  saldo_inicial numeric(14,2) default 0 not null,
  fecha_saldo date default CURRENT_DATE not null,
  activa boolean default true not null,
  creado_en timestamp with time zone default now()
);

create table if not exists public.cupones (
  codigo text not null,
  descuento_pct numeric(5,2) not null,
  usos_max integer,
  hasta date,
  minimo numeric(14,2),
  solo_nuevos boolean default false not null,
  activo boolean default true not null,
  creado_en timestamp with time zone default now(),
  cliente_id uuid,
  nota text
);

create table if not exists public.cupones_usos (
  id bigint generated always as identity not null,
  codigo text not null,
  cliente_id uuid,
  pedido_id uuid,
  fecha timestamp with time zone default now()
);

create table if not exists public.documentos_cliente (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  tipo text not null,
  nombre text,
  path text not null,
  vence date,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.encuestas (
  id bigint generated always as identity not null,
  token text default replace((gen_random_uuid())::text, '-'::text, ''::text) not null,
  pedido_id uuid,
  cliente_id uuid,
  puntaje integer,
  comentario text,
  atendida boolean default false not null,
  creado_en timestamp with time zone default now(),
  respondida_en timestamp with time zone,
  publicar boolean default false not null
);

create table if not exists public.envios_auto (
  id bigint generated always as identity not null,
  clave text not null,
  tipo text not null,
  cliente_id uuid,
  prospecto_id uuid,
  detalle text,
  cupon text,
  enviado_en timestamp with time zone default now() not null,
  usuario_id uuid default auth.uid(),
  variante text
);

create table if not exists public.facturas_proveedor (
  id bigint generated always as identity not null,
  proveedor_id uuid not null,
  orden_id bigint,
  tipo text default 'A'::text,
  numero text not null,
  fecha date default CURRENT_DATE not null,
  vencimiento date,
  neto numeric(14,2) default 0 not null,
  iva numeric(14,2) default 0 not null,
  percepciones numeric(14,2) default 0 not null,
  total numeric(14,2) generated always as (((neto + iva) + percepciones)) stored,
  created_at timestamp with time zone default now(),
  perc_iva numeric(14,2) default 0 not null,
  perc_iibb numeric(14,2) default 0 not null
);

create table if not exists public.facturas_venta (
  id uuid default gen_random_uuid() not null,
  tipo tipo_factura not null,
  punto_venta integer default 1 not null,
  numero bigint not null,
  cliente_id uuid not null,
  pedido_id uuid,
  remito_id uuid,
  fecha date default CURRENT_DATE not null,
  vencimiento date not null,
  total numeric(14,2) not null,
  anulada boolean default false not null,
  cae text,
  creado_por uuid default auth.uid(),
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.fotos_cliente (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  path text not null,
  nota text,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.fraccionados (
  id bigint generated always as identity not null,
  fecha timestamp with time zone default now() not null,
  origen_id uuid not null,
  cantidad numeric(14,3) not null,
  kg_bruto numeric(14,3) not null,
  kg_util numeric(14,3) not null,
  merma_kg numeric(14,3) default 0 not null,
  costo numeric(14,2) default 0 not null,
  costo_kg numeric(14,2) default 0 not null,
  destinos jsonb default '[]'::jsonb not null,
  nota text,
  usuario_id uuid default auth.uid()
);

create table if not exists public.gastos (
  id bigint generated always as identity not null,
  fecha date default CURRENT_DATE not null,
  categoria text not null,
  descripcion text,
  importe numeric(14,2) not null,
  medio text default 'efectivo'::text not null,
  usuario_id uuid default auth.uid(),
  creado_en timestamp with time zone default now()
);

create table if not exists public.grupos_pedido (
  codigo text not null,
  creador text not null,
  creado_en timestamp with time zone default now() not null,
  vence timestamp with time zone default (now() + '3 days'::interval) not null
);

create table if not exists public.historial_cambios (
  id bigint generated always as identity not null,
  fecha timestamp with time zone default now() not null,
  usuario_id uuid,
  tabla text not null,
  registro_id text,
  accion text not null,
  cambios jsonb
);

create table if not exists public.historial_costos (
  id bigint generated always as identity not null,
  producto_id uuid not null,
  costo_anterior numeric(14,4) not null,
  costo_nuevo numeric(14,4) not null,
  usuario_id uuid default auth.uid(),
  fecha timestamp with time zone default now() not null
);

create table if not exists public.inventory (
  organization_id uuid not null,
  product_id uuid not null,
  on_hand numeric(14,3) default 0 not null,
  reserved numeric(14,3) default 0 not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.inventory_lot_movements (
  id bigint generated always as identity not null,
  organization_id uuid not null,
  lot_id uuid not null,
  product_code text not null,
  movement_type text not null,
  quantity numeric not null,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.inventory_lots (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  product_code text not null,
  product_name text not null,
  lot_number text not null,
  expires_on date not null,
  quantity_received numeric not null,
  quantity_available numeric not null,
  quantity_reserved numeric default 0 not null,
  supplier_origin text,
  purchase_reference text,
  status text default 'ACTIVE'::text not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.invoices (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  number bigint generated always as identity not null,
  order_id uuid,
  client_id uuid not null,
  status invoice_status default 'UNPAID'::invoice_status not null,
  subtotal numeric(14,2) default 0 not null,
  tax numeric(14,2) default 0 not null,
  total numeric(14,2) default 0 not null,
  paid_amount numeric(14,2) default 0 not null,
  issued_at timestamp with time zone default now() not null,
  created_by uuid
);

create table if not exists public.margenes_familia (
  familia text not null,
  ajuste_pct numeric(5,2) default 0 not null,
  actualizado timestamp with time zone default now() not null
);

create table if not exists public.mermas (
  id bigint generated always as identity not null,
  producto_id uuid not null,
  cantidad numeric(14,3) not null,
  motivo text not null,
  costo numeric(14,2) default 0 not null,
  nota text,
  fecha timestamp with time zone default now() not null,
  usuario_id uuid default auth.uid()
);

create table if not exists public.movimientos_cuenta (
  id bigint generated always as identity not null,
  cuenta_id bigint not null,
  fecha date default CURRENT_DATE not null,
  importe numeric(14,2) not null,
  concepto text not null,
  origen text default 'manual'::text not null,
  ref text,
  transferencia_id uuid,
  usuario_id uuid default auth.uid(),
  creado_en timestamp with time zone default now()
);

create table if not exists public.movimientos_stock (
  id bigint generated always as identity not null,
  producto_id uuid not null,
  tipo text not null,
  cantidad numeric(14,3) not null,
  referencia text,
  usuario_id uuid default auth.uid(),
  fecha timestamp with time zone default now() not null
);

create table if not exists public.muestras (
  id bigint generated always as identity not null,
  cliente_id uuid,
  prospecto_id uuid,
  nombre text,
  telefono text,
  producto_id uuid not null,
  cantidad numeric(14,3),
  fecha date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date not null,
  seguimiento date,
  resultado text,
  nota text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.notas_cliente (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  texto text not null,
  creado_en timestamp with time zone default now() not null,
  audio text
);

create table if not exists public.notas_credito (
  id bigint generated always as identity not null,
  numero bigint not null,
  cliente_id uuid not null,
  pedido_id uuid,
  fecha date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date not null,
  total numeric(14,2) not null,
  motivo text,
  repuesto boolean default true not null,
  items jsonb default '[]'::jsonb not null,
  recibo_numero bigint,
  usuario_id uuid default auth.uid(),
  creado_en timestamp with time zone default now()
);

create table if not exists public.ordenes_compra (
  id bigint generated always as identity not null,
  proveedor_id uuid not null,
  fecha date default CURRENT_DATE not null,
  fecha_entrega date,
  estado text default 'borrador'::text not null,
  observaciones text,
  total numeric(14,2) default 0 not null,
  creado_por uuid default auth.uid(),
  created_at timestamp with time zone default now()
);

create table if not exists public.ordenes_compra_items (
  id bigint generated always as identity not null,
  orden_id bigint not null,
  producto_id uuid not null,
  cantidad numeric(12,2) not null,
  cantidad_recibida numeric(12,2) default 0 not null,
  costo_unitario numeric(14,2) not null,
  subtotal numeric(14,2) generated always as ((cantidad * costo_unitario)) stored
);

create table if not exists public.order_items (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  order_id uuid not null,
  product_id uuid not null,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  subtotal numeric(14,2) generated always as (round((quantity * unit_price), 2)) stored
);

create table if not exists public.orders (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  number bigint generated always as identity not null,
  client_id uuid not null,
  status order_status default 'DRAFT'::order_status not null,
  notes text,
  subtotal numeric(14,2) default 0 not null,
  tax numeric(14,2) default 0 not null,
  total numeric(14,2) default 0 not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.organizations (
  id uuid default gen_random_uuid() not null,
  name text not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.pagos_proveedor (
  id bigint generated always as identity not null,
  proveedor_id uuid not null,
  fecha date default CURRENT_DATE not null,
  medio text default 'transferencia'::text,
  importe numeric(14,2) not null,
  referencia text,
  creado_por uuid default auth.uid(),
  created_at timestamp with time zone default now()
);

create table if not exists public.payments (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  number bigint generated always as identity not null,
  invoice_id uuid not null,
  amount numeric(14,2) not null,
  method payment_method not null,
  reference text,
  paid_at timestamp with time zone default now() not null,
  created_by uuid
);

create table if not exists public.pedido_items (
  id uuid default gen_random_uuid() not null,
  pedido_id uuid not null,
  producto_id uuid not null,
  cantidad numeric(14,3) not null,
  precio_unitario numeric(14,4) not null,
  descuento_pct numeric(5,2) default 0 not null,
  subtotal numeric(14,2) generated always as (round(((cantidad * precio_unitario) * ((1)::numeric - (descuento_pct / (100)::numeric))), 2)) stored,
  promo text,
  costo_unitario numeric(14,2),
  peso_real numeric(10,3),
  precio_kg numeric(14,2),
  lote text,
  precio_manual boolean default false not null,
  precio_lista numeric
);

create table if not exists public.pedidos (
  id uuid default gen_random_uuid() not null,
  numero bigint generated always as identity not null,
  cliente_id uuid not null,
  vendedor_id uuid,
  lista lista_precio not null,
  estado estado_pedido default 'pendiente'::estado_pedido not null,
  descuento_pct numeric(5,2) default 0 not null,
  total numeric(14,2) default 0 not null,
  observaciones text,
  creado_por uuid default auth.uid(),
  creado_en timestamp with time zone default now() not null,
  actualizado_en timestamp with time zone default now() not null,
  origen text default 'crm'::text,
  entregado_en timestamp with time zone,
  foto_remito text,
  auto_aprobado boolean default false not null,
  entrega date,
  firma text,
  firmado_en timestamp with time zone,
  firmado_por text,
  grupo text,
  cliente_ausente boolean default false not null,
  fecha_entrega date
);

create table if not exists public.pedidos_fijos (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  dias integer[] default '{}'::integer[] not null,
  items jsonb default '[]'::jsonb not null,
  nota text,
  activo boolean default true not null,
  ultimo_generado date,
  creado_en timestamp with time zone default now()
);

create table if not exists public.pedidos_sugeridos (
  id bigint generated always as identity not null,
  cliente_id uuid,
  texto text not null,
  estado text default 'nuevo'::text not null,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.pendientes_cliente (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  producto_id uuid not null,
  cantidad numeric(14,3) not null,
  pedido_origen bigint,
  pedido_destino bigint,
  estado text default 'pendiente'::text not null,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.perfiles (
  id uuid not null,
  nombre text not null,
  rol rol_usuario default 'vendedor'::rol_usuario not null,
  activo boolean default false not null,
  creado_en timestamp with time zone default now() not null,
  comision_pct numeric(5,2) default 0 not null
);

create table if not exists public.precios_cliente (
  cliente_id uuid not null,
  producto_id uuid not null,
  precio numeric(14,2) not null,
  actualizado_en timestamp with time zone default now() not null
);

create table if not exists public.precios_competencia (
  id bigint generated always as identity not null,
  producto_id uuid not null,
  competidor text not null,
  precio numeric(14,2) not null,
  fecha date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date not null,
  nota text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.presupuestos (
  id bigint generated always as identity not null,
  numero bigint not null,
  token text default replace((gen_random_uuid())::text, '-'::text, ''::text) not null,
  cliente_id uuid,
  nombre text,
  telefono text,
  lista text default 'mayorista'::text not null,
  items jsonb default '[]'::jsonb not null,
  total numeric(14,2) default 0 not null,
  nota text,
  estado text default 'enviado'::text not null,
  vence date,
  pedido_id uuid,
  respuesta text,
  creado_en timestamp with time zone default now(),
  usuario_id uuid default auth.uid(),
  origen text default 'crm'::text not null,
  campania text
);

create table if not exists public.preventas (
  id bigint generated always as identity not null,
  producto_id uuid,
  nombre text not null,
  descripcion text,
  llega date,
  precio numeric(14,2),
  foto text,
  activa boolean default true not null,
  creado_en timestamp with time zone default now()
);

create table if not exists public.productos (
  id uuid default gen_random_uuid() not null,
  codigo text not null,
  ean text,
  descripcion text not null,
  familia text,
  marca text,
  proveedor_id uuid,
  costo numeric(14,4) default 0 not null,
  stock_minimo numeric(14,3) default 0 not null,
  stock_maximo numeric(14,3) default 0 not null,
  es_privado boolean default false not null,
  activo boolean default true not null,
  creado_en timestamp with time zone default now() not null,
  actualizado_en timestamp with time zone default now() not null,
  codigo_fabricante text,
  unidades_bulto integer default 1 not null,
  tipo_bulto text default 'Caja'::text not null,
  alicuota_iva numeric(4,2) default 21 not null,
  foto text,
  ultimo_conteo date,
  nuevo_hasta date,
  pvp numeric(14,2),
  solo_bulto boolean default false not null,
  por_peso boolean default false not null,
  peso_pieza numeric(10,3)
);

create table if not exists public.products (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  code text not null,
  description text not null,
  family text,
  price numeric(14,2) default 0 not null,
  cost numeric(14,2) default 0 not null,
  stock_controlled boolean default false not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.profiles (
  id uuid not null,
  organization_id uuid,
  full_name text,
  role app_role default 'SELLER'::app_role not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.promesas_pago (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha date not null,
  monto numeric(14,2) default 0 not null,
  nota text,
  estado text default 'pendiente'::text not null,
  cerrada_en timestamp with time zone,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.promociones (
  id bigint generated always as identity not null,
  nombre text not null,
  descuento_pct numeric(5,2) not null,
  alcance text default 'todos'::text not null,
  alcance_valor text,
  minimo_tipo text default 'ninguno'::text not null,
  minimo_unidades integer default 0 not null,
  listas text[],
  desde date default CURRENT_DATE not null,
  hasta date,
  activa boolean default true not null,
  creado_en timestamp with time zone default now(),
  dias_semana integer[],
  cupo integer,
  usados integer default 0 not null
);

create table if not exists public.prospectos (
  id uuid default gen_random_uuid() not null,
  origen_id text,
  nombre text not null,
  rubro text,
  origen text,
  prioridad text default 'media'::text not null,
  estado text default 'pendiente'::text not null,
  telefono text,
  domicilio text,
  ciudad text,
  zona text,
  email text,
  web text,
  contacto text,
  observaciones text,
  conversacion_obs text,
  canal text,
  whatsapp_verificado boolean default false not null,
  ultimo_contacto date,
  proximo_seguimiento date,
  resultado text,
  cliente_id uuid,
  creado_en timestamp with time zone default now() not null,
  actualizado_en timestamp with time zone default now() not null,
  lat numeric(9,6),
  lng numeric(9,6),
  cuit text,
  campania text,
  instagram text
);

create table if not exists public.proveedores (
  id uuid default gen_random_uuid() not null,
  razon_social text not null,
  cuit text,
  condicion_iva condicion_iva default 'responsable_inscripto'::condicion_iva not null,
  telefono text,
  domicilio text,
  ciudad text,
  provincia text,
  email text,
  contacto text,
  condicion_pago_dias integer default 0 not null,
  observaciones text,
  activo boolean default true not null,
  creado_en timestamp with time zone default now() not null,
  actualizado_en timestamp with time zone default now() not null,
  dias_pago integer default 30
);

create table if not exists public.puntos_mov (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha timestamp with time zone default now() not null,
  puntos integer not null,
  motivo text,
  pedido_id uuid
);

create table if not exists public.qr_visitas (
  codigo text not null,
  dia date default ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date not null,
  n integer default 0 not null
);

create table if not exists public.recepciones (
  id bigint generated always as identity not null,
  orden_id bigint not null,
  fecha date default CURRENT_DATE not null,
  remito text,
  creado_por uuid default auth.uid(),
  created_at timestamp with time zone default now()
);

create table if not exists public.recepciones_items (
  id bigint generated always as identity not null,
  recepcion_id bigint not null,
  oc_item_id bigint not null,
  cantidad numeric(12,2) not null
);

create table if not exists public.recibo_imputaciones (
  id uuid default gen_random_uuid() not null,
  recibo_id uuid not null,
  factura_id uuid not null,
  importe numeric(14,2) not null
);

create table if not exists public.recibos (
  id uuid default gen_random_uuid() not null,
  numero bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha timestamp with time zone default now() not null,
  importe numeric(14,2) not null,
  medio medio_pago default 'transferencia'::medio_pago not null,
  observacion text,
  anulado boolean default false not null,
  usuario_id uuid default auth.uid()
);

create table if not exists public.reclamos (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  pedido_numero bigint,
  tipo text not null,
  detalle text,
  foto text,
  estado text default 'abierto'::text not null,
  respuesta text,
  creado_en timestamp with time zone default now() not null,
  resuelto_en timestamp with time zone
);

create table if not exists public.recordatorios (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha date not null,
  creado_en timestamp with time zone default now() not null,
  hecho_en timestamp with time zone
);

create table if not exists public.remito_items (
  id uuid default gen_random_uuid() not null,
  remito_id uuid not null,
  producto_id uuid not null,
  cantidad numeric(14,3) not null,
  precio_unitario numeric(14,4) not null
);

create table if not exists public.remitos (
  id uuid default gen_random_uuid() not null,
  numero bigint generated always as identity not null,
  pedido_id uuid,
  cliente_id uuid not null,
  fecha timestamp with time zone default now() not null,
  estado text default 'emitido'::text not null,
  total numeric(14,2) default 0 not null,
  creado_por uuid default auth.uid()
);

create table if not exists public.reparto_vivo (
  id integer default 1 not null,
  lat double precision,
  lng double precision,
  at timestamp with time zone,
  ruta uuid[] default '{}'::uuid[] not null,
  activo boolean default false not null
);

create table if not exists public.repartos_dia (
  id bigint generated always as identity not null,
  fecha date default CURRENT_DATE not null,
  paradas integer default 0 not null,
  entregados integer default 0 not null,
  km numeric(10,1) default 0 not null,
  costo_km numeric(14,2) default 0 not null,
  combustible numeric(14,2) default 0 not null,
  ganancia numeric(14,2) default 0 not null,
  cobrado numeric(14,2) default 0 not null,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.reservas (
  id bigint generated always as identity not null,
  preventa_id bigint not null,
  cliente_id uuid not null,
  cantidad numeric(14,3) not null,
  pedido_id uuid,
  creado_en timestamp with time zone default now()
);

create table if not exists public.retenciones (
  id bigint generated always as identity not null,
  fecha date default CURRENT_DATE not null,
  tipo text default 'retencion'::text not null,
  impuesto text not null,
  jurisdiccion text,
  cliente_id uuid,
  proveedor_id uuid,
  comprobante text,
  importe numeric(14,2) not null,
  notas text,
  creado_en timestamp with time zone default now()
);

create table if not exists public.stock (
  producto_id uuid not null,
  fisico numeric(14,3) default 0 not null,
  reservado numeric(14,3) default 0 not null,
  disponible numeric(14,3) generated always as ((fisico - reservado)) stored
);

create table if not exists public.suppliers (
  id uuid default gen_random_uuid() not null,
  organization_id uuid not null,
  code text not null,
  name text not null,
  tax_id text,
  address text,
  phone text,
  email text,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.tareas (
  id bigint generated always as identity not null,
  titulo text not null,
  fecha date default CURRENT_DATE not null,
  cliente_id uuid,
  hecha boolean default false not null,
  hecha_en timestamp with time zone,
  creado_en timestamp with time zone default now() not null
);

create table if not exists public.temperaturas (
  id bigint generated always as identity not null,
  camara text default 'Cámara'::text not null,
  temp numeric(5,1) not null,
  nota text,
  fecha timestamp with time zone default now() not null,
  usuario_id uuid default auth.uid()
);

create table if not exists public.vencimientos (
  id bigint generated always as identity not null,
  producto_id uuid not null,
  vence date not null,
  cantidad numeric(14,3),
  lote text,
  nota text,
  retirado boolean default false not null,
  creado_en timestamp with time zone default now()
);

create table if not exists public.vistas_catalogo (
  id bigint generated always as identity not null,
  cliente_id uuid not null,
  fecha timestamp with time zone default now() not null,
  ultima timestamp with time zone default now() not null,
  veces integer default 1 not null,
  fams text[] default '{}'::text[] not null
);

create table if not exists public.votos_producto (
  id bigint generated always as identity not null,
  votacion text not null,
  cliente_id uuid not null,
  opcion text not null,
  creado_en timestamp with time zone default now() not null
);

alter table private.stage9_config add constraint stage9_config_pkey PRIMARY KEY (singleton);

alter table private.stage9_config add constraint stage9_config_singleton_check CHECK (singleton);

alter table public.acuerdos add constraint acuerdos_monto_mes_check CHECK ((monto_mes > (0)::numeric));

alter table public.acuerdos add constraint acuerdos_pkey PRIMARY KEY (id);

alter table public.acuerdos add constraint acuerdos_tipo_check CHECK ((tipo = ANY (ARRAY['pct'::text, 'congelado'::text])));

alter table public.alertas_oferta add constraint alertas_oferta_pkey PRIMARY KEY (id);

alter table public.audit_log add constraint audit_log_pkey PRIMARY KEY (id);

alter table public.auditoria add constraint auditoria_pkey PRIMARY KEY (id);

alter table public.avisos_deuda add constraint avisos_deuda_pkey PRIMARY KEY (id);

alter table public.avisos_stock add constraint avisos_stock_pkey PRIMARY KEY (id);

alter table public.busquedas add constraint busquedas_pkey PRIMARY KEY (id);

alter table public.campanias_qr add constraint campanias_qr_pkey PRIMARY KEY (codigo);

alter table public.cargas_combustible add constraint cargas_combustible_pkey PRIMARY KEY (id);

alter table public.carritos add constraint carritos_pkey PRIMARY KEY (cliente_id);

alter table public.cheques add constraint cheques_estado_check CHECK ((estado = ANY (ARRAY['en_cartera'::text, 'depositado'::text, 'endosado'::text, 'cobrado'::text, 'rechazado'::text, 'emitido'::text, 'debitado'::text, 'anulado'::text])));

alter table public.cheques add constraint cheques_importe_check CHECK ((importe > (0)::numeric));

alter table public.cheques add constraint cheques_pkey PRIMARY KEY (id);

alter table public.cheques add constraint cheques_tipo_check CHECK ((tipo = ANY (ARRAY['recibido'::text, 'emitido'::text])));

alter table public.cierres_caja add constraint cierres_caja_pkey PRIMARY KEY (fecha);

alter table public.clientes add constraint clientes_condicion_pago_dias_check CHECK ((condicion_pago_dias >= 0));

alter table public.clientes add constraint clientes_descuento_pct_check CHECK (((descuento_pct >= (0)::numeric) AND (descuento_pct <= (100)::numeric)));

alter table public.clientes add constraint clientes_limite_credito_check CHECK ((limite_credito >= (0)::numeric));

alter table public.clientes add constraint clientes_pkey PRIMARY KEY (id);

alter table public.clients add constraint clients_organization_id_code_key UNIQUE (organization_id, code);

alter table public.clients add constraint clients_pkey PRIMARY KEY (id);

alter table public.cola_impresion add constraint cola_impresion_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'impreso'::text, 'error'::text])));

alter table public.cola_impresion add constraint cola_impresion_pkey PRIMARY KEY (id);

alter table public.combos add constraint combos_descuento_pct_check CHECK (((descuento_pct >= (0)::numeric) AND (descuento_pct < (90)::numeric)));

alter table public.combos add constraint combos_pkey PRIMARY KEY (id);

alter table public.comodatos add constraint comodatos_pkey PRIMARY KEY (id);

alter table public.comprobantes_cliente add constraint comprobantes_cliente_estado_check CHECK ((estado = ANY (ARRAY['nuevo'::text, 'registrado'::text, 'descartado'::text])));

alter table public.comprobantes_cliente add constraint comprobantes_cliente_pkey PRIMARY KEY (id);

alter table public.config_app add constraint config_app_pkey PRIMARY KEY (clave);

alter table public.config_listas add constraint config_listas_margen_pct_check CHECK (((margen_pct >= (0)::numeric) AND (margen_pct < (100)::numeric)));

alter table public.config_listas add constraint config_listas_pkey PRIMARY KEY (lista);

alter table public.contactos_clientes add constraint contactos_clientes_pkey PRIMARY KEY (id);

alter table public.costos_proveedor add constraint costos_proveedor_pkey PRIMARY KEY (producto_id, proveedor_id);

alter table public.crm_restore_test_runs add constraint crm_restore_test_runs_pkey PRIMARY KEY (test_id);

alter table public.crm_snapshot_history add constraint crm_snapshot_history_org_version_reason_unique UNIQUE (organization_id, source_version, reason);

alter table public.crm_snapshot_history add constraint crm_snapshot_history_pkey PRIMARY KEY (history_id);

alter table public.crm_snapshot_recovery_backups add constraint crm_snapshot_recovery_backups_pkey PRIMARY KEY (backup_id);

alter table public.crm_snapshots add constraint crm_snapshots_pkey PRIMARY KEY (organization_id);

alter table public.cuentas add constraint cuentas_pkey PRIMARY KEY (id);

alter table public.cuentas add constraint cuentas_tipo_check CHECK ((tipo = ANY (ARRAY['banco'::text, 'billetera'::text, 'efectivo'::text, 'otro'::text])));

alter table public.cupones add constraint cupones_descuento_pct_check CHECK (((descuento_pct > (0)::numeric) AND (descuento_pct < (90)::numeric)));

alter table public.cupones add constraint cupones_pkey PRIMARY KEY (codigo);

alter table public.cupones_usos add constraint cupones_usos_pkey PRIMARY KEY (id);

alter table public.documentos_cliente add constraint documentos_cliente_pkey PRIMARY KEY (id);

alter table public.encuestas add constraint encuestas_pedido_id_key UNIQUE (pedido_id);

alter table public.encuestas add constraint encuestas_pkey PRIMARY KEY (id);

alter table public.encuestas add constraint encuestas_puntaje_check CHECK (((puntaje >= 1) AND (puntaje <= 5)));

alter table public.encuestas add constraint encuestas_token_key UNIQUE (token);

alter table public.envios_auto add constraint envios_auto_clave_key UNIQUE (clave);

alter table public.envios_auto add constraint envios_auto_pkey PRIMARY KEY (id);

alter table public.facturas_proveedor add constraint facturas_proveedor_pkey PRIMARY KEY (id);

alter table public.facturas_proveedor add constraint facturas_proveedor_proveedor_id_tipo_numero_key UNIQUE (proveedor_id, tipo, numero);

alter table public.facturas_proveedor add constraint facturas_proveedor_tipo_check CHECK ((tipo = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'NC'::text])));

alter table public.facturas_venta add constraint facturas_venta_pkey PRIMARY KEY (id);

alter table public.facturas_venta add constraint facturas_venta_tipo_punto_venta_numero_key UNIQUE (tipo, punto_venta, numero);

alter table public.facturas_venta add constraint facturas_venta_total_check CHECK ((total > (0)::numeric));

alter table public.fotos_cliente add constraint fotos_cliente_pkey PRIMARY KEY (id);

alter table public.fraccionados add constraint fraccionados_pkey PRIMARY KEY (id);

alter table public.gastos add constraint gastos_importe_check CHECK ((importe > (0)::numeric));

alter table public.gastos add constraint gastos_medio_check CHECK ((medio = ANY (ARRAY['efectivo'::text, 'transferencia'::text, 'cheque'::text, 'tarjeta'::text, 'debito_automatico'::text, 'otro'::text])));

alter table public.gastos add constraint gastos_pkey PRIMARY KEY (id);

alter table public.grupos_pedido add constraint grupos_pedido_pkey PRIMARY KEY (codigo);

alter table public.historial_cambios add constraint historial_cambios_pkey PRIMARY KEY (id);

alter table public.historial_costos add constraint historial_costos_pkey PRIMARY KEY (id);

alter table public.inventory add constraint inventory_pkey PRIMARY KEY (organization_id, product_id);

alter table public.inventory add constraint inventory_reserved_check CHECK ((reserved >= (0)::numeric));

alter table public.inventory_lot_movements add constraint inventory_lot_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['ENTRY'::text, 'RESERVE'::text, 'RELEASE'::text, 'EXIT'::text, 'ADJUSTMENT'::text])));

alter table public.inventory_lot_movements add constraint inventory_lot_movements_pkey PRIMARY KEY (id);

alter table public.inventory_lot_movements add constraint inventory_lot_movements_quantity_check CHECK ((quantity > (0)::numeric));

alter table public.inventory_lots add constraint inventory_lots_check CHECK (((quantity_reserved >= (0)::numeric) AND (quantity_reserved <= quantity_available)));

alter table public.inventory_lots add constraint inventory_lots_organization_id_lot_number_key UNIQUE (organization_id, lot_number);

alter table public.inventory_lots add constraint inventory_lots_pkey PRIMARY KEY (id);

alter table public.inventory_lots add constraint inventory_lots_quantity_available_check CHECK ((quantity_available >= (0)::numeric));

alter table public.inventory_lots add constraint inventory_lots_quantity_received_check CHECK ((quantity_received > (0)::numeric));

alter table public.inventory_lots add constraint inventory_lots_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'EXHAUSTED'::text, 'BLOCKED'::text])));

alter table public.invoices add constraint invoices_check CHECK (((paid_amount >= (0)::numeric) AND (paid_amount <= total)));

alter table public.invoices add constraint invoices_organization_id_number_key UNIQUE (organization_id, number);

alter table public.invoices add constraint invoices_pkey PRIMARY KEY (id);

alter table public.margenes_familia add constraint margenes_familia_pkey PRIMARY KEY (familia);

alter table public.mermas add constraint mermas_pkey PRIMARY KEY (id);

alter table public.movimientos_cuenta add constraint movimientos_cuenta_importe_check CHECK ((importe <> (0)::numeric));

alter table public.movimientos_cuenta add constraint movimientos_cuenta_pkey PRIMARY KEY (id);

alter table public.movimientos_stock add constraint movimientos_stock_pkey PRIMARY KEY (id);

alter table public.movimientos_stock add constraint movimientos_stock_tipo_check CHECK ((tipo = ANY (ARRAY['compra'::text, 'venta'::text, 'ajuste'::text, 'devolucion_cliente'::text, 'devolucion_proveedor'::text, 'baja'::text, 'reserva'::text, 'liberacion'::text])));

alter table public.muestras add constraint muestras_pkey PRIMARY KEY (id);

alter table public.notas_cliente add constraint notas_cliente_pkey PRIMARY KEY (id);

alter table public.notas_credito add constraint notas_credito_numero_key UNIQUE (numero);

alter table public.notas_credito add constraint notas_credito_pkey PRIMARY KEY (id);

alter table public.ordenes_compra add constraint ordenes_compra_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'enviada'::text, 'recibida_parcial'::text, 'recibida'::text, 'anulada'::text])));

alter table public.ordenes_compra add constraint ordenes_compra_pkey PRIMARY KEY (id);

alter table public.ordenes_compra_items add constraint ordenes_compra_items_cantidad_check CHECK ((cantidad > (0)::numeric));

alter table public.ordenes_compra_items add constraint ordenes_compra_items_costo_unitario_check CHECK ((costo_unitario >= (0)::numeric));

alter table public.ordenes_compra_items add constraint ordenes_compra_items_pkey PRIMARY KEY (id);

alter table public.order_items add constraint order_items_pkey PRIMARY KEY (id);

alter table public.order_items add constraint order_items_quantity_check CHECK ((quantity > (0)::numeric));

alter table public.order_items add constraint order_items_unit_price_check CHECK ((unit_price >= (0)::numeric));

alter table public.orders add constraint orders_organization_id_number_key UNIQUE (organization_id, number);

alter table public.orders add constraint orders_pkey PRIMARY KEY (id);

alter table public.organizations add constraint organizations_pkey PRIMARY KEY (id);

alter table public.pagos_proveedor add constraint pagos_proveedor_importe_check CHECK ((importe > (0)::numeric));

alter table public.pagos_proveedor add constraint pagos_proveedor_medio_check CHECK ((medio = ANY (ARRAY['efectivo'::text, 'transferencia'::text, 'cheque'::text, 'echeq'::text, 'otro'::text])));

alter table public.pagos_proveedor add constraint pagos_proveedor_pkey PRIMARY KEY (id);

alter table public.payments add constraint payments_amount_check CHECK ((amount > (0)::numeric));

alter table public.payments add constraint payments_organization_id_number_key UNIQUE (organization_id, number);

alter table public.payments add constraint payments_pkey PRIMARY KEY (id);

alter table public.pedido_items add constraint pedido_items_cantidad_check CHECK ((cantidad > (0)::numeric));

alter table public.pedido_items add constraint pedido_items_descuento_pct_check CHECK (((descuento_pct >= (0)::numeric) AND (descuento_pct <= (100)::numeric)));

alter table public.pedido_items add constraint pedido_items_pkey PRIMARY KEY (id);

alter table public.pedido_items add constraint pedido_items_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric));

alter table public.pedidos add constraint pedidos_descuento_pct_check CHECK (((descuento_pct >= (0)::numeric) AND (descuento_pct <= (100)::numeric)));

alter table public.pedidos add constraint pedidos_numero_key UNIQUE (numero);

alter table public.pedidos add constraint pedidos_pkey PRIMARY KEY (id);

alter table public.pedidos_fijos add constraint pedidos_fijos_cliente_id_key UNIQUE (cliente_id);

alter table public.pedidos_fijos add constraint pedidos_fijos_pkey PRIMARY KEY (id);

alter table public.pedidos_sugeridos add constraint pedidos_sugeridos_pkey PRIMARY KEY (id);

alter table public.pendientes_cliente add constraint pendientes_cliente_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'agregado'::text, 'anulado'::text])));

alter table public.pendientes_cliente add constraint pendientes_cliente_pkey PRIMARY KEY (id);

alter table public.perfiles add constraint perfiles_pkey PRIMARY KEY (id);

alter table public.precios_cliente add constraint precios_cliente_pkey PRIMARY KEY (cliente_id, producto_id);

alter table public.precios_cliente add constraint precios_cliente_precio_check CHECK ((precio > (0)::numeric));

alter table public.precios_competencia add constraint precios_competencia_pkey PRIMARY KEY (id);

alter table public.precios_competencia add constraint precios_competencia_precio_check CHECK ((precio > (0)::numeric));

alter table public.presupuestos add constraint presupuestos_estado_check CHECK ((estado = ANY (ARRAY['enviado'::text, 'aceptado'::text, 'rechazado'::text, 'vencido'::text])));

alter table public.presupuestos add constraint presupuestos_numero_key UNIQUE (numero);

alter table public.presupuestos add constraint presupuestos_pkey PRIMARY KEY (id);

alter table public.presupuestos add constraint presupuestos_token_key UNIQUE (token);

alter table public.preventas add constraint preventas_pkey PRIMARY KEY (id);

alter table public.productos add constraint productos_codigo_key UNIQUE (codigo);

alter table public.productos add constraint productos_costo_check CHECK ((costo >= (0)::numeric));

alter table public.productos add constraint productos_pkey PRIMARY KEY (id);

alter table public.products add constraint products_cost_check CHECK ((cost >= (0)::numeric));

alter table public.products add constraint products_organization_id_code_key UNIQUE (organization_id, code);

alter table public.products add constraint products_pkey PRIMARY KEY (id);

alter table public.products add constraint products_price_check CHECK ((price >= (0)::numeric));

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);

alter table public.promesas_pago add constraint promesas_pago_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'cumplida'::text, 'incumplida'::text, 'anulada'::text])));

alter table public.promesas_pago add constraint promesas_pago_pkey PRIMARY KEY (id);

alter table public.promociones add constraint promociones_alcance_check CHECK ((alcance = ANY (ARRAY['todos'::text, 'marca'::text, 'familia'::text, 'producto'::text])));

alter table public.promociones add constraint promociones_descuento_pct_check CHECK (((descuento_pct > (0)::numeric) AND (descuento_pct < (90)::numeric)));

alter table public.promociones add constraint promociones_minimo_tipo_check CHECK ((minimo_tipo = ANY (ARRAY['ninguno'::text, 'unidades'::text, 'bulto'::text])));

alter table public.promociones add constraint promociones_pkey PRIMARY KEY (id);

alter table public.prospectos add constraint prospectos_origen_id_key UNIQUE (origen_id);

alter table public.prospectos add constraint prospectos_pkey PRIMARY KEY (id);

alter table public.prospectos add constraint prospectos_prioridad_check CHECK ((prioridad = ANY (ARRAY['alta'::text, 'media'::text, 'baja'::text])));

alter table public.proveedores add constraint proveedores_condicion_pago_dias_check CHECK ((condicion_pago_dias >= 0));

alter table public.proveedores add constraint proveedores_pkey PRIMARY KEY (id);

alter table public.puntos_mov add constraint puntos_mov_pkey PRIMARY KEY (id);

alter table public.qr_visitas add constraint qr_visitas_pkey PRIMARY KEY (codigo, dia);

alter table public.recepciones add constraint recepciones_pkey PRIMARY KEY (id);

alter table public.recepciones_items add constraint recepciones_items_cantidad_check CHECK ((cantidad > (0)::numeric));

alter table public.recepciones_items add constraint recepciones_items_pkey PRIMARY KEY (id);

alter table public.recibo_imputaciones add constraint recibo_imputaciones_importe_check CHECK ((importe > (0)::numeric));

alter table public.recibo_imputaciones add constraint recibo_imputaciones_pkey PRIMARY KEY (id);

alter table public.recibos add constraint recibos_importe_check CHECK ((importe > (0)::numeric));

alter table public.recibos add constraint recibos_numero_key UNIQUE (numero);

alter table public.recibos add constraint recibos_pkey PRIMARY KEY (id);

alter table public.reclamos add constraint reclamos_estado_check CHECK ((estado = ANY (ARRAY['abierto'::text, 'resuelto'::text])));

alter table public.reclamos add constraint reclamos_pkey PRIMARY KEY (id);

alter table public.recordatorios add constraint recordatorios_pkey PRIMARY KEY (id);

alter table public.remito_items add constraint remito_items_cantidad_check CHECK ((cantidad > (0)::numeric));

alter table public.remito_items add constraint remito_items_pkey PRIMARY KEY (id);

alter table public.remito_items add constraint remito_items_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric));

alter table public.remitos add constraint remitos_estado_check CHECK ((estado = ANY (ARRAY['emitido'::text, 'entregado'::text, 'anulado'::text])));

alter table public.remitos add constraint remitos_numero_key UNIQUE (numero);

alter table public.remitos add constraint remitos_pkey PRIMARY KEY (id);

alter table public.reparto_vivo add constraint reparto_vivo_id_check CHECK ((id = 1));

alter table public.reparto_vivo add constraint reparto_vivo_pkey PRIMARY KEY (id);

alter table public.repartos_dia add constraint repartos_dia_pkey PRIMARY KEY (id);

alter table public.reservas add constraint reservas_cantidad_check CHECK ((cantidad > (0)::numeric));

alter table public.reservas add constraint reservas_pkey PRIMARY KEY (id);

alter table public.reservas add constraint reservas_preventa_id_cliente_id_key UNIQUE (preventa_id, cliente_id);

alter table public.retenciones add constraint retenciones_importe_check CHECK ((importe > (0)::numeric));

alter table public.retenciones add constraint retenciones_impuesto_check CHECK ((impuesto = ANY (ARRAY['IVA'::text, 'IIBB'::text, 'Ganancias'::text, 'SUSS'::text, 'Otro'::text])));

alter table public.retenciones add constraint retenciones_pkey PRIMARY KEY (id);

alter table public.retenciones add constraint retenciones_tipo_check CHECK ((tipo = ANY (ARRAY['retencion'::text, 'percepcion'::text])));

alter table public.stock add constraint stock_pkey PRIMARY KEY (producto_id);

alter table public.stock add constraint stock_reservado_check CHECK ((reservado >= (0)::numeric));

alter table public.suppliers add constraint suppliers_organization_id_code_key UNIQUE (organization_id, code);

alter table public.suppliers add constraint suppliers_pkey PRIMARY KEY (id);

alter table public.tareas add constraint tareas_pkey PRIMARY KEY (id);

alter table public.temperaturas add constraint temperaturas_pkey PRIMARY KEY (id);

alter table public.vencimientos add constraint vencimientos_pkey PRIMARY KEY (id);

alter table public.vistas_catalogo add constraint vistas_catalogo_pkey PRIMARY KEY (id);

alter table public.votos_producto add constraint votos_producto_pkey PRIMARY KEY (id);

alter table public.votos_producto add constraint votos_producto_votacion_cliente_id_key UNIQUE (votacion, cliente_id);

alter table private.stage9_config add constraint stage9_config_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.acuerdos add constraint acuerdos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.alertas_oferta add constraint alertas_oferta_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.alertas_oferta add constraint alertas_oferta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.audit_log add constraint audit_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

alter table public.audit_log add constraint audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.avisos_deuda add constraint avisos_deuda_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.avisos_stock add constraint avisos_stock_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.avisos_stock add constraint avisos_stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.busquedas add constraint busquedas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.carritos add constraint carritos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.cheques add constraint cheques_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.cheques add constraint cheques_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE SET NULL;

alter table public.cheques add constraint cheques_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

alter table public.clientes add constraint clientes_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES perfiles(id);

alter table public.clients add constraint clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.comodatos add constraint comodatos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.comprobantes_cliente add constraint comprobantes_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.contactos_clientes add constraint contactos_clientes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.costos_proveedor add constraint costos_proveedor_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.costos_proveedor add constraint costos_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE;

alter table public.crm_restore_test_runs add constraint crm_restore_test_runs_history_id_fkey FOREIGN KEY (history_id) REFERENCES crm_snapshot_history(history_id) ON DELETE SET NULL;

alter table public.crm_snapshots add constraint crm_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.crm_snapshots add constraint crm_snapshots_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.cupones_usos add constraint cupones_usos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.cupones_usos add constraint cupones_usos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

alter table public.documentos_cliente add constraint documentos_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.encuestas add constraint encuestas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.encuestas add constraint encuestas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;

alter table public.envios_auto add constraint envios_auto_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.envios_auto add constraint envios_auto_prospecto_id_fkey FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE CASCADE;

alter table public.facturas_proveedor add constraint facturas_proveedor_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id);

alter table public.facturas_proveedor add constraint facturas_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);

alter table public.facturas_venta add constraint facturas_venta_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);

alter table public.facturas_venta add constraint facturas_venta_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id);

alter table public.facturas_venta add constraint facturas_venta_remito_id_fkey FOREIGN KEY (remito_id) REFERENCES remitos(id);

alter table public.fotos_cliente add constraint fotos_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.fraccionados add constraint fraccionados_origen_id_fkey FOREIGN KEY (origen_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.historial_costos add constraint historial_costos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.inventory add constraint inventory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.inventory add constraint inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

alter table public.inventory_lot_movements add constraint inventory_lot_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.inventory_lot_movements add constraint inventory_lot_movements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) ON DELETE RESTRICT;

alter table public.inventory_lot_movements add constraint inventory_lot_movements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.inventory_lots add constraint inventory_lots_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.inventory_lots add constraint inventory_lots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.invoices add constraint invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

alter table public.invoices add constraint invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

alter table public.invoices add constraint invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);

alter table public.invoices add constraint invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.mermas add constraint mermas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.movimientos_cuenta add constraint movimientos_cuenta_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE;

alter table public.movimientos_stock add constraint movimientos_stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);

alter table public.muestras add constraint muestras_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.muestras add constraint muestras_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.notas_cliente add constraint notas_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.notas_credito add constraint notas_credito_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);

alter table public.notas_credito add constraint notas_credito_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

alter table public.ordenes_compra add constraint ordenes_compra_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);

alter table public.ordenes_compra_items add constraint ordenes_compra_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE;

alter table public.ordenes_compra_items add constraint ordenes_compra_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);

alter table public.order_items add constraint order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

alter table public.order_items add constraint order_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.order_items add constraint order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

alter table public.orders add constraint orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

alter table public.orders add constraint orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

alter table public.orders add constraint orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.pagos_proveedor add constraint pagos_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);

alter table public.payments add constraint payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

alter table public.payments add constraint payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id);

alter table public.payments add constraint payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.pedido_items add constraint pedido_items_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;

alter table public.pedido_items add constraint pedido_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);

alter table public.pedidos add constraint pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);

alter table public.pedidos add constraint pedidos_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES perfiles(id);

alter table public.pedidos_fijos add constraint pedidos_fijos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.pedidos_sugeridos add constraint pedidos_sugeridos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.pendientes_cliente add constraint pendientes_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.pendientes_cliente add constraint pendientes_cliente_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.perfiles add constraint perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.precios_cliente add constraint precios_cliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.precios_cliente add constraint precios_cliente_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.precios_competencia add constraint precios_competencia_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.presupuestos add constraint presupuestos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.presupuestos add constraint presupuestos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

alter table public.preventas add constraint preventas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL;

alter table public.productos add constraint productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);

alter table public.products add constraint products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.profiles add constraint profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

alter table public.promesas_pago add constraint promesas_pago_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.prospectos add constraint prospectos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);

alter table public.puntos_mov add constraint puntos_mov_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.puntos_mov add constraint puntos_mov_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

alter table public.qr_visitas add constraint qr_visitas_codigo_fkey FOREIGN KEY (codigo) REFERENCES campanias_qr(codigo) ON UPDATE CASCADE ON DELETE CASCADE;

alter table public.recepciones add constraint recepciones_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id);

alter table public.recepciones_items add constraint recepciones_items_oc_item_id_fkey FOREIGN KEY (oc_item_id) REFERENCES ordenes_compra_items(id);

alter table public.recepciones_items add constraint recepciones_items_recepcion_id_fkey FOREIGN KEY (recepcion_id) REFERENCES recepciones(id) ON DELETE CASCADE;

alter table public.recibo_imputaciones add constraint recibo_imputaciones_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES facturas_venta(id);

alter table public.recibo_imputaciones add constraint recibo_imputaciones_recibo_id_fkey FOREIGN KEY (recibo_id) REFERENCES recibos(id) ON DELETE CASCADE;

alter table public.recibos add constraint recibos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);

alter table public.reclamos add constraint reclamos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.recordatorios add constraint recordatorios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.remito_items add constraint remito_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);

alter table public.remito_items add constraint remito_items_remito_id_fkey FOREIGN KEY (remito_id) REFERENCES remitos(id) ON DELETE CASCADE;

alter table public.remitos add constraint remitos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);

alter table public.remitos add constraint remitos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES pedidos(id);

alter table public.reservas add constraint reservas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.reservas add constraint reservas_preventa_id_fkey FOREIGN KEY (preventa_id) REFERENCES preventas(id) ON DELETE CASCADE;

alter table public.retenciones add constraint retenciones_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.retenciones add constraint retenciones_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

alter table public.stock add constraint stock_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.suppliers add constraint suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table public.tareas add constraint tareas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.vencimientos add constraint vencimientos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

alter table public.vistas_catalogo add constraint vistas_catalogo_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

alter table public.votos_producto add constraint votos_producto_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

CREATE INDEX audit_log_organization_id_idx ON public.audit_log USING btree (organization_id);

CREATE INDEX audit_log_user_id_idx ON public.audit_log USING btree (user_id);

CREATE INDEX auditoria_tabla_fecha_idx ON public.auditoria USING btree (tabla, fecha DESC);

CREATE INDEX avisos_deuda_cliente ON public.avisos_deuda USING btree (cliente_id, fecha DESC);

CREATE INDEX busquedas_fecha ON public.busquedas USING btree (fecha);

CREATE INDEX cheques_pago ON public.cheques USING btree (estado, fecha_pago);

CREATE INDEX clientes_cuit_idx ON public.clientes USING btree (cuit);

CREATE INDEX clientes_razon_social_idx ON public.clientes USING btree (razon_social);

CREATE INDEX clients_org_name_idx ON public.clients USING btree (organization_id, name);

CREATE INDEX cola_impresion_pend ON public.cola_impresion USING btree (estado, id);

CREATE INDEX contactos_clientes_cf ON public.contactos_clientes USING btree (cliente_id, fecha DESC);

CREATE INDEX crm_restore_test_runs_history_idx ON public.crm_restore_test_runs USING btree (history_id);

CREATE INDEX crm_restore_test_runs_org_created_idx ON public.crm_restore_test_runs USING btree (organization_id, created_at DESC);

CREATE INDEX crm_snapshot_history_org_created_idx ON public.crm_snapshot_history USING btree (organization_id, created_at DESC);

CREATE INDEX crm_snapshots_updated_by_idx ON public.crm_snapshots USING btree (updated_by);

CREATE INDEX cupones_usos_cod ON public.cupones_usos USING btree (codigo, cliente_id);

CREATE INDEX envios_auto_cli ON public.envios_auto USING btree (cliente_id, enviado_en DESC);

CREATE INDEX envios_auto_fecha ON public.envios_auto USING btree (enviado_en DESC);

CREATE INDEX envios_auto_tipo ON public.envios_auto USING btree (tipo, enviado_en DESC);

CREATE INDEX facturas_venta_cliente_id_idx ON public.facturas_venta USING btree (cliente_id);

CREATE INDEX facturas_venta_vencimiento_idx ON public.facturas_venta USING btree (vencimiento);

CREATE INDEX fraccionados_fecha ON public.fraccionados USING btree (fecha);

CREATE INDEX gastos_fecha ON public.gastos USING btree (fecha);

CREATE INDEX historial_fecha ON public.historial_cambios USING btree (fecha DESC);

CREATE INDEX inventory_lot_movements_lot_idx ON public.inventory_lot_movements USING btree (lot_id);

CREATE INDEX inventory_lot_movements_org_product_created_idx ON public.inventory_lot_movements USING btree (organization_id, product_code, created_at DESC);

CREATE INDEX inventory_lots_org_product_expiry_idx ON public.inventory_lots USING btree (organization_id, product_code, expires_on);

CREATE INDEX inventory_product_id_idx ON public.inventory USING btree (product_id);

CREATE INDEX invoices_client_id_idx ON public.invoices USING btree (client_id);

CREATE INDEX invoices_created_by_idx ON public.invoices USING btree (created_by);

CREATE INDEX invoices_order_id_idx ON public.invoices USING btree (order_id);

CREATE INDEX invoices_org_issued_idx ON public.invoices USING btree (organization_id, issued_at DESC);

CREATE INDEX mermas_fecha ON public.mermas USING btree (fecha);

CREATE INDEX movimientos_cuenta_cf ON public.movimientos_cuenta USING btree (cuenta_id, fecha);

CREATE INDEX movimientos_stock_producto_id_fecha_idx ON public.movimientos_stock USING btree (producto_id, fecha DESC);

CREATE INDEX notas_cliente_cli ON public.notas_cliente USING btree (cliente_id);

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);

CREATE INDEX order_items_organization_id_idx ON public.order_items USING btree (organization_id);

CREATE INDEX order_items_product_id_idx ON public.order_items USING btree (product_id);

CREATE INDEX orders_client_id_idx ON public.orders USING btree (client_id);

CREATE INDEX orders_created_by_idx ON public.orders USING btree (created_by);

CREATE INDEX orders_org_created_idx ON public.orders USING btree (organization_id, created_at DESC);

CREATE INDEX payments_created_by_idx ON public.payments USING btree (created_by);

CREATE INDEX payments_invoice_id_idx ON public.payments USING btree (invoice_id);

CREATE INDEX payments_org_paid_idx ON public.payments USING btree (organization_id, paid_at DESC);

CREATE INDEX pedido_items_pedido_id_idx ON public.pedido_items USING btree (pedido_id);

CREATE INDEX pedidos_cliente_id_idx ON public.pedidos USING btree (cliente_id);

CREATE INDEX pedidos_estado_idx ON public.pedidos USING btree (estado);

CREATE INDEX productos_ean_idx ON public.productos USING btree (ean);

CREATE INDEX productos_familia_idx ON public.productos USING btree (familia);

CREATE INDEX productos_to_tsvector_idx ON public.productos USING gin (to_tsvector('spanish'::regconfig, descripcion));

CREATE INDEX products_org_description_idx ON public.products USING btree (organization_id, description);

CREATE INDEX profiles_organization_id_idx ON public.profiles USING btree (organization_id);

CREATE INDEX prospectos_estado_idx ON public.prospectos USING btree (estado);

CREATE INDEX prospectos_seguimiento_idx ON public.prospectos USING btree (proximo_seguimiento);

CREATE INDEX puntos_mov_cli ON public.puntos_mov USING btree (cliente_id);

CREATE INDEX recibo_imputaciones_factura_id_idx ON public.recibo_imputaciones USING btree (factura_id);

CREATE INDEX recibo_imputaciones_recibo_id_idx ON public.recibo_imputaciones USING btree (recibo_id);

CREATE INDEX recibos_cliente_id_idx ON public.recibos USING btree (cliente_id);

CREATE INDEX remitos_cliente_id_idx ON public.remitos USING btree (cliente_id);

CREATE INDEX tareas_pend ON public.tareas USING btree (hecha, fecha);

CREATE INDEX temperaturas_fecha ON public.temperaturas USING btree (fecha);

CREATE INDEX vencimientos_vence ON public.vencimientos USING btree (retirado, vence);

CREATE INDEX vistas_catalogo_fecha ON public.vistas_catalogo USING btree (fecha);

CREATE UNIQUE INDEX alertas_oferta_pend ON public.alertas_oferta USING btree (cliente_id, producto_id) WHERE (avisado_en IS NULL);

CREATE UNIQUE INDEX avisos_stock_pend ON public.avisos_stock USING btree (cliente_id, producto_id) WHERE (avisado_en IS NULL);

CREATE UNIQUE INDEX clientes_codigo_ref ON public.clientes USING btree (codigo_ref);

CREATE UNIQUE INDEX clientes_token_pedidos_key ON public.clientes USING btree (token_pedidos);

CREATE UNIQUE INDEX inventory_lots_org_lot_number_uidx ON public.inventory_lots USING btree (organization_id, lot_number);

CREATE OR REPLACE FUNCTION public.pedido_editable_cliente(p_token text, p_numero bigint)
 RETURNS pedidos
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; o pedidos%rowtype;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  select * into o from pedidos where numero = p_numero and cliente_id = v_id;
  if not found then raise exception 'No encontré ese pedido.'; end if;
  if o.estado::text not in ('pendiente', 'aprobado')
     or exists (select 1 from facturas_venta f where f.pedido_id = o.id) then
    raise exception 'Este pedido ya lo estamos preparando: escribinos por WhatsApp para cambiarlo.';
  end if;
  return o;
end $function$
;

create or replace view public.facturas_estado with (security_invoker=true) as
 SELECT f.id AS factura_id,
    f.tipo,
    f.punto_venta,
    f.numero,
    f.cliente_id,
    f.fecha,
    f.vencimiento,
    f.total,
    COALESCE(c.cobrado, 0::numeric) AS cobrado,
    f.total - COALESCE(c.cobrado, 0::numeric) AS pendiente,
        CASE
            WHEN COALESCE(c.cobrado, 0::numeric) >= f.total THEN 'pagada'::text
            WHEN COALESCE(c.cobrado, 0::numeric) > 0::numeric THEN 'parcial'::text
            ELSE 'impaga'::text
        END AS estado,
    (f.total - COALESCE(c.cobrado, 0::numeric)) > 0.005 AND f.vencimiento < CURRENT_DATE AS vencida,
        CASE
            WHEN (f.total - COALESCE(c.cobrado, 0::numeric)) > 0.005 THEN GREATEST(CURRENT_DATE - f.vencimiento, 0)
            ELSE 0
        END AS dias_mora
   FROM facturas_venta f
     LEFT JOIN LATERAL ( SELECT sum(i.importe) AS cobrado
           FROM recibo_imputaciones i
             JOIN recibos r ON r.id = i.recibo_id
          WHERE i.factura_id = f.id AND NOT r.anulado) c ON true
  WHERE NOT f.anulada;

create or replace view public.precios_lista with (security_invoker=true) as
 SELECT id AS producto_id,
    codigo,
    ean,
    descripcion,
    familia,
    marca,
    costo,
    round(costo / (1::numeric - (( SELECT config_listas.margen_pct
           FROM config_listas
          WHERE config_listas.lista = 'mayorista'::lista_precio)) / 100::numeric), 2) AS precio_mayorista,
    round(costo / (1::numeric - (( SELECT config_listas.margen_pct
           FROM config_listas
          WHERE config_listas.lista = 'minorista'::lista_precio)) / 100::numeric), 2) AS precio_minorista,
    round(costo / (1::numeric - (( SELECT config_listas.margen_pct
           FROM config_listas
          WHERE config_listas.lista = 'especial'::lista_precio)) / 100::numeric), 2) AS precio_especial
   FROM productos p
  WHERE activo;

create or replace view public.saldos_clientes with (security_invoker=true) as
 SELECT cliente_id,
    razon_social,
    limite_credito,
    facturado,
    cobrado,
    facturado - cobrado AS saldo
   FROM ( SELECT c.id AS cliente_id,
            c.razon_social,
            c.limite_credito,
            COALESCE(( SELECT sum(f.total) AS sum
                   FROM facturas_venta f
                  WHERE f.cliente_id = c.id AND NOT f.anulada), 0::numeric) AS facturado,
            COALESCE(( SELECT sum(r.importe) AS sum
                   FROM recibos r
                  WHERE r.cliente_id = c.id AND NOT r.anulado), 0::numeric) AS cobrado
           FROM clientes c) t;

create or replace view public.v_saldo_proveedores with (security_invoker=true) as
 SELECT p.id AS proveedor_id,
    p.razon_social,
    COALESCE(f.facturado, 0::numeric) AS facturado,
    COALESCE(g.pagado, 0::numeric) AS pagado,
    COALESCE(f.facturado, 0::numeric) - COALESCE(g.pagado, 0::numeric) AS saldo
   FROM proveedores p
     LEFT JOIN ( SELECT facturas_proveedor.proveedor_id,
            sum(
                CASE
                    WHEN facturas_proveedor.tipo = 'NC'::text THEN - facturas_proveedor.total
                    ELSE facturas_proveedor.total
                END) AS facturado
           FROM facturas_proveedor
          GROUP BY facturas_proveedor.proveedor_id) f ON f.proveedor_id = p.id
     LEFT JOIN ( SELECT pagos_proveedor.proveedor_id,
            sum(pagos_proveedor.importe) AS pagado
           FROM pagos_proveedor
          GROUP BY pagos_proveedor.proveedor_id) g ON g.proveedor_id = p.id;

create or replace view public.precios_base as
 SELECT producto_id,
    codigo,
    ean,
    descripcion,
    familia,
    marca,
    costo,
    precio_mayorista * margen_familia_factor(familia, 'mayorista'::text) AS precio_mayorista,
    precio_minorista * margen_familia_factor(familia, 'minorista'::text) AS precio_minorista,
    precio_especial * margen_familia_factor(familia, 'especial'::text) AS precio_especial
   FROM precios_lista;

create or replace view public.precios_productos as
 SELECT producto_id,
    codigo,
    ean,
    descripcion,
    familia,
    marca,
    (costo * factor_peso(producto_id::text))::numeric(14,4) AS costo,
    redondear_precio(precio_mayorista * factor_peso(producto_id::text), 'mayorista'::text) AS precio_mayorista,
    redondear_precio(precio_minorista * factor_peso(producto_id::text), 'minorista'::text) AS precio_minorista,
    redondear_precio(precio_especial * factor_peso(producto_id::text), 'especial'::text) AS precio_especial
   FROM precios_base b;

CREATE CONSTRAINT TRIGGER auto_aprobar AFTER INSERT ON public.pedidos DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION auto_aprobar();

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER cupo_promos AFTER INSERT ON public.pedido_items FOR EACH ROW EXECUTE FUNCTION cupo_promos();

CREATE TRIGGER historial_cheques AFTER INSERT OR DELETE OR UPDATE ON public.cheques FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_clientes AFTER INSERT OR DELETE OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_config_listas AFTER INSERT OR DELETE OR UPDATE ON public.config_listas FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_facturas_proveedor AFTER INSERT OR DELETE OR UPDATE ON public.facturas_proveedor FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_facturas_venta AFTER INSERT OR DELETE OR UPDATE ON public.facturas_venta FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_gastos AFTER INSERT OR DELETE OR UPDATE ON public.gastos FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_notas_credito AFTER INSERT OR DELETE OR UPDATE ON public.notas_credito FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_pagos_proveedor AFTER INSERT OR DELETE OR UPDATE ON public.pagos_proveedor FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_pedido_items AFTER INSERT OR DELETE OR UPDATE ON public.pedido_items FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_pedidos AFTER INSERT OR DELETE OR UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_pedidos_fijos AFTER INSERT OR DELETE OR UPDATE ON public.pedidos_fijos FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_productos AFTER INSERT OR DELETE OR UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_promociones AFTER INSERT OR DELETE OR UPDATE ON public.promociones FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER historial_recibos AFTER INSERT OR DELETE OR UPDATE ON public.recibos FOR EACH ROW EXECUTE FUNCTION registrar_historial();

CREATE TRIGGER inventory_lots_set_updated_at BEFORE UPDATE ON public.inventory_lots FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pedido_items_costo BEFORE INSERT ON public.pedido_items FOR EACH ROW EXECUTE FUNCTION poner_costo_item();

CREATE TRIGGER pedidos_entrega BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION marcar_entrega();

CREATE TRIGGER pedidos_puntos AFTER UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION puntos_por_entrega();

CREATE TRIGGER pi_precio_lista BEFORE INSERT ON public.pedido_items FOR EACH ROW EXECUTE FUNCTION pi_precio_lista();

CREATE TRIGGER premio_online AFTER INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION premio_online();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_actualizado BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

CREATE TRIGGER trg_actualizado BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

CREATE TRIGGER trg_actualizado BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

CREATE TRIGGER trg_actualizado BEFORE UPDATE ON public.prospectos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

CREATE TRIGGER trg_actualizado BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.config_listas FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.facturas_venta FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.prospectos FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.recibo_imputaciones FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_auditar AFTER INSERT OR DELETE OR UPDATE ON public.recibos FOR EACH ROW EXECUTE FUNCTION auditar();

CREATE TRIGGER trg_costo_historial AFTER UPDATE OF costo ON public.productos FOR EACH ROW EXECUTE FUNCTION registrar_cambio_costo();

CREATE TRIGGER trg_crear_perfil AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION crear_perfil_nuevo_usuario();

CREATE TRIGGER trg_crm_snapshot_fefo_delivery AFTER UPDATE OF payload ON public.crm_snapshots FOR EACH ROW EXECUTE FUNCTION crm_snapshot_fefo_delivery_trigger();

CREATE TRIGGER trg_crm_snapshot_fefo_reserve AFTER UPDATE OF payload ON public.crm_snapshots FOR EACH ROW EXECUTE FUNCTION crm_snapshot_fefo_reserve_trigger();

CREATE TRIGGER trg_oc_total AFTER INSERT OR DELETE OR UPDATE ON public.ordenes_compra_items FOR EACH ROW EXECUTE FUNCTION oc_recalcular_total();

CREATE TRIGGER trg_pedido_stock AFTER UPDATE OF estado ON public.pedidos FOR EACH ROW EXECUTE FUNCTION pedido_mueve_stock();

CREATE TRIGGER trg_total_pedido AFTER INSERT OR DELETE OR UPDATE ON public.pedido_items FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

CREATE TRIGGER trg_validar_imputacion AFTER INSERT OR UPDATE ON public.recibo_imputaciones FOR EACH ROW EXECUTE FUNCTION validar_imputacion();

alter table public.acuerdos enable row level security;

alter table public.alertas_oferta enable row level security;

alter table public.audit_log enable row level security;

alter table public.auditoria enable row level security;

alter table public.avisos_deuda enable row level security;

alter table public.avisos_stock enable row level security;

alter table public.busquedas enable row level security;

alter table public.campanias_qr enable row level security;

alter table public.cargas_combustible enable row level security;

alter table public.carritos enable row level security;

alter table public.cheques enable row level security;

alter table public.cierres_caja enable row level security;

alter table public.clientes enable row level security;

alter table public.clients enable row level security;

alter table public.cola_impresion enable row level security;

alter table public.combos enable row level security;

alter table public.comodatos enable row level security;

alter table public.comprobantes_cliente enable row level security;

alter table public.config_app enable row level security;

alter table public.config_listas enable row level security;

alter table public.contactos_clientes enable row level security;

alter table public.costos_proveedor enable row level security;

alter table public.crm_restore_test_runs enable row level security;

alter table public.crm_snapshot_history enable row level security;

alter table public.crm_snapshot_recovery_backups enable row level security;

alter table public.crm_snapshots enable row level security;

alter table public.cuentas enable row level security;

alter table public.cupones enable row level security;

alter table public.cupones_usos enable row level security;

alter table public.documentos_cliente enable row level security;

alter table public.encuestas enable row level security;

alter table public.envios_auto enable row level security;

alter table public.facturas_proveedor enable row level security;

alter table public.facturas_venta enable row level security;

alter table public.fotos_cliente enable row level security;

alter table public.fraccionados enable row level security;

alter table public.gastos enable row level security;

alter table public.grupos_pedido enable row level security;

alter table public.historial_cambios enable row level security;

alter table public.historial_costos enable row level security;

alter table public.inventory enable row level security;

alter table public.inventory_lot_movements enable row level security;

alter table public.inventory_lots enable row level security;

alter table public.invoices enable row level security;

alter table public.margenes_familia enable row level security;

alter table public.mermas enable row level security;

alter table public.movimientos_cuenta enable row level security;

alter table public.movimientos_stock enable row level security;

alter table public.muestras enable row level security;

alter table public.notas_cliente enable row level security;

alter table public.notas_credito enable row level security;

alter table public.ordenes_compra enable row level security;

alter table public.ordenes_compra_items enable row level security;

alter table public.order_items enable row level security;

alter table public.orders enable row level security;

alter table public.organizations enable row level security;

alter table public.pagos_proveedor enable row level security;

alter table public.payments enable row level security;

alter table public.pedido_items enable row level security;

alter table public.pedidos enable row level security;

alter table public.pedidos_fijos enable row level security;

alter table public.pedidos_sugeridos enable row level security;

alter table public.pendientes_cliente enable row level security;

alter table public.perfiles enable row level security;

alter table public.precios_cliente enable row level security;

alter table public.precios_competencia enable row level security;

alter table public.presupuestos enable row level security;

alter table public.preventas enable row level security;

alter table public.productos enable row level security;

alter table public.products enable row level security;

alter table public.profiles enable row level security;

alter table public.promesas_pago enable row level security;

alter table public.promociones enable row level security;

alter table public.prospectos enable row level security;

alter table public.proveedores enable row level security;

alter table public.puntos_mov enable row level security;

alter table public.qr_visitas enable row level security;

alter table public.recepciones enable row level security;

alter table public.recepciones_items enable row level security;

alter table public.recibo_imputaciones enable row level security;

alter table public.recibos enable row level security;

alter table public.reclamos enable row level security;

alter table public.recordatorios enable row level security;

alter table public.remito_items enable row level security;

alter table public.remitos enable row level security;

alter table public.reparto_vivo enable row level security;

alter table public.repartos_dia enable row level security;

alter table public.reservas enable row level security;

alter table public.retenciones enable row level security;

alter table public.stock enable row level security;

alter table public.suppliers enable row level security;

alter table public.tareas enable row level security;

alter table public.temperaturas enable row level security;

alter table public.vencimientos enable row level security;

alter table public.vistas_catalogo enable row level security;

alter table public.votos_producto enable row level security;

create policy audit_insert_self on public.audit_log as permissive for insert to authenticated with check (((organization_id = private.current_organization_id()) AND (user_id = ( SELECT auth.uid() AS uid)) AND (actor_role = private.current_app_role()) AND COALESCE(( SELECT p.active
   FROM profiles p
  WHERE (p.id = ( SELECT auth.uid() AS uid))), false)));

create policy audit_select on public.audit_log as permissive for select to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role]))));

create policy auditoria_lectura on public.auditoria as permissive for select to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy auth_all on public.acuerdos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.alertas_oferta as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.avisos_deuda as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.avisos_stock as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.busquedas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.campanias_qr as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.cargas_combustible as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.carritos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.cola_impresion as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.comodatos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.comprobantes_cliente as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.config_app as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.contactos_clientes as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.costos_proveedor as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.cupones_usos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.documentos_cliente as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.encuestas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.envios_auto as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.facturas_proveedor as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.fotos_cliente as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.fraccionados as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.grupos_pedido as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.mermas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.muestras as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.notas_cliente as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.notas_credito as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.ordenes_compra as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.ordenes_compra_items as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.pagos_proveedor as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.pedidos_fijos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.pedidos_sugeridos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.pendientes_cliente as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.precios_competencia as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.presupuestos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.preventas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.promesas_pago as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.prospectos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.puntos_mov as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.qr_visitas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.recepciones as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.recepciones_items as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.reclamos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.recordatorios as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.reparto_vivo as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.repartos_dia as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.reservas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.tareas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.temperaturas as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.vencimientos as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.vistas_catalogo as permissive for all to authenticated using (true) with check (true);

create policy auth_all on public.votos_producto as permissive for all to authenticated using (true) with check (true);

create policy clientes_delete on public.clientes as permissive for delete to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario]));

create policy clientes_insert on public.clientes as permissive for insert to authenticated with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario]));

create policy clientes_lectura on public.clientes as permissive for select to authenticated using (es_usuario_activo());

create policy clientes_update on public.clientes as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario]));

create policy clients_delete on public.clients as permissive for delete to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role]))));

create policy clients_insert on public.clients as permissive for insert to public with check (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SELLER'::app_role]))));

create policy clients_select on public.clients as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy clients_update on public.clients as permissive for update to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SELLER'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy config_listas_escritura on public.config_listas as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy config_listas_lectura on public.config_listas as permissive for select to authenticated using (es_usuario_activo());

create policy crm_restore_test_runs_deny on public.crm_restore_test_runs as restrictive for all to authenticated using (false) with check (false);

create policy crm_snapshot_history_select on public.crm_snapshot_history as permissive for select to authenticated using ((organization_id = private.current_organization_id()));

create policy crm_snapshot_recovery_backups_deny on public.crm_snapshot_recovery_backups as restrictive for all to authenticated using (false) with check (false);

create policy crm_snapshots_insert on public.crm_snapshots as permissive for insert to authenticated with check (((organization_id = private.current_organization_id()) AND (updated_by = ( SELECT auth.uid() AS uid))));

create policy crm_snapshots_select on public.crm_snapshots as permissive for select to authenticated using ((organization_id = private.current_organization_id()));

create policy crm_snapshots_update on public.crm_snapshots as permissive for update to authenticated using ((organization_id = private.current_organization_id())) with check (((organization_id = private.current_organization_id()) AND (updated_by = ( SELECT auth.uid() AS uid))));

create policy dueno_combos on public.combos as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy dueno_cupones on public.cupones as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy dueno_pactados on public.precios_cliente as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy dueno_promos on public.promociones as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy facturas_insert on public.facturas_venta as permissive for insert to authenticated with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy facturas_update on public.facturas_venta as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy facturas_venta_lectura on public.facturas_venta as permissive for select to authenticated using (es_usuario_activo());

create policy historial_costos_lectura on public.historial_costos as permissive for select to authenticated using (es_usuario_activo());

create policy imputaciones_insert on public.recibo_imputaciones as permissive for insert to authenticated with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy imputaciones_update on public.recibo_imputaciones as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy inventory_lot_movements_insert on public.inventory_lot_movements as permissive for insert to authenticated with check (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role]))));

create policy inventory_lot_movements_select on public.inventory_lot_movements as permissive for select to authenticated using ((organization_id = private.current_organization_id()));

create policy inventory_lots_select on public.inventory_lots as permissive for select to authenticated using ((organization_id = private.current_organization_id()));

create policy inventory_lots_write on public.inventory_lots as permissive for all to authenticated using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role])))) with check (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role]))));

create policy inventory_select on public.inventory as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy inventory_write on public.inventory as permissive for all to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy invoices_select on public.invoices as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy invoices_write on public.invoices as permissive for all to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy leer_combos on public.combos as permissive for select to authenticated using (true);

create policy leer_cupones on public.cupones as permissive for select to authenticated using (true);

create policy leer_margenes_familia on public.margenes_familia as permissive for select to authenticated using (true);

create policy leer_pactados on public.precios_cliente as permissive for select to authenticated using (true);

create policy leer_promos on public.promociones as permissive for select to authenticated using (true);

create policy movimientos_stock_escritura on public.movimientos_stock as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario]));

create policy movimientos_stock_lectura on public.movimientos_stock as permissive for select to authenticated using (es_usuario_activo());

create policy order_items_select on public.order_items as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy order_items_write on public.order_items as permissive for all to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SELLER'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy orders_insert on public.orders as permissive for insert to public with check (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SELLER'::app_role]))));

create policy orders_select on public.orders as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy orders_update on public.orders as permissive for update to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SELLER'::app_role, 'WAREHOUSE'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy organizations_select on public.organizations as permissive for select to public using ((id = private.current_organization_id()));

create policy organizations_update on public.organizations as permissive for update to public using (((id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role])))) with check ((id = private.current_organization_id()));

create policy payments_select on public.payments as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy payments_write on public.payments as permissive for all to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy pedido_items_escritura on public.pedido_items as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario]));

create policy pedido_items_lectura on public.pedido_items as permissive for select to authenticated using (es_usuario_activo());

create policy pedidos_delete on public.pedidos as permissive for delete to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario]));

create policy pedidos_insert on public.pedidos as permissive for insert to authenticated with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario]));

create policy pedidos_lectura on public.pedidos as permissive for select to authenticated using (es_usuario_activo());

create policy pedidos_update on public.pedidos as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario, 'deposito'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario, 'deposito'::rol_usuario]));

create policy perfiles_admin on public.perfiles as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario]));

create policy perfiles_lectura on public.perfiles as permissive for select to authenticated using (((id = auth.uid()) OR tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])));

create policy productos_escritura on public.productos as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy productos_lectura on public.productos as permissive for select to authenticated using (es_usuario_activo());

create policy products_select on public.products as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy products_write on public.products as permissive for all to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy profiles_select on public.profiles as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy profiles_update_admin on public.profiles as permissive for update to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role])))) with check ((organization_id = private.current_organization_id()));

create policy prospectos_delete on public.prospectos as permissive for delete to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario]));

create policy prospectos_insert on public.prospectos as permissive for insert to authenticated with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario]));

create policy prospectos_lectura on public.prospectos as permissive for select to authenticated using (es_usuario_activo());

create policy prospectos_update on public.prospectos as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'vendedor'::rol_usuario]));

create policy proveedores_escritura on public.proveedores as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy proveedores_lectura on public.proveedores as permissive for select to authenticated using (es_usuario_activo());

create policy recibo_imputaciones_lectura on public.recibo_imputaciones as permissive for select to authenticated using (es_usuario_activo());

create policy recibos_insert on public.recibos as permissive for insert to authenticated with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy recibos_lectura on public.recibos as permissive for select to authenticated using (es_usuario_activo());

create policy recibos_update on public.recibos as permissive for update to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario]));

create policy remito_items_escritura on public.remito_items as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario]));

create policy remito_items_lectura on public.remito_items as permissive for select to authenticated using (es_usuario_activo());

create policy remitos_escritura on public.remitos as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario]));

create policy remitos_lectura on public.remitos as permissive for select to authenticated using (es_usuario_activo());

create policy solo_dueno on public.cheques as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy solo_dueno on public.cierres_caja as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy solo_dueno on public.cuentas as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy solo_dueno on public.gastos as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy solo_dueno on public.historial_cambios as permissive for select to authenticated using (es_dueno());

create policy solo_dueno on public.movimientos_cuenta as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy solo_dueno on public.retenciones as permissive for all to authenticated using (es_dueno()) with check (es_dueno());

create policy stock_escritura on public.stock as permissive for all to authenticated using (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario])) with check (tiene_rol(VARIADIC ARRAY['dueno'::rol_usuario, 'administracion'::rol_usuario, 'deposito'::rol_usuario]));

create policy stock_lectura on public.stock as permissive for select to authenticated using (es_usuario_activo());

create policy suppliers_select on public.suppliers as permissive for select to public using ((organization_id = private.current_organization_id()));

create policy suppliers_write on public.suppliers as permissive for all to public using (((organization_id = private.current_organization_id()) AND (private.current_app_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role])))) with check ((organization_id = private.current_organization_id()));

grant execute on function private.current_app_role() to authenticated;

grant execute on function private.current_organization_id() to authenticated;

grant execute on function public.ahorro_cliente(p_token text) to anon;

grant execute on function public.ahorro_cliente(p_token text) to authenticated;

grant execute on function public.ajustar_stock(p_producto uuid, p_contado numeric, p_motivo text) to authenticated;

grant execute on function public.alerta_oferta(p_token text, p_producto text) to anon;

grant execute on function public.alerta_oferta(p_token text, p_producto text) to authenticated;

grant execute on function public.alta_web(p_nombre text, p_telefono text, p_domicilio text, p_rubro text, p_contacto text, p_cuit text, p_nota text) to anon;

grant execute on function public.alta_web(p_nombre text, p_telefono text, p_domicilio text, p_rubro text, p_contacto text, p_cuit text, p_nota text) to authenticated;

grant execute on function public.aumentar_costos(p_ids uuid[], p_pct numeric) to authenticated;

grant execute on function public.borrar_datos_prueba(p_confirma text) to authenticated;

grant execute on function public.cancelar_pedido_cliente(p_token text, p_numero bigint) to anon;

grant execute on function public.cancelar_pedido_cliente(p_token text, p_numero bigint) to authenticated;

grant execute on function public.catalogo_cliente(p_token text) to anon;

grant execute on function public.catalogo_cliente(p_token text) to authenticated;

grant execute on function public.catalogo_extra() to anon;

grant execute on function public.catalogo_extra() to authenticated;

grant execute on function public.catalogo_publico(p_ref text, p_rubro text) to anon;

grant execute on function public.catalogo_publico(p_ref text, p_rubro text) to authenticated;

grant execute on function public.cfg_num(p_clave text, p_def numeric) to authenticated;

grant execute on function public.compras_mes(p_cliente uuid) to authenticated;

grant execute on function public.comprobante_cliente(p_token text, p_numero bigint) to anon;

grant execute on function public.comprobante_cliente(p_token text, p_numero bigint) to authenticated;

grant execute on function public.contar_stock(p_items jsonb, p_motivo text) to authenticated;

grant execute on function public.corregir_pedido_cliente(p_token text, p_numero bigint) to anon;

grant execute on function public.corregir_pedido_cliente(p_token text, p_numero bigint) to authenticated;

grant execute on function public.crear_grupo(p_token text) to anon;

grant execute on function public.crear_grupo(p_token text) to authenticated;

grant execute on function public.crear_pedido_cliente(p_token text, p_items jsonb, p_nota text, p_cupon text, p_puntos boolean) to anon;

grant execute on function public.crear_pedido_cliente(p_token text, p_items jsonb, p_nota text, p_cupon text, p_puntos boolean) to authenticated;

grant execute on function public.crear_pedido_grupo(p_token text, p_items jsonb, p_grupo text, p_nota text, p_cupon text, p_puntos boolean) to anon;

grant execute on function public.crear_pedido_grupo(p_token text, p_items jsonb, p_grupo text, p_nota text, p_cupon text, p_puntos boolean) to authenticated;

grant execute on function public.crear_reclamo(p_token text, p_numero bigint, p_tipo text, p_detalle text, p_foto text) to anon;

grant execute on function public.crear_reclamo(p_token text, p_numero bigint, p_tipo text, p_detalle text, p_foto text) to authenticated;

grant execute on function public.cuenta_cliente(p_token text) to anon;

grant execute on function public.cuenta_cliente(p_token text) to authenticated;

grant execute on function public.cupon_pct(p_codigo text, p_cliente uuid, p_monto numeric) to authenticated;

grant execute on function public.desafio_mes() to authenticated;

grant execute on function public.descuento_pronto_pago(p_factura uuid) to authenticated;

grant execute on function public.encuesta_responder(p_token text, p_puntaje integer, p_comentario text) to anon;

grant execute on function public.encuesta_responder(p_token text, p_puntaje integer, p_comentario text) to authenticated;

grant execute on function public.encuesta_ver(p_token text) to anon;

grant execute on function public.encuesta_ver(p_token text) to authenticated;

grant execute on function public.entrega_cliente(p_token text) to anon;

grant execute on function public.entrega_cliente(p_token text) to authenticated;

grant execute on function public.es_dueno() to authenticated;

grant execute on function public.es_usuario_activo() to authenticated;

grant execute on function public.estado_sistema() to authenticated;

grant execute on function public.estrategia_cliente(p_token text) to anon;

grant execute on function public.estrategia_cliente(p_token text) to authenticated;

grant execute on function public.extras_catalogo(p_lista text) to authenticated;

grant execute on function public.factor_peso(p_id text) to anon;

grant execute on function public.factor_peso(p_id text) to authenticated;

grant execute on function public.factor_peso(p_id text) to service_role;

grant execute on function public.faq_info() to anon;

grant execute on function public.faq_info() to authenticated;

grant execute on function public.fav_cliente(p_token text, p_producto text, p_on boolean) to anon;

grant execute on function public.fav_cliente(p_token text, p_producto text, p_on boolean) to authenticated;

grant execute on function public.fijar_alicuota(p_ids uuid[], p_alic numeric) to authenticated;

grant execute on function public.fijar_bulto(p_producto uuid, p_unidades integer, p_tipo text) to authenticated;

grant execute on function public.fijar_comision(p_perfil uuid, p_pct numeric) to authenticated;

grant execute on function public.fijar_costos(p_items jsonb) to authenticated;

grant execute on function public.fijar_entrega(p_token text, p_numero bigint, p_fecha date) to anon;

grant execute on function public.fijar_entrega(p_token text, p_numero bigint, p_fecha date) to authenticated;

grant execute on function public.fijar_foto(p_producto uuid, p_url text) to authenticated;

grant execute on function public.fijar_margen_familia(p_familia text, p_ajuste numeric) to authenticated;

grant execute on function public.fijar_margen_lista(p_lista text, p_margen numeric) to authenticated;

grant execute on function public.fijar_minimo(p_producto uuid, p_minimo numeric) to authenticated;

grant execute on function public.fijar_nuevo(p_ids uuid[], p_dias integer) to authenticated;

grant execute on function public.fijar_stock(p_producto uuid, p_nuevo numeric, p_ref text) to authenticated;

grant execute on function public.fijo_cliente(p_token text, p_dias integer[], p_items jsonb, p_activo boolean) to anon;

grant execute on function public.fijo_cliente(p_token text, p_dias integer[], p_items jsonb, p_activo boolean) to authenticated;

grant execute on function public.fraccionar(p jsonb) to authenticated;

grant execute on function public.garantia_info() to anon;

grant execute on function public.garantia_info() to authenticated;

grant execute on function public.generar_pedidos_fijos() to authenticated;

grant execute on function public.generar_pedidos_fijos() to service_role;

grant execute on function public.grupo_info(p_token text, p_codigo text) to anon;

grant execute on function public.grupo_info(p_token text, p_codigo text) to authenticated;

grant execute on function public.guardar_carrito(p_token text, p_items jsonb, p_total numeric) to anon;

grant execute on function public.guardar_carrito(p_token text, p_items jsonb, p_total numeric) to authenticated;

grant execute on function public.items_pedido_cliente(p_token text, p_numero bigint) to anon;

grant execute on function public.items_pedido_cliente(p_token text, p_numero bigint) to authenticated;

grant execute on function public.marca_publica() to anon;

grant execute on function public.marca_publica() to authenticated;

grant execute on function public.marcar_campania(p_codigo text, p_telefono text) to anon;

grant execute on function public.marcar_campania(p_codigo text, p_telefono text) to authenticated;

grant execute on function public.margen_familia_factor(p_familia text, p_lista text) to anon;

grant execute on function public.margen_familia_factor(p_familia text, p_lista text) to authenticated;

grant execute on function public.margen_familia_factor(p_familia text, p_lista text) to service_role;

grant execute on function public.mejor_promo(p_producto uuid, p_lista text, p_cant numeric) to authenticated;

grant execute on function public.nivel_cliente(p_cliente uuid) to authenticated;

grant execute on function public.no_estare(p_token text, p_numero bigint) to anon;

grant execute on function public.no_estare(p_token text, p_numero bigint) to authenticated;

grant execute on function public.opiniones_publicas() to anon;

grant execute on function public.opiniones_publicas() to authenticated;

grant execute on function public.pedido_publico(p_nombre text, p_telefono text, p_domicilio text, p_items jsonb, p_nota text, p_ref text, p_cupon text, p_rubro text) to anon;

grant execute on function public.pedido_publico(p_nombre text, p_telefono text, p_domicilio text, p_items jsonb, p_nota text, p_ref text, p_cupon text, p_rubro text) to authenticated;

grant execute on function public.pedir_aviso(p_token text, p_producto text) to anon;

grant execute on function public.pedir_aviso(p_token text, p_producto text) to authenticated;

grant execute on function public.pesables() to anon;

grant execute on function public.pesables() to authenticated;

grant execute on function public.presupuesto_aceptar(p_token text, p_respuesta text) to anon;

grant execute on function public.presupuesto_aceptar(p_token text, p_respuesta text) to authenticated;

grant execute on function public.presupuesto_ver(p_token text) to anon;

grant execute on function public.presupuesto_ver(p_token text) to authenticated;

grant execute on function public.productos_catalogo(p_lista text) to authenticated;

grant execute on function public.productos_para(p_lista text, p_cliente uuid) to authenticated;

grant execute on function public.promos_catalogo(p_lista text) to authenticated;

grant execute on function public.puntos_activos() to authenticated;

grant execute on function public.puntos_saldo(p_cliente uuid) to authenticated;

grant execute on function public.recibir_orden(p_orden_id bigint, p_remito text, p_items jsonb) to authenticated;

grant execute on function public.recordarme(p_token text, p_dias integer) to anon;

grant execute on function public.recordarme(p_token text, p_dias integer) to authenticated;

grant execute on function public.redondear_precio(v numeric, p_lista text) to anon;

grant execute on function public.redondear_precio(v numeric, p_lista text) to authenticated;

grant execute on function public.redondear_precio(v numeric, p_lista text) to service_role;

grant execute on function public.reemplazar_pedido_cliente(p_token text, p_numero bigint, p_items jsonb, p_nota text, p_cupon text, p_puntos boolean) to anon;

grant execute on function public.reemplazar_pedido_cliente(p_token text, p_numero bigint, p_items jsonb, p_nota text, p_cupon text, p_puntos boolean) to authenticated;

grant execute on function public.registrar_busqueda(p_token text, p_texto text) to anon;

grant execute on function public.registrar_busqueda(p_token text, p_texto text) to authenticated;

grant execute on function public.registrar_cobranza(p_cliente uuid, p_importe numeric, p_medio medio_pago, p_imputaciones jsonb, p_observacion text) to authenticated;

grant execute on function public.registrar_devolucion(p_pedido uuid, p_items jsonb, p_motivo text, p_reponer boolean) to authenticated;

grant execute on function public.registrar_qr(p_codigo text) to anon;

grant execute on function public.registrar_qr(p_codigo text) to authenticated;

grant execute on function public.registrar_vista(p_token text, p_fam text) to anon;

grant execute on function public.registrar_vista(p_token text, p_fam text) to authenticated;

grant execute on function public.remito_cliente(p_token text, p_numero bigint) to anon;

grant execute on function public.remito_cliente(p_token text, p_numero bigint) to authenticated;

grant execute on function public.reservar(p_token text, p_preventa bigint, p_cantidad numeric) to anon;

grant execute on function public.reservar(p_token text, p_preventa bigint, p_cantidad numeric) to authenticated;

grant execute on function public.restaurar_tabla(p_tabla text, p_filas jsonb) to authenticated;

grant execute on function public.save_crm_snapshot_if_version(p_expected_version bigint, p_payload jsonb) to authenticated;

grant execute on function public.seguimiento_pedido(p_token text) to anon;

grant execute on function public.seguimiento_pedido(p_token text) to authenticated;

grant execute on function public.sorteo_mes() to authenticated;

grant execute on function public.subir_comprobante(p_token text, p_monto numeric, p_nota text, p_img text) to anon;

grant execute on function public.subir_comprobante(p_token text, p_monto numeric, p_nota text, p_img text) to authenticated;

grant execute on function public.sugerencias_juntos() to authenticated;

grant execute on function public.sugerido_cliente(p_cliente uuid) to authenticated;

grant execute on function public.sugerir_producto(p_token text, p_texto text) to anon;

grant execute on function public.sugerir_producto(p_token text, p_texto text) to authenticated;

grant execute on function public.surtido_rubro(p_rubro text) to authenticated;

grant execute on function public.test_crm_snapshot_restore() to authenticated;

grant execute on function public.tiene_rol(VARIADIC roles rol_usuario[]) to authenticated;

grant execute on function public.unificar_clientes(p_queda uuid, p_sale uuid) to authenticated;

grant execute on function public.unificar_proveedores(p_destino uuid, p_origenes uuid[]) to authenticated;

grant execute on function public.validar_cupon(p_token text, p_codigo text, p_monto numeric) to anon;

grant execute on function public.validar_cupon(p_token text, p_codigo text, p_monto numeric) to authenticated;

grant execute on function public.vendedores() to authenticated;

grant execute on function public.votacion_info(p_token text) to anon;

grant execute on function public.votacion_info(p_token text) to authenticated;

grant execute on function public.votar_producto(p_token text, p_opcion text) to anon;

grant execute on function public.votar_producto(p_token text, p_opcion text) to authenticated;

insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false) on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('productos', 'productos', true) on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('remitos', 'remitos', false) on conflict (id) do nothing;

create policy documentos_borrar on storage.objects as permissive for delete to authenticated using ((bucket_id = 'documentos'::text));

create policy documentos_leer on storage.objects as permissive for select to authenticated using ((bucket_id = 'documentos'::text));

create policy documentos_subir on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'documentos'::text));

create policy fotos_productos_borrar on storage.objects as permissive for delete to authenticated using (((bucket_id = 'productos'::text) AND es_dueno()));

create policy fotos_productos_cambiar on storage.objects as permissive for update to authenticated using (((bucket_id = 'productos'::text) AND es_dueno()));

create policy fotos_productos_leer on storage.objects as permissive for select to public using ((bucket_id = 'productos'::text));

create policy fotos_productos_subir on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'productos'::text) AND es_dueno()));

create policy remitos_cambiar on storage.objects as permissive for update to authenticated using ((bucket_id = 'remitos'::text));

create policy remitos_leer on storage.objects as permissive for select to authenticated using ((bucket_id = 'remitos'::text));

create policy remitos_subir on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'remitos'::text));