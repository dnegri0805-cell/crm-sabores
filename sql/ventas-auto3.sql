-- =========================================================
-- VENTAS 11 — CRM Sabores de mi País
-- Cumpleaños de los clientes y opiniones reales en el catálogo público.
-- Requiere: ventas-auto2.sql. Se puede correr más de una vez.
-- =========================================================

alter table clientes  add column if not exists cumpleanos date;
alter table encuestas add column if not exists publicar boolean not null default false;

-- Opiniones que el dueño eligió mostrar (solo 4 y 5 estrellas con comentario)
create or replace function opiniones_publicas()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by f desc), '[]'::jsonb) from (
    select jsonb_build_object('t', left(e.comentario, 280), 'n', c.razon_social, 'r', c.rubro, 'p', e.puntaje) x, e.respondida_en f
      from encuestas e join clientes c on c.id = e.cliente_id
     where e.publicar and e.puntaje >= 4 and coalesce(trim(e.comentario), '') <> ''
     order by e.respondida_en desc nulls last limit 8) z
$$;
revoke execute on function opiniones_publicas() from public;
grant execute on function opiniones_publicas() to anon, authenticated;

select 'ventas auto3 lista' as resultado;
