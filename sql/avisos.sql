-- =========================================================
-- AVISOS Y CATÁLOGO — CRM Sabores de mi País
-- Comprobantes de pago que sube el cliente, aviso "mañana te llevamos tu pedido"
-- (con "no voy a estar") y votación de productos nuevos en el catálogo.
-- Se puede correr más de una vez.
-- =========================================================

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists comprobantes_cliente (
      id          bigint generated always as identity primary key,
      cliente_id  %1$s not null references clientes(id) on delete cascade,
      monto       numeric(14,2),
      nota        text,
      imagen      text not null,
      estado      text not null default 'nuevo' check (estado in ('nuevo', 'registrado', 'descartado')),
      creado_en   timestamptz not null default now())$f$, tc);
  execute format($f$
    create table if not exists votos_producto (
      id          bigint generated always as identity primary key,
      votacion    text not null,
      cliente_id  %1$s not null references clientes(id) on delete cascade,
      opcion      text not null,
      creado_en   timestamptz not null default now(),
      unique (votacion, cliente_id))$f$, tc);
end $$;

alter table pedidos add column if not exists cliente_ausente boolean not null default false;

do $$
declare t text;
begin
  foreach t in array array['comprobantes_cliente', 'votos_producto'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

-- El cliente sube la foto del comprobante de pago desde "Mi cuenta"
create or replace function subir_comprobante(p_token text, p_monto numeric, p_nota text, p_img text) returns bigint
language plpgsql security definer set search_path = public as $$
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
end $$;

-- "No voy a estar": el cliente avisa desde el link del aviso
create or replace function no_estare(p_token text, p_numero bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if v_id is null then raise exception 'Este link no es válido.'; end if;
  update pedidos set cliente_ausente = true,
         observaciones = left(concat_ws(' · ', nullif(observaciones, ''), '🚫 El cliente avisó que no va a estar'), 500)
   where numero = p_numero and cliente_id = v_id and estado::text in ('pendiente', 'aprobado', 'en_preparacion', 'listo') and not cliente_ausente;
  return found;
end $$;

-- Votación de productos nuevos
create or replace function votacion_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; cf jsonb; mi text; tot jsonb;
begin
  begin cf := nullif((select valor from config_app where clave = 'votacion'), '')::jsonb; exception when others then cf := null; end;
  if cf is null or not coalesce((cf->>'activa')::boolean, false) then return '{}'::jsonb; end if;
  if cf->>'hasta' is not null and (cf->>'hasta')::date < current_date then return '{}'::jsonb; end if;
  select * into v from clientes where token_pedidos = p_token and coalesce(p_token, '') <> '';
  if found then select opcion into mi from votos_producto where votacion = cf->>'id' and cliente_id = v.id; end if;
  select coalesce(jsonb_object_agg(opcion, n), '{}'::jsonb) into tot from (select opcion, count(*) n from votos_producto where votacion = cf->>'id' group by opcion) z;
  return jsonb_build_object('id', cf->>'id', 'pregunta', cf->>'pregunta', 'opciones', cf->'opciones', 'mi', mi, 'votos', tot);
end $$;

create or replace function votar_producto(p_token text, p_opcion text) returns jsonb
language plpgsql security definer set search_path = public as $$
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
end $$;

revoke execute on function subir_comprobante(text, numeric, text, text), no_estare(text, bigint), votacion_info(text), votar_producto(text, text) from public;
grant execute on function subir_comprobante(text, numeric, text, text), no_estare(text, bigint), votacion_info(text), votar_producto(text, text) to anon, authenticated;

select 'avisos listo' as resultado;
