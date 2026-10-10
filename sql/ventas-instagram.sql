-- =========================================================
-- INSTAGRAM — CRM Sabores de mi País
-- Usuario de Instagram en los prospectos y campaña fija para el link de la bio.
-- Requiere: ventas-auto.sql. Se puede correr más de una vez.
-- =========================================================

alter table prospectos add column if not exists instagram text;
insert into campanias_qr (codigo, nombre, tipo) values ('INSTAGRAM', 'Instagram (link de la bio)', 'redes')
on conflict (codigo) do nothing;

select 'instagram listo' as resultado;
