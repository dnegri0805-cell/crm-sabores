-- Lista de precios MANI JL S.A. · Enero 2026 · costo por paquete/pote, IVA incluido
-- Cruza por código de barras (EAN) y, si no, por código interno del fabricante.
-- Cada cambio queda guardado en historial_costos.
with lista(cod, ean, descripcion, costo) as (values
  ('10005','7798148380568','Maní salado sin piel 85 gr',481.07),
  ('10007','7798148380186','Maní salado sin piel 500 gr',2128.81),
  ('10053','7798148380483','Maní salado con piel 85 gr',481.07),
  ('10055','7798148380346','Maní salado con piel 500 gr',2128.81),
  ('10073','7798148380490','Maní tostado pelado sin sal 85 gr',481.07),
  ('10075','7798148380384','Maní tostado pelado sin sal 500 gr',2128.81),
  ('10503','7798148381107','Mix Crocante de Maní 3 sabores 65 gr',481.07),
  ('10513','7798148380711','Crocante Horneado Pizza 65 gr',481.07),
  ('10515','7798148381299','Crocante Horneado Pizza 500 gr',2566.07),
  ('10523','7798148380728','Crocante Horneado Queso 65 gr',481.07),
  ('10525','7798148381305','Crocante Horneado Queso 500 gr',2566.07),
  ('10533','7798148380704','Crocante Horneado Jamón 65 gr',481.07),
  ('10535','7798148381312','Crocante Horneado Jamón 500 gr',2566.07),
  ('10545','7798148380209','Crocante Horneado Salado 500 gr',2566.07),
  ('10555','7798148381336','Crocante Horneado Asado 500 gr',2566.07),
  ('10565','7798148381329','Crocante Horneado Salame 500 gr',2566.07),
  ('10601','7798148381398','Manteca de Maní Cremosa 360 gr',1969.92),
  ('10611','7798148381381','Manteca de Maní Chispeada 360 gr',1969.92)
),
cruce as (
  select l.*, p.id as producto_id, p.descripcion as en_tu_sistema, p.costo as costo_anterior
    from lista l
    left join lateral (
      select id, descripcion, costo from productos
       where trim(ean) = l.ean or trim(codigo_fabricante) = l.cod
       order by (trim(ean) = l.ean) desc limit 1) p on true
),
actualizados as (
  update productos p set costo = c.costo
    from cruce c
   where p.id = c.producto_id and p.costo is distinct from c.costo
  returning p.id
)
select case when c.producto_id is null then '❌ NO ENCONTRADO'
            when c.costo_anterior = c.costo then '= sin cambio'
            else '✔ actualizado' end as estado,
       c.cod as codigo_jl, c.descripcion as lista_jl, c.en_tu_sistema,
       c.costo_anterior, c.costo as costo_nuevo,
       case when c.costo_anterior > 0 then round((c.costo / c.costo_anterior - 1) * 100, 1) end as variacion_pct
  from cruce c
 order by (c.producto_id is null) desc, c.cod;
