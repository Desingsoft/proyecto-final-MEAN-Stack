# Fase 14 — Devoluciones e integridad comercial

## Inventario
- Reintegros y anulaciones actualizan `Existencia` (bodega original), `Producto.stock` y `MovimientoInventario` en la misma transacción.
- Si existe inventario multibodega y el pedido no registra bodega, se rechaza la reposición: no se asigna una ubicación inventada.
- Para productos sin fila `Existencia`, se requiere conciliación previa; no se crea una fila con saldo inicial desconocido.
- El movimiento registra la bodega de la operación.

## Histórico comercial
- El precio unitario procede de la línea original del pedido; el descuento y el IVA proceden de la factura emitida, nunca del catálogo actual.
- **Limitación**: el sistema conserva descuento e IVA a nivel de documento, no por línea; devoluciones parciales de artículos con tasas o descuentos heterogéneos requieren un esquema fiscal por línea antes de garantizar exactitud completa.
- Deben revisarse redondeos acumulados y notas crédito históricas al realizar pruebas.

## Reintentos
- El formulario de devolución congela la solicitud original y su clave `Idempotency-Key` hasta una confirmación positiva.
- Si el resultado es incierto, el usuario debe consultar el historial antes de iniciar otra operación.
- Pendiente: guardar el hash de solicitud en backend y devolver la respuesta original para reintentos idénticos (actualmente responde 409 por índice único).

## Pendiente de pruebas finales
MongoDB replica set, conflictos simultáneos, anulación con stock consumido, bodega ausente, redondeos, Angular y pruebas de regresión. No se ejecutaron pruebas funcionales.
