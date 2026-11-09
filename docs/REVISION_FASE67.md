# Fase 67 — Conciliación de egresos a proveedores

Se agregó `npm run auditar:egresos-compras` desde `backend`. Requiere `MONGODB_URI` y utiliza los filtros `AUDITORIA_DESDE`, `AUDITORIA_HASTA`, `AUDITORIA_SUCURSAL` y `AUDITORIA_MAX_HALLAZGOS` de la auditoría existente. Es **solo lectura**.

Compara `OrdenCompra.pagado` con la suma de los `Pago` de tipo `egreso` en estado `vigente`. Detecta diferencias, montos inválidos, egresos por encima del total de la orden, egresos en órdenes canceladas, referencias a proveedor/sucursal diferentes, duplicados y desbordamientos. Las anulaciones no incrementan el total vigente.

Procesa órdenes mediante cursor y pagos en lotes de 100 órdenes, con hallazgos detallados acotados y contadores globales. **Limitación:** el diagnóstico no inspecciona egresos huérfanos que referencien órdenes inexistentes, ni sustituye una conciliación contable o bancaria. Las lecturas no usan una instantánea transaccional; durante escrituras concurrentes pueden aparecer diferencias temporales. No se ejecutó contra una base MongoDB real.
