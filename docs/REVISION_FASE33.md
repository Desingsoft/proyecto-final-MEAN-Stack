# Fase 33 — Alcance de pagos, cartera por pagar y reporte por sucursal

## Implementado
- `GET /api/reportes/sucursal/resumen?sucursal=<ObjectId>`: conteo y total de pedidos por estado y unidades por bodega, filtrados por sucursal; no son cifras de facturación.
- Consulta de pago individual: valida la sede del pedido vinculado al documento para usuarios locales, incluso si el pago tiene un campo `sucursal` inconsistente.
- Consulta de pagos por documento: incorpora control de sede en la ruta.
- Cuentas por pagar: el controlador admite alcance de sucursales y aplica el filtro antes de calcular saldos. **La ruta permanece solo para administradores**; esto prepara la segregación para futuros roles locales.

## Pendientes críticos
- La segregación integral de reportes globales, anulaciones y pagos a proveedores aún no está terminada.
- Revisar la coherencia histórica de sucursales y pagos sin sede antes de migrar; no se reasignan automáticamente.
- Las transferencias entre sucursales deben validarse con pruebas reales de concurrencia y transacciones MongoDB.
- Compilación Angular y pruebas de integración completas pendientes.
- La integración DIAN sigue requiriendo proveedor y credenciales; no se afirma emisión válida.
