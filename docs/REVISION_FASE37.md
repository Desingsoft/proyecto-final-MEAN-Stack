# Fase 37 — Concurrencia de movimientos manuales de inventario

## Alcance implementado
- Sustituye el patrón de lectura, modificación y guardado del stock por incrementos/decrementos condicionales (`$inc`, `$gte`) tanto en la existencia de bodega como en el stock general.
- Los cambios y la creación del movimiento ocurren dentro de una transacción MongoDB. Si cualquiera falla, se revierte todo.
- Las entradas pueden crear la existencia en la bodega mediante `upsert`.
- El listado de movimientos valida IDs, tipo y paginación (máximo 100 registros por página).
- Se añaden cinco pruebas automatizadas de **estructura**, que no sustituyen pruebas funcionales de concurrencia.

## Restricciones y riesgos pendientes
- Requiere MongoDB con transacciones (replica set o clúster compatible).
- Deben realizarse pruebas reales de solicitudes simultáneas y de permisos entre sedes.
- Debe verificarse la migración de registros históricos sin sucursal y la conciliación de existencias.
- No se han probado integración DIAN, compilación Angular ni una base MongoDB en esta fase.
- Los ajustes manuales todavía requieren una política formal de autorización, motivo y auditoría antes de producción.

## Comprobaciones
`node --check controllers/inventarioController.js` y `node --test tests/fase37-inventario.test.js` desde `backend`.
