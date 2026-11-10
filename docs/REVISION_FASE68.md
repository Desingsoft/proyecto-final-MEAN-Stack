# Fase 68 — Egresos sin orden de compra

## Alcance
Se añadió una segunda pasada de solo lectura a `npm run auditar:egresos-compras` para detectar egresos sin referencia a orden (`EGRESO_SIN_ORDEN`) y egresos que apuntan a una orden inexistente (`EGRESO_ORDEN_INEXISTENTE`).

La auditoría procesa pagos en lotes de 100, consulta sus órdenes asociadas en un solo lote y acumula los hallazgos bajo el límite configurable ya existente. Incluye `pagosVinculosRevisados` en el JSON. La segunda pasada no duplica las verificaciones de proveedor y sucursal realizadas durante la conciliación por orden.

## Alcance de filtros
`AUDITORIA_DESDE`, `AUDITORIA_HASTA` y `AUDITORIA_SUCURSAL` se aplican a las órdenes en la primera pasada y a los egresos en la segunda. Esto permite localizar pagos sin orden incluso si la orden original no existe. El resultado combina ambos universos; los totales de órdenes y pagos revisados no necesariamente corresponden al mismo período de creación.

## Validación
`npm test`: 273 aprobadas, 0 fallidas, 3 omitidas (requieren MongoDB). La auditoría real y la compilación Angular siguen pendientes. No se han modificado datos ni se ha comprobado la ejecución con una base MongoDB activa.
