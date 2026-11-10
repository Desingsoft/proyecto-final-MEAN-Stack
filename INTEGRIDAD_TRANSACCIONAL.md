# Integridad de pedidos, inventario y cartera

## 1. Trazabilidad de movimientos
Los movimientos nuevos de venta/cancelación se asocian a `pedido`. Los movimientos de devolución/anulación se asocian además a `devolucion`. **Los registros anteriores no se migran automáticamente**: requieren reconciliación manual.

## 2. Máquina de estados
`pendiente → procesando → enviado → completado`. Solo se puede cancelar en `pendiente` o `procesando`. Los pedidos enviados/completados se gestionan mediante devoluciones; no se revierte el stock de una venta ya entregada mediante cancelación. Reintentar el mismo estado no modifica datos.

## 3. Bodegas
Cuando existe cualquier registro en `Existencia`, la creación de un pedido exige `bodegaId` y descuenta tanto el stock global como el de la ubicación en una transacción. Al cancelar se repone a la misma bodega. Si un pedido histórico no registra bodega, la cancelación se bloquea hasta conciliar manualmente. **Advertencia:** el formulario Angular debe enviar `bodegaId` antes de utilizar ventas con múltiples bodegas. La detección global de existencias por bodega exige que toda la empresa migre de forma coherente.

## 4. Pagos, devoluciones y cartera: revisión pendiente
`pagoController`, `devolucionController` y `documentoController` ya usan `conTransaccion`, pero existen lecturas de saldo y cantidades devueltas previas a la transacción. Deben trasladarse a la sesión transaccional y protegerse contra concurrencia. La anulación de devoluciones debe considerar reembolsos previos y existencias por bodega. **No se certifica atomicidad de estos flujos en esta fase**.

## 5. Histórico de precios, descuentos e impuestos
`Pedido.items.precioUnitario` conserva precios al crear el pedido; `Documento` conserva importes y configuración tributaria al emitir la factura. Se añaden al pedido campos de descuento e IVA para futuras integraciones, sin recalcular pedidos históricos. Los impuestos de la cotización aún no tienen un modelo de snapshot fiscal completo; no se debe inferir que están congelados desde la cotización.

## 6. Pruebas diferidas
Por solicitud del usuario no se ejecutaron pruebas funcionales ni integraciones. Antes de producción: probar transacciones simultáneas, cancelaciones, devoluciones parciales, reembolsos, bodega de origen, índices y migraciones de datos.
