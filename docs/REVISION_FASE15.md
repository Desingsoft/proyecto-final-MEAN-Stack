# Fase 15 — histórico fiscal e idempotencia

## Implementado
- Facturas nuevas: cada renglón conserva descuento, base, IVA, total y tarifa de IVA. La distribución por restos mayores concilia los pesos redondeados con los totales del documento.
- Devoluciones: el cálculo de la nota crédito se basa en las líneas fiscales originales y no consulta tarifas ni descuentos del catálogo.
- Idempotencia: SHA-256 del cuerpo lógico normalizado de devolución. Misma clave y mismo cuerpo devuelve la devolución existente (200); misma clave y distinto cuerpo responde 409.

## Limitaciones relevantes
- Facturas históricas sin desglose fiscal por línea se rechazan para devolución automática; requieren conciliación/migración supervisada.
- Si una factura contiene varias líneas con el mismo SKU, la devolución se rechaza hasta identificar de forma inequívoca la línea original.
- El prorrateo por cantidad puede diferir por redondeos de la última unidad; falta asignación exacta de remanentes por línea considerando devoluciones previas.
- La lectura previa a la transacción y el error de índice único en solicitudes simultáneas pueden producir 409 transitorio; el cliente debe consultar la operación antes de repetirla.
- La protección de huella de solicitud no se ha extendido todavía a pagos y egresos.
- No se realizaron pruebas de integración, compilación Angular ni operaciones reales sobre MongoDB.

## Pruebas finales previstas
1. Factura con varios renglones y descuento, IVA incluido y excluido.
2. Devolución parcial, devolución final y sumatoria exacta de notas crédito.
3. Reintento con misma clave/cuerpo y clave/cuerpo diferente.
4. Solicitudes concurrentes con claves iguales y diferentes.
5. Rechazo seguro de facturas antiguas sin detalle fiscal.
