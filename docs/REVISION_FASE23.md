# Fase 23 — Desarrollo secuencial de capacidades empresariales

## Entregas en orden

1. **Caja**: `GET/POST /api/empresa/caja/cierres`. Instantánea por fecha UTC y administrador. No concilia extractos bancarios ni impide pagos retroactivos.
2. **Compras**: solicitud, listado y decisión de aprobaciones; el cambio de estado a `enviada` requiere aprobación. Se prohíbe autoaprobación. **Advertencia:** para producción hay que controlar modificaciones posteriores de ítems, proveedor y otros datos mediante transacciones y versión de la orden.
3. **Auditoría**: consulta paginada de bitácora actual, solo administrador. La bitácora existente no contiene antes/después ni motivo de cada cambio; eso requiere ampliar eventos por dominio.
4. **Sucursales**: catálogo inicial. **No hay todavía aislamiento de datos por sede**; no debe utilizarse para segregar información sensible.
5. **Facturación electrónica**: cola de preparación y validaciones mínimas. **No hay emisión electrónica legal, CUFE, firma, UBL, ni transmisión DIAN.** Requiere proveedor habilitado, pruebas y regulación vigente.
6. **Indicadores**: ventas emitidas, cartera estimada y productos activos. No se afirma rentabilidad o rotación sin cálculos de costo histórico.
7. **Reposición**: alerta de stock menor o igual al mínimo. Predicción de demanda y tiempos de entrega pendientes.
8. **Datos masivos**: exportación CSV de productos con mitigación de inyección de fórmulas; importación JSON solo en modo previsualización, sin escritura. Excel XLSX real y validación por lotes pendientes.

## Seguridad y limitaciones

Todos los endpoints exigen JWT; los datos sensibles son solo para administradores. Las rutas de inventario y productos también requieren permisos de módulo. Los modelos nuevos contienen índices únicos donde aplica. La base de datos debe disponer de esos índices antes de habilitar operaciones concurrentes.

El cierre de caja no representa una conciliación bancaria: usa la fecha UTC del pago, no la fecha de liquidación bancaria. El flujo de aprobación no utiliza aún transacción atómica entre aprobación y envío. Los modelos de sucursales aún no están vinculados a cada venta, usuario, bodega y movimiento.

## Verificación

Se ejecutan únicamente comprobaciones estáticas de sintaxis JavaScript. No se declara completada la compilación Angular ni las pruebas de integración, permisos, base de datos o DIAN. Para producción se requiere probar especialmente cierre concurrente, autorización de compras, carga de datos, roles y conciliación.
