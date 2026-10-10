-- =========================================================
-- VENTAS 10 — CRM Sabores de mi País
-- Prueba A/B de mensajes (qué versión se mandó a cada cliente).
-- Requiere: ventas-auto.sql. Se puede correr más de una vez.
-- =========================================================

alter table envios_auto add column if not exists variante text;
create index if not exists envios_auto_tipo on envios_auto (tipo, enviado_en desc);

select 'ventas auto2 lista' as resultado;
