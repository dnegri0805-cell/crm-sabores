-- =========================================================
-- COBRAR Y MOVERSE RÁPIDO — CRM Sabores de mi País
-- Notas rápidas de cada cliente y que el cliente pueda corregir su pedido
-- mientras está por aprobar. Se puede correr más de una vez.
-- =========================================================

do $$
declare tc text := (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.clientes'::regclass and attname = 'id');
begin
  execute format($f$
    create table if not exists notas_cliente (
      id         bigint generated always as identity primary key,
      cliente_id %s not null references clientes(id) on delete cascade,
      texto      text not null,
      creado_en  timestamptz not null default now())$f$, tc);
end $$;
create index if not exists notas_cliente_cli on notas_cliente (cliente_id);
alter table notas_cliente enable row level security;
drop policy if exists "auth_all" on notas_cliente;
create policy "auth_all" on notas_cliente for all to authenticated using (true) with check (true);
grant select, insert, update, delete on notas_cliente to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- El cliente corrige su pedido: se cancela el que estaba por aprobar y vuelve a su carrito
create or replace function corregir_pedido_cliente(p_token text, p_numero bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
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
end $$;
revoke execute on function corregir_pedido_cliente(text, bigint) from public;
grant execute on function corregir_pedido_cliente(text, bigint) to anon, authenticated;

select 'cobrar listo' as resultado;
