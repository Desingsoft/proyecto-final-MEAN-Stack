# Fase 69 — Vínculos cruzados de egresos

## Objetivo
Revisar que los egresos asociados a órdenes existentes pero fuera del alcance de la primera conciliación conserven una relación correcta con la sucursal y el proveedor.

## Cambios
- `backend/utils/auditoriaEgresosHuerfanos.js`: identifica diferencias de sucursal y proveedor en la segunda pasada, además de órdenes inexistentes o referencias vacías.
- `backend/scripts/auditarEgresosCompras.js`: registra las órdenes conciliadas para evitar alertas duplicadas entre pasadas.
- Nueve pruebas nuevas y ajuste de la prueba de regresión previa.

## Ejecución
Desde `backend`: `npm run auditar:egresos-compras`. Se necesita `MONGODB_URI` y una instancia accesible. El diagnóstico no modifica datos.

## Verificaciones
`npm test`: 282 aprobadas, 0 fallidas y 3 omitidas (dependen de MongoDB). La compilación de Angular y la integración con MongoDB real siguen pendientes.

## Limitaciones
La lista de identificadores de órdenes conciliadas se mantiene en memoria durante la ejecución; en bases extremadamente grandes conviene reemplazarla por un criterio de alcance calculado a partir de filtros. Las diferencias se informan, no se corrigen automáticamente. Los pagos sin sucursal/proveedor no se califican como discrepancia: se requiere un control separado de completitud.
