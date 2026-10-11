-- =========================================================
-- ENTREGAS Y DATOS — CRM Sabores de mi País
-- Día de entrega elegido por el cliente, días de reparto y pedido mínimo por zona,
-- feriados (días sin reparto) y unificar clientes duplicados. Se puede correr más de una vez.
-- =========================================================

alter table pedidos add column if not exists entrega date;

-- Zona de un cliente (igual que en el CRM: la zona o la localidad)
create or replace function zona_de(p_ciudad text) returns text language sql immutable as $$
  select case when coalesce(trim(regexp_replace(p_ciudad, '\s*\(.*\)$', '')), '') = '' then 'Sin zona'
    else upper(left(trim(regexp_replace(p_ciudad, '\s*\(.*\)$', '')), 1)) || lower(substr(trim(regexp_replace(p_ciudad, '\s*\(.*\)$', '')), 2)) end
$$;

-- Lo que ve el cliente en su catálogo: días que reparte su zona, mínimo de su zona y feriados
create or replace function entrega_cliente(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
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
end $$;

-- El cliente elige el día de entrega de su pedido
create or replace function fijar_entrega(p_token text, p_numero bigint, p_fecha date) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  if p_fecha < (now() at time zone 'America/Argentina/Buenos_Aires')::date or p_fecha > current_date + 30 then raise exception 'Elegí una fecha válida.'; end if;
  update pedidos set entrega = p_fecha where numero = p_numero and cliente_id = v_id and estado::text in ('pendiente', 'aprobado', 'en_preparacion');
  return found;
end $$;

revoke execute on function entrega_cliente(text), fijar_entrega(text, bigint, date) from public;
grant execute on function entrega_cliente(text), fijar_entrega(text, bigint, date) to anon, authenticated;

-- Unificar dos clientes duplicados: todo lo del que sale pasa al que queda
create or replace function unificar_clientes(p_queda uuid, p_sale uuid) returns text
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke execute on function unificar_clientes(uuid, uuid) from public, anon;
grant execute on function unificar_clientes(uuid, uuid) to authenticated;

select 'entregas listas' as resultado;
