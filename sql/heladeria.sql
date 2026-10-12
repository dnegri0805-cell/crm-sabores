-- =========================================================
-- RUBRO HELADERÍA Y PANADERÍA — CRM Sabores de mi País
-- Alta de los 110 productos de la lista JEMA'S (vigente, IVA incluido, dólar $1505), ordenados por familia.
--  · Los que se venden por kilo quedan "por peso" sin peso de pieza: se piden por kilo y el costo es por kilo.
--  · Bulto = kilos (o unidades) de la bolsa, caja o balde del proveedor.
--  · Los "a consultar" quedan con costo 0: no aparecen en el catálogo hasta que les cargues el costo.
--  · No toca productos que ya existan (mismo código o misma descripción): los muestra como "ya estaba".
--  · El margen de cada familia se ajusta en Precios → Margen adicional por familia (requiere margen-familia.sql).
-- Requiere: bultos.sql y ventas-peso.sql. Se puede correr más de una vez.
-- =========================================================

-- Proveedor
insert into proveedores (razon_social)
select 'JEMA''S' where not exists (select 1 from proveedores where upper(trim(razon_social)) in ('JEMA''S','JEMAS'));

with lista(codigo, descripcion, marca, familia, costo, por_peso, unidades_bulto, tipo_bulto, dolarizado) as (values
  ('60001','Baño granizado semiamargo especial CHI 10 kg','CHI','Coberturas y baños de chocolate',8148.55,true,10,'Balde',false),
  ('60002','Baño semiamargo para palito especial CHI 10 kg','CHI','Coberturas y baños de chocolate',8464.21,true,10,'Balde',false),
  ('60003','Baño de moldeo blanco CHI 20 kg','CHI','Coberturas y baños de chocolate',7856.28,true,20,'Bolsa',false),
  ('60004','Baño de moldeo con leche CHI 20 kg','CHI','Coberturas y baños de chocolate',7856.28,true,20,'Bolsa',false),
  ('60005','Cobertura semiamarga CHI 20 kg','CHI','Coberturas y baños de chocolate',17688.84,true,20,'Bolsa',false),
  ('60006','Cobertura blanca CHI 20 kg','CHI','Coberturas y baños de chocolate',20397.06,true,20,'Bolsa',false),
  ('60007','Cobertura amarga 70% cacao CHI 20 kg','CHI','Coberturas y baños de chocolate',21714.57,true,20,'Bolsa',false),
  ('60008','Cobertura con leche CHI 20 kg','CHI','Coberturas y baños de chocolate',15224.6,true,20,'Bolsa',false),
  ('60009','Cacao Gerkens 25 kg','Gerkens','Coberturas y baños de chocolate',15050.0,true,25,'Bolsa',true),
  ('60010','Manteca de cacao Gerkens 25 kg','Gerkens','Coberturas y baños de chocolate',0,true,25,'Caja',true),
  ('60101','Almendra bañada en chocolate CHI 7 kg','CHI','Chips, crocantes y decoración',20148.0,true,7,'Caja',false),
  ('60102','Chip semiamargo CHI 7 kg','CHI','Chips, crocantes y decoración',7331.71,true,7,'Caja',false),
  ('60103','Chip blanco CHI 5 kg','CHI','Chips, crocantes y decoración',7624.5,true,5,'Caja',false),
  ('60104','Chocolate blanco en trocitos 14 kg',null,'Chips, crocantes y decoración',10700.0,true,14,'Caja',false),
  ('60105','Chocolate marroc para sembrar 14 kg',null,'Chips, crocantes y decoración',10200.0,true,14,'Caja',false),
  ('60106','Chocolate marroc para sembrar caja térmica 8 kg',null,'Chips, crocantes y decoración',11200.0,true,8,'Caja',false),
  ('60107','Lentejas de chocolate CHI 7 kg','CHI','Chips, crocantes y decoración',14346.25,true,7,'Caja',false),
  ('60108','Microgalletitas blancas CHI 5 kg','CHI','Chips, crocantes y decoración',8768.17,true,5,'Caja',false),
  ('60109','Microgalletitas semiamargas CHI 5 kg','CHI','Chips, crocantes y decoración',8651.26,true,5,'Caja',false),
  ('60110','Galletita Tapi Black (tapita mini) 4 kg',null,'Chips, crocantes y decoración',4950.0,true,4,'Caja',false),
  ('60111','Galletita Dale Black (tipo Oreo) 3 kg',null,'Chips, crocantes y decoración',6098.4,true,3,'Caja',false),
  ('60112','Kinder chocolate 12 kg',null,'Chips, crocantes y decoración',11000.0,true,12,'Caja',false),
  ('60113','Botón relleno de dulce de leche 5 kg',null,'Chips, crocantes y decoración',8970.0,true,5,'Caja',false),
  ('60114','Crocante de maní sabor almendra Caviwa 15 x 1 kg','Caviwa','Chips, crocantes y decoración',5908.98,true,15,'Caja',false),
  ('60115','Mantecol 10,5 kg','Mantecol','Chips, crocantes y decoración',7000.0,true,1,'Caja',false),
  ('60201','Almendra Guara N° 2 10 kg',null,'Frutos secos',15600.0,true,10,'Caja',false),
  ('60202','Almendra Nonpareil K27/30 10 kg',null,'Frutos secos',18000.0,true,10,'Caja',true),
  ('60203','Castaña de cajú W4 22,68 kg',null,'Frutos secos',14175.0,true,1,'Caja',true),
  ('60204','Nuez Chandler cuartillo light 10 kg',null,'Frutos secos',14600.0,true,10,'Caja',false),
  ('60205','Nuez mariposa extra light 10 kg',null,'Frutos secos',15300.0,true,10,'Caja',false),
  ('60206','Pasa de uva sultanina 10 kg',null,'Frutos secos',5675.0,true,10,'Caja',false),
  ('60207','Coco rallado high fat 25 kg',null,'Frutos secos',0,true,25,'Bolsa',false),
  ('60301','Ananá para sembrar Vanesa 10 kg','Vanesa','Frutas para sembrar',9854.2,true,10,'Balde',false),
  ('60302','Ananá en trozos Vanesa 10 kg','Vanesa','Frutas para sembrar',7690.8,true,10,'Caja',false),
  ('60303','Cereza entera Curicó 6 x 3,1 kg','Curicó','Frutas para sembrar',8903.23,true,1,'Caja',false),
  ('60304','Durazno en trozos Vanesa 10 kg','Vanesa','Frutas para sembrar',6609.6,true,10,'Caja',false),
  ('60305','Frutilla en trozos para sembrar Vanesa 10 kg','Vanesa','Frutas para sembrar',3396.0,true,10,'Caja',false),
  ('60306','Frutilla entera para sembrar Vanesa 10 kg','Vanesa','Frutas para sembrar',6564.0,true,10,'Balde',false),
  ('60307','Frutilla pulpa molida Vanesa 10 kg','Vanesa','Frutas para sembrar',3396.0,true,10,'Balde',false),
  ('60308','Frutilla tamizada Vanesa 10 kg','Vanesa','Frutas para sembrar',3079.2,true,10,'Balde',false),
  ('60309','Pulpa de frutilla entera Vanesa 10 kg','Vanesa','Frutas para sembrar',4176.0,true,10,'Caja',false),
  ('60310','Frutilla IQF 14 kg',null,'Frutas para sembrar',0,true,14,'Caja',false),
  ('60311','Frutos del bosque Pehuenia 15 kg','Pehuenia','Frutas para sembrar',6754.54,true,15,'Caja',false),
  ('60312','Higos para sembrar Vanesa 5 kg','Vanesa','Frutas para sembrar',6156.0,true,5,'Lata',false),
  ('60313','Quinotos partidos para sembrar Vanesa 5 kg','Vanesa','Frutas para sembrar',4276.8,true,5,'Lata',false),
  ('60401','Pasta de ananá Pehuenia 5 kg','Pehuenia','Pastas y variegatos',16824.46,true,5,'Balde',false),
  ('60402','Pasta de banana Pehuenia 5 kg','Pehuenia','Pastas y variegatos',9649.23,true,5,'Balde',false),
  ('60403','Pasta de cereza Pehuenia 5 kg','Pehuenia','Pastas y variegatos',21645.99,true,5,'Balde',false),
  ('60404','Pasta de coco Pehuenia 5 kg','Pehuenia','Pastas y variegatos',13663.65,true,5,'Balde',false),
  ('60405','Pasta de frutilla Pehuenia 5 kg','Pehuenia','Pastas y variegatos',11167.56,true,5,'Balde',false),
  ('60406','Pasta de melón Pehuenia 5 kg','Pehuenia','Pastas y variegatos',8788.63,true,5,'Balde',false),
  ('60407','Pasta de vainilla al huevo Pehuenia 5 kg','Pehuenia','Pastas y variegatos',9055.57,true,5,'Balde',false),
  ('60408','Pasta de marroc Pehuenia 4 kg','Pehuenia','Pastas y variegatos',23310.3,true,4,'Balde',false),
  ('60409','Pasta de maní Pehuenia 10 kg','Pehuenia','Pastas y variegatos',12687.72,true,10,'Balde',false),
  ('60410','Pasta de maní para elaborar 10 kg',null,'Pastas y variegatos',4608.0,true,10,'Balde',false),
  ('60411','Variegato de maracuyá con semillas Pehuenia 12 kg','Pehuenia','Pastas y variegatos',10278.57,true,12,'Balde',false),
  ('60412','Limón 50 g/l Pehuenia 5 kg','Pehuenia','Pastas y variegatos',10383.16,true,5,'Bolsa',true),
  ('60501','Dulce de leche familiar La Salamandra 10 kg','La Salamandra','Dulce de leche familiar y heladero',2550.0,true,10,'Cuñete',false),
  ('60502','Dulce de leche familiar Cassanello 12 kg','Cassanello','Dulce de leche familiar y heladero',3668.88,true,12,'Balde',false),
  ('60503','Dulce de leche familiar El Rosquinense 10 kg','El Rosquinense','Dulce de leche familiar y heladero',3418.96,true,10,'Cuñete',false),
  ('60504','Dulce de leche heladero El Rosquinense 25 kg','El Rosquinense','Dulce de leche familiar y heladero',3050.0,true,25,'Cuñete',false),
  ('60505','Dulce de leche heladero Milkey 25 kg','Milkey','Dulce de leche familiar y heladero',3356.5,true,25,'Cuñete',false),
  ('60506','Dulce de leche heladero Cassanello 25 kg','Cassanello','Dulce de leche familiar y heladero',3430.81,true,25,'Cuñete',false),
  ('60507','Dulce de leche heladero Cassanello 12 kg','Cassanello','Dulce de leche familiar y heladero',3705.19,true,12,'Balde',false),
  ('60601','Salsa de caramelo Eureka','Eureka','Salsas para helado',3508.5,false,12,'Caja',false),
  ('60602','Salsa de chocolate Eureka','Eureka','Salsas para helado',5441.7,false,12,'Caja',false),
  ('60603','Salsa de dulce de leche Eureka','Eureka','Salsas para helado',4084.5,false,12,'Caja',false),
  ('60604','Salsa de frutilla Eureka','Eureka','Salsas para helado',3101.29,false,12,'Caja',false),
  ('60701','Ácido cítrico 25 kg',null,'Insumos para elaborar',3075.77,true,25,'Bolsa',true),
  ('60702','Agente de batido Adiquick 25 kg','Adiquick','Insumos para elaborar',20262.0,true,25,'Bolsa',true),
  ('60703','Almidón de maíz Ingredion 25 kg','Ingredion','Insumos para elaborar',1384.96,true,25,'Bolsa',false),
  ('60704','Azúcar común 10 x 1 kg',null,'Insumos para elaborar',1115.5,true,10,'Paquete',false),
  ('60705','Azúcar común 25 kg',null,'Insumos para elaborar',1035.0,true,25,'Bolsa',false),
  ('60706','Azúcar común 50 kg',null,'Insumos para elaborar',966.0,true,50,'Bolsa',false),
  ('60707','Cerelose Ingredion 25 kg','Ingredion','Insumos para elaborar',2612.0,true,25,'Bolsa',false),
  ('60708','Maltodextrina Ingredion 25 kg','Ingredion','Insumos para elaborar',2410.32,true,25,'Bolsa',true),
  ('60709','Estabilizante neutro para cremas Nutriwip 20 kg','Nutriwip','Insumos para elaborar',20500.0,true,20,'Bolsa',false),
  ('60710','Leche en polvo descremada Regina 25 kg','Regina','Insumos para elaborar',6200.0,true,25,'Bolsa',false),
  ('60711','Leche en polvo entera Regina 25 kg','Regina','Insumos para elaborar',6920.0,true,25,'Bolsa',false),
  ('60712','Colorante rojo 10 L',null,'Insumos para elaborar',10591.5,false,10,'Bidón',true),
  ('60713','Colorante amarillo 10 L',null,'Insumos para elaborar',10591.5,false,10,'Bidón',true),
  ('60714','Colorante azul 10 L',null,'Insumos para elaborar',17167.44,false,10,'Bidón',true),
  ('60715','Colorante verde 10 L',null,'Insumos para elaborar',12236.0,false,10,'Bidón',true),
  ('60716','Vino Marsala Florio 20 L','Florio','Insumos para elaborar',4500.0,false,20,'Bidón',false),
  ('60801','Cucurucho caja x 200',null,'Cucuruchos y capelinas',28000.0,false,1,'Caja',false),
  ('60802','Cucurucho grande caja x 180',null,'Cucuruchos y capelinas',28000.0,false,1,'Caja',false),
  ('60803','Cucurucho x 3 caja x 150',null,'Cucuruchos y capelinas',28000.0,false,1,'Caja',false),
  ('60804','Capelina caja x 100',null,'Cucuruchos y capelinas',24000.0,false,1,'Caja',false),
  ('60901','Balde con tapa Arenales','Arenales','Descartables y envases',3390.0,false,10,'Paquete',false),
  ('60902','Balde con tapa Enirsa','Enirsa','Descartables y envases',1495.0,false,30,'Paquete',false),
  ('60903','Cucharita palita flúo 10 kg',null,'Descartables y envases',6900.0,true,10,'Bolsa',false),
  ('60904','Cucharita palita opaca 10 kg',null,'Descartables y envases',4581.6,true,10,'Bolsa',false),
  ('60905','Cuchara palita corta color Colono 10 x 1 kg','Colono','Descartables y envases',9196.32,true,10,'Bolsa',false),
  ('60906','Cuchara palita larga color Colono 10 x 1 kg','Colono','Descartables y envases',10406.58,true,10,'Bolsa',false),
  ('60907','Cuchara palita corta flúo Colono 10 x 1 kg','Colono','Descartables y envases',9591.0,true,10,'Bolsa',false),
  ('60908','Cuchara palita larga flúo Colono 10 x 1 kg','Colono','Descartables y envases',11266.32,true,10,'Bolsa',false),
  ('60909','Cucharita sundae blanca caja x 1000',null,'Descartables y envases',8942.4,false,1,'Caja',false),
  ('60910','Cucharita sundae negra caja x 1000',null,'Descartables y envases',8942.4,false,1,'Caja',false),
  ('60911','Cuchara sundae blanca Colono caja x 1000','Colono','Descartables y envases',15632.64,false,1,'Caja',false),
  ('60912','Cuchara sundae color Colono caja x 1000','Colono','Descartables y envases',17784.84,false,1,'Caja',false),
  ('60913','Servilleta Zigzag caja x 10000','Zigzag','Descartables y envases',42999.77,false,1,'Caja',false),
  ('60914','Térmico rectangular 19-12-12 x 50',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60915','Térmico rectangular 26-10-9 x 50',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60916','Térmico rectangular 34-12-12 x 35',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60917','Térmico rectangular bombón x 6 con división x 30',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60918','Térmico redondo 3 L x 50',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60919','Térmico cónico 1/4 kg facetado x 100',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60920','Térmico cónico 1/2 kg facetado x 100',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60921','Térmico cónico 1 kg facetado x 100',null,'Descartables y envases',0,false,1,'Paquete',false),
  ('60922','Vaso de pasta N° 50 Carrizo x 360','Carrizo','Descartables y envases',0,false,1,'Caja',false)
),
pv as (select id from proveedores where upper(trim(razon_social)) in ('JEMA''S','JEMAS') order by id limit 1),
cruce as (
  select l.*, p.id as producto_id
    from lista l
    left join lateral (select id from productos
                        where trim(codigo) = l.codigo or upper(trim(descripcion)) = upper(l.descripcion) limit 1) p on true
),
nuevos as (
  insert into productos (codigo, descripcion, marca, familia, costo, por_peso, unidades_bulto, tipo_bulto, proveedor_id)
  select c.codigo, c.descripcion, c.marca, c.familia, c.costo, c.por_peso, c.unidades_bulto, c.tipo_bulto, (select id from pv)
    from cruce c where c.producto_id is null
  returning codigo
)
select case when n.codigo is not null then case when c.costo > 0 then '✔ cargado' else '✔ cargado (precio a consultar)' end
            else '= ya estaba' end as estado,
       c.familia, c.codigo, c.descripcion, c.costo,
       case when c.dolarizado then 'sí' else '' end as dolarizado
  from cruce c left join nuevos n on n.codigo = c.codigo
 order by c.codigo;
