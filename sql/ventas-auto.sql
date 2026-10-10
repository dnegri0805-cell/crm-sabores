-- =========================================================
-- VENTAS 9 — CRM Sabores de mi País
-- Automatizar la venta y conseguir clientes nuevos:
-- cola del día, secuencias, cupones automáticos, QR por campaña y origen de cada cliente.
-- Requiere: ventas-proveedores.sql. Se puede correr más de una vez.
-- =========================================================

alter table prospectos   add column if not exists campania text;
alter table presupuestos add column if not exists campania text;
alter table clientes     add column if not exists origen text;
alter table clientes     add column if not exists campania text;

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  -- Registro de lo que se mandó desde la cola (para no repetir y para medir resultados)
  execute format($f$
    create table if not exists envios_auto (
      id           bigint generated always as identity primary key,
      clave        text not null unique,
      tipo         text not null,
      cliente_id   %s references clientes(id) on delete cascade,
      prospecto_id uuid references prospectos(id) on delete cascade,
      detalle      text,
      cupon        text,
      enviado_en   timestamptz not null default now(),
      usuario_id   uuid default auth.uid())$f$, tc);
end $$;
create index if not exists envios_auto_cli on envios_auto (cliente_id, enviado_en desc);
create index if not exists envios_auto_fecha on envios_auto (enviado_en desc);

-- Campañas con QR (volantes, carteles, vendedores, zonas)
create table if not exists campanias_qr (
  codigo      text primary key,
  nombre      text not null,
  tipo        text not null default 'volante',
  vendedor_id uuid,
  zona        text,
  rubro       text,
  activa      boolean not null default true,
  creado_en   timestamptz default now());
create table if not exists qr_visitas (
  codigo text not null references campanias_qr(codigo) on delete cascade on update cascade,
  dia    date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  n      int not null default 0,
  primary key (codigo, dia));

do $$
declare t text;
begin
  foreach t in array array['envios_auto','campanias_qr','qr_visitas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- El catálogo público cuenta las visitas que llegan por cada QR
create or replace function registrar_qr(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := upper(trim(coalesce(p_codigo, '')));
begin
  if v = '' or not exists (select 1 from campanias_qr where codigo = v and activa) then return; end if;
  insert into qr_visitas (codigo, dia, n) values (v, (now() at time zone 'America/Argentina/Buenos_Aires')::date, 1)
  on conflict (codigo, dia) do update set n = least(qr_visitas.n + 1, 1000000);
end $$;

-- Cuando alguien se da de alta o pide desde un QR, queda anotada la campaña
create or replace function marcar_campania(p_codigo text, p_telefono text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := upper(trim(coalesce(p_codigo, ''))); v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
begin
  if v = '' or length(v_tel) < 8 or not exists (select 1 from campanias_qr where codigo = v) then return; end if;
  update prospectos set campania = v
   where campania is null and origen = 'catalogo' and creado_en > now() - interval '1 day'
     and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 8) = right(v_tel, 8);
  update presupuestos set campania = v
   where campania is null and origen = 'catalogo' and creado_en > now() - interval '1 hour'
     and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 8) = right(v_tel, 8);
end $$;

revoke execute on function registrar_qr(text), marcar_campania(text, text) from public;
grant execute on function registrar_qr(text), marcar_campania(text, text) to anon, authenticated;

-- Origen de los clientes que ya vinieron de un prospecto
update clientes c set origen = coalesce(case when p.campania is not null then 'qr' end, p.origen, 'prospecto'), campania = coalesce(c.campania, p.campania)
  from prospectos p where p.cliente_id = c.id and c.origen is null;
update clientes set origen = 'referido' where origen is null and referido_por is not null;

select 'ventas auto lista' as resultado;
