-- =========================================================
-- PRÁCTICO — CRM Sabores de mi País
-- Fraccionado de hormas y piezas, cargas de combustible de la camioneta
-- y preguntas frecuentes del catálogo. Se puede correr más de una vez.
-- =========================================================

-- Fraccionado: una horma o pieza entera que se corta y se vende por kilo o en cuñas
create table if not exists fraccionados (
  id          bigint generated always as identity primary key,
  fecha       timestamptz not null default now(),
  origen_id   uuid not null references productos(id) on delete cascade,
  cantidad    numeric(14,3) not null,
  kg_bruto    numeric(14,3) not null,
  kg_util     numeric(14,3) not null,
  merma_kg    numeric(14,3) not null default 0,
  costo       numeric(14,2) not null default 0,
  costo_kg    numeric(14,2) not null default 0,
  destinos    jsonb not null default '[]',
  nota        text,
  usuario_id  uuid default auth.uid());
create index if not exists fraccionados_fecha on fraccionados (fecha);
alter table fraccionados enable row level security;
drop policy if exists "auth_all" on fraccionados;
create policy "auth_all" on fraccionados for all to authenticated using (true) with check (true);
grant select, insert, update, delete on fraccionados to authenticated;

-- Registra el corte: baja la pieza entera, sube lo fraccionado y anota la merma del corte
create or replace function fraccionar(p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke execute on function fraccionar(jsonb) from public, anon;
grant execute on function fraccionar(jsonb) to authenticated;

-- Camioneta: cargas de combustible (para el consumo y el costo por kilómetro)
create table if not exists cargas_combustible (
  id        bigint generated always as identity primary key,
  fecha     date not null default current_date,
  km        integer,
  litros    numeric(10,2),
  importe   numeric(14,2) not null default 0,
  lleno     boolean not null default true,
  nota      text,
  creado_en timestamptz not null default now());
alter table cargas_combustible enable row level security;
drop policy if exists "auth_all" on cargas_combustible;
create policy "auth_all" on cargas_combustible for all to authenticated using (true) with check (true);
grant select, insert, update, delete on cargas_combustible to authenticated;

-- Preguntas frecuentes del catálogo: se arman solas con lo que ya cargaste
create or replace function faq_info() returns jsonb
language plpgsql stable security definer set search_path = public as $$
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
end $$;
revoke execute on function faq_info() from public;
grant execute on function faq_info() to anon, authenticated;

select 'practico listo' as resultado;
