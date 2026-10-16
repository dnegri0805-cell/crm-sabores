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
