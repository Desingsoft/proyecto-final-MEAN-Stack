# Fase 13 — concurrencia financiera y devoluciones

## Cambios implementados
- Cobros y reembolsos escriben la factura al comienzo de la transacción; egresos escriben la orden. Dos operaciones con distintas claves que afectan el mismo documento generan conflicto de escritura transaccional. MongoDB puede reintentar la transacción y recalcular el saldo. Se requiere MongoDB con replica set y transacciones habilitadas.
- Registro de devoluciones: `Idempotency-Key` obligatoria e índice único parcial en MongoDB. Angular genera una clave y la conserva tras fallos de red.
- Antes de insertar una devolución, la transacción escribe el pedido y vuelve a verificar unidades devueltas y crédito disponible; dos devoluciones simultáneas sobre el mismo pedido compiten por la misma escritura.
- Se conserva el comportamiento de errores HTTP 409 para duplicados y conflictos.

## Riesgos que aún impiden afirmar integridad total
1. La devolución sigue leyendo inicialmente el pedido y calculando precios fuera de la transacción; se revalidan cantidades y crédito dentro, pero es necesaria una refactorización completa del cálculo histórico dentro de la sesión.
2. La entrada de devolución aumenta `Producto.stock`, pero **no** actualiza `Existencia` por bodega ni asigna `bodega` al movimiento. No se debe considerar cerrado el inventario multibodega.
3. El formulario conserva una clave después de un error, pero no congela el cuerpo de la solicitud; si el usuario modifica cantidades antes de reintentar, debe consultarse el historial y comenzar una nueva operación lógica.
4. Los reembolsos generados desde una devolución se identifican por la clave única de la devolución (la transacción es todo o nada); no poseen clave propia en el modelo Pago.
5. Se deben auditar anulaciones y cambios de estado en transacciones concurrentes.
6. Verificar que los índices únicos se hayan creado en MongoDB; la definición en Mongoose no reemplaza una migración controlada.

## Pruebas finales pendientes (no ejecutadas)
- Enviar dos cobros concurrentes con claves diferentes cuyo total supere el saldo; solo uno debe registrarse.
- Repetir el mismo cobro y la misma devolución con idéntica clave; no debe haber duplicados.
- Enviar devoluciones concurrentes por la totalidad de unidades del mismo pedido.
- Verificar rollback conjunto de devolución, nota crédito, stock y reembolso.
- Conciliar `Producto.stock`, `Existencia` y `MovimientoInventario` por bodega.
- Compilar Angular y probar formularios en navegadores móviles y escritorio.
