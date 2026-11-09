# Fase 53 — Abastecimiento y reposición por sede

## Cambios
- El catálogo de proveedores incorpora `diasEntrega` (1–180 días), distinto de `diasCredito`.
- La reposición por sucursal considera órdenes de compra **enviadas** y **parciales** de la misma sede; descuenta `cantidad - cantidadRecibida` como mercancía en camino.
- Se usa el plazo individual del proveedor cuando está disponible, o el plazo manual de la pantalla en caso contrario.
- Angular muestra días de entrega y mercancía en camino.
- Se añaden seis pruebas del cálculo y validaciones.

## Limitaciones y seguridad
- No representa fechas efectivas de arribo ni descuenta automáticamente órdenes vencidas; revisar manualmente.
- Las salidas de inventario pueden incluir ajustes y no son necesariamente ventas reales.
- El inventario histórico sin sucursal no se reasigna.
- No se ejecutó una prueba real de transacciones MongoDB ni compilación Angular en esta fase.
- El controlador de proveedores acepta `diasEntrega` en altas y ediciones, y aplica una lista de campos permitidos para impedir asignaciones masivas de propiedades administrativas.
