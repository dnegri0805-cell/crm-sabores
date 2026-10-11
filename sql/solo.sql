-- =========================================================
-- TRABAJAR MENOS — CRM Sabores de mi País
-- Aprobación automática de pedidos online de clientes de confianza.
-- Se activa desde el CRM (Inicio → Mi día → Aprobación automática). Se puede correr más de una vez.
-- =========================================================

alter table pedidos add column if not exists auto_aprobado boolean not null default false;

-- Se evalúa al final de la operación, cuando el pedido ya tiene todos sus productos y su total
create or replace function auto_aprobar() returns trigger
language plpgsql security definer set search_path = public as $$
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
end $$;

drop trigger if exists auto_aprobar on pedidos;
create constraint trigger auto_aprobar after insert on pedidos
  deferrable initially deferred for each row execute function auto_aprobar();

select 'aprobación automática lista' as resultado;
