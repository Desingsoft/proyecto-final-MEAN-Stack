# Fase 71 — Referencias obligatorias de egresos

## Cambio
La auditoría de egresos detecta pagos sin sucursal o proveedor cuando la orden vinculada sí tiene estos datos. Se aplica tanto a la primera pasada de conciliación como a la revisión de vínculos de órdenes fuera del filtro; la segunda pasada omite las órdenes ya conciliadas para no duplicar alertas.

Códigos nuevos: `EGRESO_SIN_SUCURSAL` y `EGRESO_SIN_PROVEEDOR`.

## Ejecución
Desde `backend`: `npm test` y, con MongoDB configurado, `npm run auditar:egresos-compras`.

## Límites
No se ha validado la ejecución con MongoDB real ni la compilación de Angular. El diagnóstico es de solo lectura. La ausencia de proveedor/sucursal en la orden debe revisarse por las reglas de integridad de compras.
