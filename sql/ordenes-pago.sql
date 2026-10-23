-- =========================================================
-- ÓRDENES DE PAGO Y RECIBOS DETALLADOS — CRM Sabores de mi País
--
-- Orden de pago (lo que vos le pagás a un proveedor):
--   elegís qué facturas cancelás y cuánto de cada una (pago escalonado),
--   con uno o varios valores (transferencia, efectivo, eCheq/cheque propio,
--   cheque de la cartera endosado) y, si sos agente de retención, las
--   retenciones que le practicás. Queda numerada y todo se asienta solo:
--   saldo del proveedor, bancos, cartera de cheques y Contable → Retenciones.
--
-- Recibo (lo que te paga un cliente):
--   un solo recibo con varios valores (eCheq con todos sus datos,
--   transferencia, efectivo…) y las retenciones que te hizo el cliente
--   (IIBB, Ganancias, IVA, SUSS) con su certificado.
--
-- Se puede correr más de una vez sin romper nada.
-- =========================================================

-- ---------- 1. Órdenes de pago ----------
create table if not exists public.ordenes_pago (
  id                bigint generated always as identity primary key,
  proveedor_id      uuid not null references public.proveedores(id),
  fecha             date not null default current_date,
  total_valores     numeric(14,2) not null default 0,
  total_retenciones numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,
  observacion       text,
  anulada           boolean not null default false,
  anulada_en        timestamptz,
  creado_por        uuid default auth.uid(),
  creado_en         timestamptz not null default now()
);
create index if not exists ordenes_pago_prov on public.ordenes_pago (proveedor_id, fecha desc);

create table if not exists public.op_imputaciones (
  id            bigint generated always as identity primary key,
  orden_pago_id bigint not null references public.ordenes_pago(id) on delete cascade,
  factura_id    bigint not null references public.facturas_proveedor(id) on delete cascade,
  importe       numeric(14,2) not null check (importe > 0)
);
create index if not exists op_imputaciones_fac on public.op_imputaciones (factura_id);
create index if not exists op_imputaciones_op on public.op_imputaciones (orden_pago_id);

-- ---------- 2. Detalle de valores (recibos y órdenes de pago) ----------
create table if not exists public.comprobante_valores (
  id            bigint generated always as identity primary key,
  recibo_id     uuid references public.recibos(id) on delete cascade,
  orden_pago_id bigint references public.ordenes_pago(id) on delete cascade,
  medio         text not null check (medio in ('efectivo','transferencia','deposito','echeq','cheque','tarjeta','otro')),
  importe       numeric(14,2) not null check (importe > 0),
  cuenta_id     bigint references public.cuentas(id) on delete set null,
  cheque_id     bigint references public.cheques(id) on delete set null,
  endosado      boolean not null default false,
  banco         text,
  numero        text,
  fecha_pago    date,
  cuit          text,
  titular       text,
  referencia    text,
  creado_en     timestamptz not null default now(),
  check (recibo_id is not null or orden_pago_id is not null)
);
create index if not exists comprobante_valores_rec on public.comprobante_valores (recibo_id);
create index if not exists comprobante_valores_op on public.comprobante_valores (orden_pago_id);

-- ---------- 3. Retenciones: sufridas (te las hacen) y practicadas (las hacés vos) ----------
alter table public.retenciones add column if not exists recibo_id uuid references public.recibos(id) on delete set null;
alter table public.retenciones add column if not exists orden_pago_id bigint references public.ordenes_pago(id) on delete set null;
alter table public.retenciones add column if not exists regimen text;
alter table public.retenciones add column if not exists alicuota numeric(7,4);
alter table public.retenciones add column if not exists base numeric(14,2);
alter table public.retenciones drop constraint if exists retenciones_tipo_check;
alter table public.retenciones add constraint retenciones_tipo_check check (tipo in ('retencion','percepcion','practicada'));

