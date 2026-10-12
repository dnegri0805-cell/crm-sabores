-- =========================================================
-- PEDIDOS: NOTA, FECHA DE ENTREGA Y PRECIO A MANO — CRM Sabores de mi País
-- Se puede correr más de una vez.
-- =========================================================
alter table pedidos      add column if not exists observaciones text;
alter table pedidos      add column if not exists fecha_entrega date;
alter table pedido_items add column if not exists precio_manual boolean not null default false;

select 'pedidos: nota, fecha de entrega y precio a mano listos' as resultado;
