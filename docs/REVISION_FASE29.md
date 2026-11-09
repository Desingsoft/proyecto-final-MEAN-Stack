# Fase 29 — control por sede y asignaciones

## Implementado
- `GET /api/inventario/movimientos` restringe el historial a las sedes autorizadas; admin puede filtrar por sede.
- `POST /api/inventario/movimiento` exige bodega con sucursal activa y actualiza existencia por bodega, stock global y movimiento en una transacción. Los movimientos manuales históricos sin bodega requieren tratamiento separado.
- Endpoints administrativos de consulta y asignación de usuarios/bodegas a sedes; rechazo de cambio de bodega con existencia positiva.
- Panel Angular `/empresa` para administrar asignaciones.

## Facturación electrónica
No se integró proveedor específico: el adaptador HTTP previo sigue siendo preparatorio. Para operar se requiere selección contractual del proveedor, documentación API, credenciales, firma, homologación y habilitación DIAN. No enviar documentos fiscales reales hasta completar estos pasos.

## Pendientes y riesgos
- Aplicar alcance por sucursal a cartera, reportes, órdenes de compra, ajustes, transferencias, anulaciones y todos los endpoints legados; auditar también filtros de escritura y exportación.
- Validar concurrencia y consistencia de inventario con MongoDB replica set y transacciones; crear pruebas con usuarios de sedes distintas.
- Revisar asignación de registros históricos antes de activar multi-sede en producción.
- Ejecutar compilación Angular y pruebas integrales. No se ejecutaron aquí.
