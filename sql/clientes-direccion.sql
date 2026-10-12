-- =========================================================
-- DIRECCIÓN COMPLETA DE CLIENTES — CRM Sabores de mi País
-- Agrega barrio, localidad, provincia y código postal a los clientes.
-- Se puede correr más de una vez.
-- =========================================================
alter table clientes add column if not exists barrio        text;
alter table clientes add column if not exists ciudad        text;   -- localidad / partido
alter table clientes add column if not exists provincia     text;
alter table clientes add column if not exists codigo_postal text;
alter table clientes add column if not exists zona          text;   -- zona de reparto (si no, se usa el barrio)

select 'dirección de clientes lista' as resultado;