-- Pagos a proveedores: se vinculan a su orden de pago; la retención practicada también cancela deuda
alter table public.pagos_proveedor add column if not exists orden_pago_id bigint references public.ordenes_pago(id) on delete cascade;
alter table public.pagos_proveedor drop constraint if exists pagos_proveedor_medio_check;
alter table public.pagos_proveedor add constraint pagos_proveedor_medio_check
  check (medio in ('efectivo','transferencia','deposito','cheque','echeq','tarjeta','retencion','otro'));
create index if not exists pagos_proveedor_op on public.pagos_proveedor (orden_pago_id);

-- ---------- 4. Permisos ----------
alter table public.ordenes_pago enable row level security;
alter table public.op_imputaciones enable row level security;
alter table public.comprobante_valores enable row level security;
do $$
declare t text;
begin
  foreach t in array array['ordenes_pago','op_imputaciones','comprobante_valores'] loop
    execute format('drop policy if exists lectura on public.%I', t);
    execute format('drop policy if exists escritura on public.%I', t);
    execute format('create policy lectura on public.%I for select using (es_usuario_activo())', t);
    execute format($p$create policy escritura on public.%I for all using (tiene_rol(variadic array['dueno','administracion']::rol_usuario[])) with check (tiene_rol(variadic array['dueno','administracion']::rol_usuario[]))$p$, t);
  end loop;
end $$;

-- ---------- 5. Estado de cada factura de proveedor (cuánto queda por pagar) ----------
-- Lo pagado con órdenes de pago va a la factura elegida. Los pagos sueltos de antes
-- (sin orden), las notas de crédito y lo que quedó "a cuenta" se aplican a las facturas más viejas.
create or replace view public.v_facturas_proveedor_estado as
with f as (
  select fp.id, fp.proveedor_id, fp.tipo, fp.numero, fp.fecha, fp.vencimiento, fp.total,
         coalesce((select sum(i.importe) from public.op_imputaciones i
                    join public.ordenes_pago o on o.id = i.orden_pago_id and not o.anulada
                   where i.factura_id = fp.id), 0) as imputado
    from public.facturas_proveedor fp
   where fp.tipo <> 'NC'
), cred as (
  select p.id as proveedor_id,
         coalesce((select sum(g.importe) from public.pagos_proveedor g where g.proveedor_id = p.id and g.orden_pago_id is null), 0)
       + coalesce((select sum(n.total) from public.facturas_proveedor n where n.proveedor_id = p.id and n.tipo = 'NC'), 0)
       + coalesce((select sum(o.total - coalesce((select sum(i.importe) from public.op_imputaciones i where i.orden_pago_id = o.id), 0))
                     from public.ordenes_pago o where o.proveedor_id = p.id and not o.anulada), 0) as credito
    from public.proveedores p
), o as (
  select f.*, greatest(f.total - f.imputado, 0) as resto,
         coalesce(sum(greatest(f.total - f.imputado, 0)) over (partition by f.proveedor_id order by f.fecha, f.id
                  rows between unbounded preceding and 1 preceding), 0) as antes
    from f
)
select o.id as factura_id, o.proveedor_id, o.tipo, o.numero, o.fecha, o.vencimiento, o.total,
       o.imputado + least(o.resto, greatest(0, c.credito - o.antes)) as pagado,
       round(o.resto - least(o.resto, greatest(0, c.credito - o.antes)), 2) as pendiente,
       case when o.resto - least(o.resto, greatest(0, c.credito - o.antes)) <= 0.005 then 'pagada'
            when o.imputado + least(o.resto, greatest(0, c.credito - o.antes)) > 0 then 'parcial'
            else 'impaga' end as estado,
       greatest(current_date - o.vencimiento, 0) as dias_vencida
  from o join cred c on c.proveedor_id = o.proveedor_id;

