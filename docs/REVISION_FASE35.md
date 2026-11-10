# Fase 35 — Auditoría de integridad de transferencias

## Incorporado

- `backend/utils/conciliacionTransferencias.js`: función pura que valida que cada transferencia tenga exactamente una salida y una entrada, con producto, bodegas y cantidad coherentes.
- `backend/scripts/conciliarTransferencias.js`: auditoría de solo lectura sobre MongoDB; recorre transferencias con cursor y consulta sus movimientos asociados, emite JSON de inconsistencias (hasta 200 ejemplos), retorna código 2 si detecta problemas.
- `npm run auditar:transferencias`: comando para ejecutar el diagnóstico con `MONGODB_URI` configurada.
- `backend/tests/fase35-conciliacion.test.js`: cinco pruebas unitarias para casos correctos, faltantes, cantidades incorrectas, duplicados y movimientos ajenos.

## Uso

Desde `backend`, con MongoDB accesible y credenciales de lectura: `npm run auditar:transferencias`. No corrige ni altera inventarios automáticamente. Investigar cada discrepancia antes de hacer ajustes.

## Alcance y pendientes

Esta entrega **no demuestra** que las transferencias sean correctas bajo concurrencia real: no se ejecutó MongoDB ni una simulación multiusuario. No se ejecutó compilación Angular. Permanecen pendientes las pruebas integrales, las migraciones históricas verificadas, la segregación de anulaciones y pagos a proveedores, y la conexión real con proveedor electrónico. El diagnóstico no compara todavía los saldos de `Existencia` contra el historial completo ni valida autorizaciones retrospectivas.
