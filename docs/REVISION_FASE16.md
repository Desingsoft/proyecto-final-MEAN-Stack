# Fase 16 — Redondeos, idempotencia y facturas históricas

## Cambios en código

1. `backend/utils/creditoFiscal.js`: distribución por diferencias acumuladas de redondeos por unidad, con límites por cada componente fiscal. El cálculo definitivo se vuelve a verificar bajo transacción antes de crear la nota crédito. **Supuesto**: una línea de factura identificada inequívocamente por SKU/producto; ventas con líneas duplicadas deben regularizarse.
2. `backend/utils/huellaOperacion.js` y `models/Pago.js`: huella SHA-256 de tipo, documento u orden, monto, método, fecha explícita, referencia y nota. `pagoController.js` devuelve 200 con `repetida: true` cuando la clave y huella coinciden; devuelve 409 si la clave pertenece a otra solicitud o a un registro antiguo sin huella. Los nuevos pagos guardan la huella. **El frontend debe conservar exactamente la carga útil al reintentar.**
3. `backend/scripts/auditarFacturasHistoricas.js`: auditoría de solo lectura, reporte JSON de facturas sin datos fiscales completos por línea, duplicación de SKU y descuadres. Ejecutar manualmente `cd backend && npm run auditar:facturas`. No ejecutar sobre producción sin copia de seguridad y aprobación.

## Protocolo de migración de facturas antiguas

- Respaldar la base y verificar la restauración en un entorno aislado.
- Ejecutar el auditor y clasificar cada factura. El reporte **no contiene datos personales**, pero sí identificadores de documentos.
- Para cada factura pendiente, obtener el soporte fiscal original y reconciliar precio, descuento, base, impuesto y total por renglón.
- Resolver manualmente duplicados de SKU, líneas mixtas y diferencias de redondeo; conservar acta de revisión y responsable.
- Solo después de validar, desarrollar y aprobar un script de migración **separado, reversible y con bitácora**. Esta entrega NO modifica documentos históricos.
- Bloquear devoluciones automáticas para facturas sin detalle fiscal verificable; no inferir impuestos desde el catálogo actual.

## Limitaciones y validación final pendiente

- Sin pruebas de ejecución, compilación Angular ni integración MongoDB, por acuerdo.
- La idempotencia antigua sin huella devuelve conflicto para evitar asumir equivalencia.
- Las transacciones MongoDB requieren replica set y los índices únicos deben existir físicamente en la base.
- La concurrencia, devoluciones sucesivas, cancelación de notas crédito, totales mixtos y redondeos extremos requieren pruebas al cierre.
- Los cálculos fiscales usan pesos enteros; confirmar reglas de redondeo y tratamiento tributario aplicable antes de uso productivo.
