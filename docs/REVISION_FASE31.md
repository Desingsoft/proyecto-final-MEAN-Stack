# Fase 31 — Recepciones por bodega y transferencias

## Incorporado
- Recepción de compras exige `bodega` activa y sucursal coincidente con la orden. Los roles locales solo pueden recibir en sedes autorizadas. Una recepción actualiza `Producto.stock`, `Existencia` y movimientos en la misma transacción.
- La recepción rechaza productos duplicados y órdenes sin sucursal; los datos antiguos requieren migración explícita.
- `POST /api/inventario/transferencias` recibe `{producto, origen, destino, cantidad, motivo?}`. Requiere autorización sobre **ambas** sucursales; disminuye origen y aumenta destino en una transacción; el stock global no cambia. Los dos movimientos comparten `transferenciaId`.
- `OrdenCompra.recepciones[].bodega` registra el destino físico.

## Pendiente / riesgos
- Órdenes de compra históricas sin sede deben migrarse antes de recibir; la creación y edición de órdenes sigue restringida a administradores.
- Segregación de cartera, anulaciones y reportes aún incompleta.
- No se ejecutaron pruebas con replica set MongoDB ni compilación Angular. Se necesita verificar carreras concurrentes, conciliación de inventario y permisos cruzados.
- Las transacciones requieren MongoDB replica set. Los registros históricos de stock global pueden no coincidir con las existencias por bodega: reconciliar antes de operar.
- El proveedor electrónico continúa sin seleccionarse ni conectarse; no existe emisión DIAN real.
