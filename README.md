# CRM Sabores de mi País

Sistema de gestión de la distribuidora: pedidos, clientes, cobranza y compras.
Se publica automáticamente en GitHub Pages desde la rama main:
https://dnegri0805-cell.github.io/crm-sabores/

## Base de datos (Supabase)

- `sql/00-esquema-completo.sql`: foto completa de la estructura de la base (sin datos).
  Sirve para recrear todo en un proyecto nuevo de Supabase.
- Para actualizar esa foto: correr `sql/exportar-esquema.sql` en el SQL Editor
  de Supabase y guardar el resultado como `sql/00-esquema-completo.sql`.
- El resto de los archivos de `sql/` son los cambios que se fueron sumando.

## Versiones (arranque rápido)
La app se abre desde la copia guardada en el celular (`sw.js`) y mira `version.json` para saber si hay una versión nueva.
Cada vez que se publica un cambio en `index.html` o `pedido.html`, subir su `VERSION` y poner el mismo valor en `version.json` (`crm` o `pedido`).

## Órdenes de pago y recibos detallados
Correr una vez `sql/ordenes-pago.sql` en Supabase. Agrega: órdenes de pago numeradas (Compras → Órdenes de pago), pago escalonado por factura,
valores con detalle (eCheq, cheques de cartera, transferencias por cuenta), retenciones sufridas y practicadas, certificados y anulación.

## Archivos del programa
- `app.js`: el CRM (todo lo que se usa al abrir y en el día a día).
- `extras.js`: pantallas de uso ocasional (Contable, Reportes, Folletos, Impresora, Manual, Ventas y otras). Se baja sola en segundo plano y queda guardada en el celular. La lista de lo que vive ahí está en `EXTRAS` dentro de `app.js`: si se agrega una función nueva a `extras.js`, sumarla a esa lista.
- Costos protegidos: el vendedor no puede leer `productos.costo`, `costo_usd`, `pedido_items.costo_unitario` ni costo/margen de `aprobaciones_precio`. El resto del equipo los lee por las vistas `*_c` (lo resuelve `PRIV` en `app.js`). Si se agregan columnas a esas tablas, correr `select columnas_privadas_refrescar();` en Supabase y sumarlas a `PRIV`.
