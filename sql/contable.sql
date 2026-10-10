-- =========================================================
-- MÓDULO CONTABLE — CRM Sabores de mi País
-- IVA, retenciones/percepciones, cheques, bancos, costo de lo vendido.
-- Solo el dueño puede ver y cargar (usa es_dueno() de precios.sql).
-- Se puede correr más de una vez.
-- =========================================================

-- 1) Alícuota de IVA por producto (21 % salvo que se cambie)
alter table productos add column if not exists alicuota_iva numeric(4,2) not null default 21;

-- 2) Costo de cada producto en el momento de la venta (para ganancia real)
alter table pedido_items add column if not exists costo_unitario numeric(14,2);
create or replace function poner_costo_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.costo_unitario is null then
    select costo into new.costo_unitario from productos where id = new.producto_id;
  end if;
  return new;
end $$;
drop trigger if exists pedido_items_costo on pedido_items;
create trigger pedido_items_costo before insert on pedido_items for each row execute function poner_costo_item();
update pedido_items i set costo_unitario = p.costo from productos p where p.id = i.producto_id and i.costo_unitario is null;

-- 3) Percepciones separadas en facturas de proveedores
alter table facturas_proveedor add column if not exists perc_iva  numeric(14,2) not null default 0;
alter table facturas_proveedor add column if not exists perc_iibb numeric(14,2) not null default 0;

-- 4) Cuentas (bancos, Mercado Pago, etc.) y sus movimientos
create table if not exists cuentas (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  tipo          text not null default 'banco' check (tipo in ('banco','billetera','efectivo','otro')),
  saldo_inicial numeric(14,2) not null default 0,
  fecha_saldo   date not null default current_date,
  activa        boolean not null default true,
  creado_en     timestamptz default now()
);
create table if not exists movimientos_cuenta (
  id               bigint generated always as identity primary key,
  cuenta_id        bigint not null references cuentas(id) on delete cascade,
  fecha            date not null default current_date,
  importe          numeric(14,2) not null check (importe <> 0),
  concepto         text not null,
  origen           text not null default 'manual',
  ref              text,
  transferencia_id uuid,
  usuario_id       uuid default auth.uid(),
  creado_en        timestamptz default now()
);
create index if not exists movimientos_cuenta_cf on movimientos_cuenta (cuenta_id, fecha);

-- 5) Cheques recibidos y emitidos (también eCheq)
create table if not exists cheques (
  id             bigint generated always as identity primary key,
  tipo           text not null check (tipo in ('recibido','emitido')),
  echeq          boolean not null default false,
  numero         text,
  banco          text,
  librador       text,
  cuit_librador  text,
  importe        numeric(14,2) not null check (importe > 0),
  fecha_emision  date,
  fecha_pago     date not null,
  estado         text not null default 'en_cartera'
                 check (estado in ('en_cartera','depositado','endosado','cobrado','rechazado','emitido','debitado','anulado')),
  cliente_id     uuid references clientes(id) on delete set null,
  proveedor_id   uuid references proveedores(id) on delete set null,
  destino        text,
  cuenta_id      bigint references cuentas(id) on delete set null,
  notas          text,
  creado_en      timestamptz default now()
);
create index if not exists cheques_pago on cheques (estado, fecha_pago);

-- 6) Retenciones y percepciones sufridas (certificados)
create table if not exists retenciones (
  id            bigint generated always as identity primary key,
  fecha         date not null default current_date,
  tipo          text not null default 'retencion' check (tipo in ('retencion','percepcion')),
  impuesto      text not null check (impuesto in ('IVA','IIBB','Ganancias','SUSS','Otro')),
  jurisdiccion  text,
  cliente_id    uuid references clientes(id) on delete set null,
  proveedor_id  uuid references proveedores(id) on delete set null,
  comprobante   text,
  importe       numeric(14,2) not null check (importe > 0),
  notas         text,
  creado_en     timestamptz default now()
);

-- Permisos: solo el dueño
do $$
declare t text;
begin
  foreach t in array array['cuentas','movimientos_cuenta','cheques','retenciones'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo_dueno" on %I', t);
    execute format('create policy "solo_dueno" on %I for all to authenticated using (es_dueno()) with check (es_dueno())', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- La copia de seguridad diaria también lee las tablas nuevas
grant select on all tables in schema public to service_role;

select 'contable listo' as resultado;
