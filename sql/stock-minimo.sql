-- Permite cambiar el stock mínimo de un producto desde el CRM
create or replace function fijar_minimo(p_producto uuid, p_minimo numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_minimo is null or p_minimo < 0 then raise exception 'El mínimo no puede ser negativo'; end if;
  update productos set stock_minimo = p_minimo where id = p_producto;
end $$;
revoke execute on function fijar_minimo(uuid, numeric) from public, anon;
grant execute on function fijar_minimo(uuid, numeric) to authenticated;
select 'minimo listo' as resultado;