-- ---------- 6. Registrar una orden de pago (todo o nada) ----------
create or replace function public.registrar_orden_pago(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_prov uuid := (p->>'proveedor_id')::uuid;
  v_fecha date := coalesce(nullif(p->>'fecha','')::date, current_date);
  v_nom text; v_op bigint; v_x jsonb; v_imp numeric; v_pend numeric;
  v_val numeric := 0; v_ret numeric := 0; v_aplic numeric := 0;
  v_ch bigint; v_chq record; v_medio text; v_ref text; k int := 0;
begin
  if not tiene_rol(variadic array['dueno','administracion']::rol_usuario[]) then
    raise exception 'Solo el dueño o administración pueden hacer órdenes de pago.';
  end if;
  select razon_social into v_nom from proveedores where id = v_prov;
  if v_nom is null then raise exception 'Elegí el proveedor.'; end if;

  -- Controles antes de numerar la orden (así no quedan números salteados)
  for v_x in select * from jsonb_array_elements(coalesce(p->'imputaciones', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2);
    if v_imp is null or v_imp <= 0 then continue; end if;
    select pendiente into v_pend from v_facturas_proveedor_estado
     where factura_id = (v_x->>'factura_id')::bigint and proveedor_id = v_prov;
    if v_pend is null then raise exception 'Una de las facturas no es de este proveedor.'; end if;
    if v_imp > v_pend + 0.01 then raise exception 'Estás pagando más de lo que queda de una factura (quedan %).', v_pend; end if;
    v_aplic := v_aplic + v_imp;
  end loop;
  for v_x in select * from jsonb_array_elements(coalesce(p->'valores', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2); v_medio := coalesce(v_x->>'medio', 'transferencia');
    if v_imp is null or v_imp <= 0 then continue; end if;
    if v_medio in ('cheque','echeq') and nullif(v_x->>'cheque_id','') is not null then
      select * into v_chq from cheques where id = (v_x->>'cheque_id')::bigint;
      if v_chq is null or v_chq.estado <> 'en_cartera' then raise exception 'Ese cheque ya no está en la cartera.'; end if;
      v_imp := v_chq.importe;
    elsif v_medio in ('cheque','echeq') and nullif(v_x->>'fecha_pago','') is null then
      raise exception 'Poné la fecha de pago del cheque.';
    end if;
    v_val := v_val + v_imp;
  end loop;
  select coalesce(sum(round((x->>'importe')::numeric, 2)), 0) into v_ret
    from jsonb_array_elements(coalesce(p->'retenciones', '[]')) x where (x->>'importe')::numeric > 0;
  if v_val + v_ret <= 0 then raise exception 'Cargá al menos un valor (transferencia, cheque, efectivo…).'; end if;
  if v_aplic > v_val + v_ret + 0.01 then raise exception 'Las facturas elegidas suman más que lo que estás pagando.'; end if;
  v_val := 0; v_ret := 0; v_aplic := 0;

  insert into ordenes_pago (proveedor_id, fecha, observacion)
  values (v_prov, v_fecha, nullif(trim(p->>'observacion'), '')) returning id into v_op;
  v_ref := 'OP N° ' || v_op;

  -- Facturas que se cancelan
  for v_x in select * from jsonb_array_elements(coalesce(p->'imputaciones', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2);
    if v_imp is null or v_imp <= 0 then continue; end if;
    select pendiente into v_pend from v_facturas_proveedor_estado
     where factura_id = (v_x->>'factura_id')::bigint and proveedor_id = v_prov;
    if v_pend is null then raise exception 'Una de las facturas no es de este proveedor.'; end if;
    if v_imp > v_pend + 0.01 then raise exception 'Estás pagando más de lo que queda de una factura (quedan %).', v_pend; end if;
    insert into op_imputaciones (orden_pago_id, factura_id, importe) values (v_op, (v_x->>'factura_id')::bigint, v_imp);
    v_aplic := v_aplic + v_imp;
  end loop;

  -- Valores entregados
  for v_x in select * from jsonb_array_elements(coalesce(p->'valores', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2); v_medio := coalesce(v_x->>'medio', 'transferencia'); v_ch := null;
    if v_imp is null or v_imp <= 0 then continue; end if;
    if v_medio in ('cheque','echeq') and nullif(v_x->>'cheque_id','') is not null then
      -- cheque de la cartera: se endosa al proveedor
      select * into v_chq from cheques where id = (v_x->>'cheque_id')::bigint for update;
      if v_chq is null or v_chq.estado <> 'en_cartera' then raise exception 'Ese cheque ya no está en la cartera.'; end if;
      v_imp := v_chq.importe; v_ch := v_chq.id;
      update cheques set estado = 'endosado', proveedor_id = v_prov, destino = v_nom,
             notas = trim(coalesce(notas, '') || ' Endosado en ' || v_ref) where id = v_ch;
      insert into comprobante_valores (orden_pago_id, medio, importe, cheque_id, endosado, banco, numero, fecha_pago, cuit, titular)
      values (v_op, case when v_chq.echeq then 'echeq' else 'cheque' end, v_imp, v_ch, true, v_chq.banco, v_chq.numero, v_chq.fecha_pago, v_chq.cuit_librador, v_chq.librador);
    elsif v_medio in ('cheque','echeq') then
      -- cheque / eCheq propio
      if nullif(v_x->>'fecha_pago','') is null then raise exception 'Poné la fecha de pago del cheque.'; end if;
      insert into cheques (tipo, estado, echeq, numero, banco, importe, fecha_emision, fecha_pago, proveedor_id, destino, cuenta_id, notas)
      values ('emitido', 'emitido', v_medio = 'echeq', nullif(v_x->>'numero',''), nullif(v_x->>'banco',''), v_imp, v_fecha,
              (v_x->>'fecha_pago')::date, v_prov, v_nom, nullif(v_x->>'cuenta_id','')::bigint, v_ref) returning id into v_ch;
      insert into comprobante_valores (orden_pago_id, medio, importe, cheque_id, cuenta_id, banco, numero, fecha_pago)
      values (v_op, v_medio, v_imp, v_ch, nullif(v_x->>'cuenta_id','')::bigint, nullif(v_x->>'banco',''), nullif(v_x->>'numero',''), (v_x->>'fecha_pago')::date);
    else
      insert into comprobante_valores (orden_pago_id, medio, importe, cuenta_id, banco, numero, referencia)
      values (v_op, v_medio, v_imp, nullif(v_x->>'cuenta_id','')::bigint, nullif(v_x->>'banco',''), nullif(v_x->>'numero',''), nullif(v_x->>'referencia',''));
      if nullif(v_x->>'cuenta_id','') is not null then
        insert into movimientos_cuenta (cuenta_id, fecha, importe, concepto, origen, ref)
        values ((v_x->>'cuenta_id')::bigint, v_fecha, -v_imp, 'Orden de pago N° ' || v_op || ' · ' || v_nom, 'pago', v_ref);
      end if;
    end if;
    insert into pagos_proveedor (proveedor_id, fecha, medio, importe, referencia, orden_pago_id)
    values (v_prov, v_fecha, case when v_medio = 'deposito' then 'transferencia' else v_medio end, v_imp,
            v_ref || coalesce(' · ' || nullif(v_x->>'referencia',''), '') || coalesce(' · N° ' || nullif(v_x->>'numero',''), ''), v_op);
    v_val := v_val + v_imp;
  end loop;

  -- Retenciones que le practicás (si sos agente de retención)
  for v_x in select * from jsonb_array_elements(coalesce(p->'retenciones', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2);
    if v_imp is null or v_imp <= 0 then continue; end if;
    k := k + 1;
    insert into retenciones (fecha, tipo, impuesto, jurisdiccion, proveedor_id, comprobante, importe, regimen, alicuota, base, orden_pago_id, notas)
    values (v_fecha, 'practicada', coalesce(v_x->>'impuesto','IIBB'), nullif(v_x->>'jurisdiccion',''), v_prov,
            coalesce(nullif(v_x->>'certificado',''), v_op || '-' || k), v_imp, nullif(v_x->>'regimen',''),
            nullif(v_x->>'alicuota','')::numeric, nullif(v_x->>'base','')::numeric, v_op, v_ref);
    insert into pagos_proveedor (proveedor_id, fecha, medio, importe, referencia, orden_pago_id)
    values (v_prov, v_fecha, 'retencion', v_imp, v_ref || ' · Retención ' || coalesce(v_x->>'impuesto','IIBB'), v_op);
    v_ret := v_ret + v_imp;
  end loop;

  if v_val + v_ret <= 0 then raise exception 'Cargá al menos un valor (transferencia, cheque, efectivo…).'; end if;
  if v_aplic > v_val + v_ret + 0.01 then raise exception 'Las facturas elegidas suman más que lo que estás pagando.'; end if;
  update ordenes_pago set total_valores = v_val, total_retenciones = v_ret, total = v_val + v_ret where id = v_op;
  return jsonb_build_object('id', v_op, 'total', v_val + v_ret, 'a_cuenta', round(v_val + v_ret - v_aplic, 2));
end $$;

-- ---------- 7. Anular una orden de pago (deshace todo lo que generó) ----------
create or replace function public.anular_orden_pago(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref text := 'OP N° ' || p_id;
begin
  if not tiene_rol(variadic array['dueno','administracion']::rol_usuario[]) then raise exception 'Sin permiso.'; end if;
  if not exists (select 1 from ordenes_pago where id = p_id and not anulada) then raise exception 'Esa orden ya estaba anulada.'; end if;
  -- cheques de la cartera endosados: vuelven a la cartera
  update cheques c set estado = 'en_cartera', proveedor_id = null, destino = null,
         notas = trim(replace(coalesce(c.notas, ''), 'Endosado en ' || v_ref, ''))
    from comprobante_valores v where v.orden_pago_id = p_id and v.endosado and v.cheque_id = c.id and c.estado = 'endosado';
  -- cheques propios emitidos: quedan anulados
  update cheques c set estado = 'anulado'
    from comprobante_valores v where v.orden_pago_id = p_id and not v.endosado and v.cheque_id = c.id and c.estado = 'emitido';
  delete from movimientos_cuenta where ref = v_ref and origen = 'pago';
  delete from pagos_proveedor where orden_pago_id = p_id;
  delete from retenciones where orden_pago_id = p_id;
  update ordenes_pago set anulada = true, anulada_en = now() where id = p_id;
end $$;

-- ---------- 8. Registrar un recibo con varios valores y retenciones (todo o nada) ----------
-- Se arma un recibo por cada forma de pago (como ya hacía "Dividir pago") y uno para las
-- retenciones; todos comparten el número del primero y se imprimen como un solo recibo.
create or replace function public.registrar_recibo(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cli uuid := (p->>'cliente_id')::uuid;
  v_nom text; v_x jsonb; v_imp numeric; v_medio text; v_enum medio_pago;
  v_main uuid; v_num bigint; v_rec uuid; v_n bigint; v_ref text;
  v_grupos jsonb := '{}'; v_g text; v_tot numeric := 0; v_ret numeric := 0;
  v_imputs jsonb := coalesce(p->'imputaciones', '[]'); v_i int := 0; v_resto_f numeric; v_cap numeric; v_a numeric;
  v_ids uuid[] := '{}'; v_caps numeric[] := '{}'; r int; v_ch bigint;
begin
  if not tiene_rol(variadic array['dueno','administracion']::rol_usuario[]) then
    raise exception 'Solo el dueño o administración pueden registrar cobros.';
  end if;
  select razon_social into v_nom from clientes where id = v_cli;
  if v_nom is null then raise exception 'Elegí el cliente.'; end if;

  -- Sumar por forma de pago (eCheq y cheque van como "cheque"; depósito como "transferencia")
  for v_x in select * from jsonb_array_elements(coalesce(p->'valores', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2); if v_imp is null or v_imp <= 0 then continue; end if;
    v_medio := coalesce(v_x->>'medio', 'transferencia');
    v_g := case when v_medio in ('cheque','echeq') then 'cheque' when v_medio = 'deposito' then 'transferencia'
                when v_medio in ('efectivo','transferencia','tarjeta') then v_medio else 'otro' end;
    v_grupos := jsonb_set(v_grupos, array[v_g], to_jsonb(coalesce((v_grupos->>v_g)::numeric, 0) + v_imp));
    v_tot := v_tot + v_imp;
  end loop;
  select coalesce(sum(round((x->>'importe')::numeric, 2)), 0) into v_ret
    from jsonb_array_elements(coalesce(p->'retenciones', '[]')) x where (x->>'importe')::numeric > 0;
  if v_tot + v_ret <= 0 then raise exception 'Poné el importe que te pagaron.'; end if;

  -- Un recibo por forma de pago (el primero lleva el número que ve el cliente)
  for v_g in select key from jsonb_each(v_grupos) order by (value)::numeric desc loop
    v_enum := v_g::medio_pago;
    insert into recibos (cliente_id, importe, medio, observacion)
    values (v_cli, (v_grupos->>v_g)::numeric, v_enum,
            case when v_main is null then nullif(trim(p->>'observacion'), '') else 'Parte del recibo N° ' || v_num end)
    returning id, numero into v_rec, v_n;
    if v_main is null then v_main := v_rec; v_num := v_n; end if;
    v_ids := v_ids || v_rec; v_caps := v_caps || (v_grupos->>v_g)::numeric;
  end loop;
  if v_ret > 0 then
    insert into recibos (cliente_id, importe, medio, observacion)
    values (v_cli, v_ret, 'otro', case when v_main is null then 'Retenciones' else 'Retenciones · Parte del recibo N° ' || v_num end)
    returning id, numero into v_rec, v_n;
    if v_main is null then v_main := v_rec; v_num := v_n; end if;
    v_ids := v_ids || v_rec; v_caps := v_caps || v_ret;
  end if;
  v_ref := 'Recibo N° ' || v_num;

  -- Repartir lo que cancela de cada factura entre esos recibos
  r := 1;
  for v_x in select * from jsonb_array_elements(v_imputs) loop
    v_resto_f := round((v_x->>'importe')::numeric, 2);
    while v_resto_f > 0.004 and r <= array_length(v_ids, 1) loop
      v_cap := v_caps[r];
      if v_cap <= 0.004 then r := r + 1; continue; end if;
      v_a := least(v_cap, v_resto_f);
      insert into recibo_imputaciones (recibo_id, factura_id, importe) values (v_ids[r], (v_x->>'factura_id')::uuid, v_a);
      v_caps[r] := v_cap - v_a; v_resto_f := v_resto_f - v_a;
    end loop;
    if v_resto_f > 0.01 then raise exception 'Las facturas elegidas suman más que lo que te pagaron.'; end if;
  end loop;

  -- Detalle de cada valor: cheques a la cartera, transferencias al banco
  for v_x in select * from jsonb_array_elements(coalesce(p->'valores', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2); if v_imp is null or v_imp <= 0 then continue; end if;
    v_medio := coalesce(v_x->>'medio', 'transferencia'); v_ch := null;
    if v_medio in ('cheque','echeq') then
      if nullif(v_x->>'fecha_pago','') is null then raise exception 'Poné la fecha de pago del cheque.'; end if;
      insert into cheques (tipo, estado, echeq, numero, banco, librador, cuit_librador, importe, fecha_emision, fecha_pago, cliente_id, notas)
      values ('recibido', 'en_cartera', v_medio = 'echeq', nullif(v_x->>'numero',''), nullif(v_x->>'banco',''),
              coalesce(nullif(v_x->>'titular',''), v_nom), nullif(v_x->>'cuit',''), v_imp,
              nullif(v_x->>'fecha_emision','')::date, (v_x->>'fecha_pago')::date, v_cli, v_ref) returning id into v_ch;
    elsif nullif(v_x->>'cuenta_id','') is not null then
      insert into movimientos_cuenta (cuenta_id, fecha, importe, concepto, origen, ref)
      values ((v_x->>'cuenta_id')::bigint, current_date, v_imp, 'Cobro ' || v_ref || ' · ' || v_nom, 'cobro', v_ref);
    end if;
    insert into comprobante_valores (recibo_id, medio, importe, cuenta_id, cheque_id, banco, numero, fecha_pago, cuit, titular, referencia)
    values (v_main, v_medio, v_imp, nullif(v_x->>'cuenta_id','')::bigint, v_ch, nullif(v_x->>'banco',''), nullif(v_x->>'numero',''),
            nullif(v_x->>'fecha_pago','')::date, nullif(v_x->>'cuit',''), nullif(v_x->>'titular',''), nullif(v_x->>'referencia',''));
  end loop;

  -- Retenciones que te hizo el cliente (van solas a Contable → Retenciones)
  for v_x in select * from jsonb_array_elements(coalesce(p->'retenciones', '[]')) loop
    v_imp := round((v_x->>'importe')::numeric, 2); if v_imp is null or v_imp <= 0 then continue; end if;
    insert into retenciones (fecha, tipo, impuesto, jurisdiccion, cliente_id, comprobante, importe, regimen, alicuota, base, recibo_id, notas)
    values (coalesce(nullif(v_x->>'fecha','')::date, current_date), 'retencion', coalesce(v_x->>'impuesto','IIBB'),
            nullif(v_x->>'jurisdiccion',''), v_cli, nullif(v_x->>'certificado',''), v_imp, nullif(v_x->>'regimen',''),
            nullif(v_x->>'alicuota','')::numeric, nullif(v_x->>'base','')::numeric, v_main, v_ref);
  end loop;

  return jsonb_build_object('numero', v_num, 'id', v_main, 'total', v_tot + v_ret,
    'a_cuenta', round(v_tot + v_ret - coalesce((select sum((x->>'importe')::numeric) from jsonb_array_elements(v_imputs) x), 0), 2));
end $$;

-- ---------- 9. Anular un recibo (con sus partes, cheques, banco y retenciones) ----------
create or replace function public.anular_recibo(p_numero bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_main uuid; v_ref text := 'Recibo N° ' || p_numero;
begin
  if not tiene_rol(variadic array['dueno','administracion']::rol_usuario[]) then raise exception 'Sin permiso.'; end if;
  select id into v_main from recibos where numero = p_numero and not anulado;
  if v_main is null then raise exception 'Ese recibo no existe o ya estaba anulado.'; end if;
  if exists (select 1 from cheques c join comprobante_valores v on v.cheque_id = c.id
              where v.recibo_id = v_main and c.estado <> 'en_cartera') then
    raise exception 'Un cheque de este recibo ya se depositó o se endosó: primero revertí eso en Contable → Cheques.';
  end if;
  update cheques c set estado = 'anulado' from comprobante_valores v where v.recibo_id = v_main and v.cheque_id = c.id;
  delete from movimientos_cuenta where ref = v_ref and origen = 'cobro';
  delete from retenciones where recibo_id = v_main;
  update recibos set anulado = true
   where id = v_main or (cliente_id = (select cliente_id from recibos where id = v_main)
     and observacion in ('Parte del recibo N° ' || p_numero, 'Retenciones · Parte del recibo N° ' || p_numero));
end $$;

revoke execute on function public.registrar_orden_pago(jsonb) from public;
revoke execute on function public.anular_orden_pago(bigint) from public;
revoke execute on function public.registrar_recibo(jsonb) from public;
revoke execute on function public.anular_recibo(bigint) from public;
grant execute on function public.registrar_orden_pago(jsonb) to authenticated;
grant execute on function public.anular_orden_pago(bigint) to authenticated;
grant execute on function public.registrar_recibo(jsonb) to authenticated;
grant execute on function public.anular_recibo(bigint) to authenticated;
grant select on public.v_facturas_proveedor_estado to authenticated;

notify pgrst, 'reload schema';
