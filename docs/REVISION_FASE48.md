# Fase 48 — Historial seguro de transferencias y reintentos Angular

## Incorporado
- GET `/api/inventario/transferencias` (paginado, limitado a 100), filtra por ambas bodegas autorizadas y activas.
- GET `/api/inventario/transferencias/:id`, devuelve 404 si la transferencia involucra una bodega fuera del alcance actual.
- Angular: historial de transferencias de bodegas autorizadas y actualización después de registrar.
- Angular: la clave de idempotencia permanece estable en reintentos del mismo formulario; si cambia la operación, genera una clave nueva. No persiste al recargar la página.

## Límites
- No se han instalado dependencias Angular ni ejecutado compilación en este entorno.
- Los permisos y datos de sucursales históricas requieren pruebas integrales con MongoDB real.
- No se ha implementado conciliación de movimientos históricos ni facturación DIAN real.
