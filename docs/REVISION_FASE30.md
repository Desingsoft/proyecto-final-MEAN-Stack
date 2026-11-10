# Fase 30 — Aislamiento conservador por sucursal

## Cambios
- Las órdenes de compra incluyen campo `sucursal` indexado. Las consultas de lista y detalle de usuarios locales se filtran por sucursales asignadas. Los registros históricos sin sede no son visibles a usuarios locales.
- Las operaciones de escritura de órdenes de compra, incluida la recepción, **se restringen temporalmente a administradores**: la recepción anterior actualiza inventario global y todavía no asigna existencias a una bodega de destino. Permitirla a usuarios locales rompería el aislamiento.
- Los reportes globales (dashboard, ventas, inventario) se restringen a administradores. Los movimientos se filtran por sucursal para usuarios locales.
- Las consultas de cartera por cobrar, incluidos agregados, se restringen a administradores mientras se desarrolla la segregación de todas las facturas y saldos. Las cuentas por pagar ya eran exclusivas de administradores.

## Limitaciones / siguiente fase
- No hay migración automática: las órdenes antiguas sin sucursal deben asignarse mediante una conciliación documentada.
- Falta registrar recepción por bodega, egresos por sede, anulación y transferencias transaccionales.
- Falta un proveedor tecnológico específico de facturación electrónica y sus credenciales. No se simula DIAN.
- El bloqueo conservador reduce acceso a funciones previamente disponibles para roles locales. No sustituye pruebas de integración con MongoDB.

## Verificación
Sintaxis JS verificada; pruebas Node no ejecutables en este entorno porque no están instaladas las dependencias de backend (`mongoose`).
