-- =========================================================
-- VENTAS 12 — CRM Sabores de mi País
-- Oferta por cupo, clientes perdidos a la competencia, cuentas clave,
-- acuerdos comerciales y liga de clientes (lo que ve el cliente en su catálogo).
-- Requiere: ventas-auto3.sql. Se puede correr más de una vez.
-- =========================================================

alter table promociones add column if not exists cupo int;
alter table promociones add column if not exists usados int not null default 0;
alter table clientes add column if not exists perdido_en date;
alter table clientes add column if not exists perdido_con text;
alter table clientes add column if not exists perdido_motivo text;
alter table clientes add column if not exists cuenta_clave boolean not null default false;

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists acuerdos (
      id         bigint generated always as identity primary key,
      cliente_id %s not null references clientes(id) on delete cascade,
      monto_mes  numeric(14,2) not null check (monto_mes > 0),
      tipo       text not null default 'pct' check (tipo in ('pct','congelado')),
      pct        numeric(5,2),
      desde      date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
      hasta      date,
      productos  jsonb not null default '[]',
      activo     boolean not null default true,
      nota       text,
      creado_en  timestamptz default now())$f$, tc);
end $$;
alter table acuerdos enable row level security;
drop policy if exists "auth_all" on acuerdos;
create policy "auth_all" on acuerdos for all to authenticated using (true) with check (true);
grant select, insert, update, delete on acuerdos to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Oferta por cupo: cuenta los pedidos que la usaron y la apaga sola al llenarse
create or replace function cupo_promos() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.promo, '') = '' then return new; end if;
  update promociones p set usados = (
      select count(distinct i.pedido_id) from pedido_items i join pedidos o on o.id = i.pedido_id
       where o.estado::text <> 'cancelado' and o.creado_en >= p.creado_en and i.promo ilike '%' || p.nombre || '%')
   where p.cupo is not null and p.activa and new.promo ilike '%' || p.nombre || '%';
  update promociones set activa = false where cupo is not null and activa and usados >= cupo;
  return new;
end $$;
drop trigger if exists cupo_promos on pedido_items;
create trigger cupo_promos after insert on pedido_items for each row execute function cupo_promos();

-- Lo que ve cada cliente en su catálogo: cupos que quedan, su puesto en la liga y su acuerdo
create or replace function estrategia_cliente(p_token text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v clientes%rowtype; r jsonb; l jsonb; lg jsonb; ac jsonb;
        ini timestamptz := date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires';
begin
  r := jsonb_build_object('cupos', (select coalesce(jsonb_object_agg(nombre, greatest(cupo - usados, 0)), '{}'::jsonb) from promociones
                                     where cupo is not null and activa and (hasta is null or hasta >= current_date)));
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
  return r || jsonb_build_object('liga', lg, 'acuerdo', ac);
end $$;
revoke execute on function estrategia_cliente(text) from public;
grant execute on function estrategia_cliente(text) to anon, authenticated;

select 'ventas estrategia lista' as resultado;
