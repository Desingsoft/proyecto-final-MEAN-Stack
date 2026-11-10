# Fase 64 — Auditoría de compras por períodos y validaciones

- `AUDITORIA_HASTA=YYYY-MM-DD` incorpora un límite de fecha **inclusivo**. MongoDB utiliza `$lt` con la medianoche UTC del día siguiente para incluir registros durante todo el día final.
- `AUDITORIA_DESDE` y `AUDITORIA_HASTA` pueden utilizarse juntos o por separado; se rechazan rangos invertidos y fechas imposibles.
- Los parámetros se validan antes de conectar a MongoDB. `AUDITORIA_SUCURSAL` exige ObjectId válido y `AUDITORIA_MAX_HALLAZGOS` permanece entre 0 y 100000.
- El acumulador detecta desbordamientos en los conteos por código de hallazgo.
- Ejemplo: `AUDITORIA_DESDE=2026-01-01 AUDITORIA_HASTA=2026-03-31 npm run auditar:recepciones-compras` (desde `backend`).
- Auditoría de solo lectura; no modifica órdenes ni inventarios.

## Verificación pendiente

La batería unitaria no reemplaza la integración con MongoDB real ni la compilación Angular. Ejecutar ambas antes de producción.
