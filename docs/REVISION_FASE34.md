# Fase 34 — Integridad de transferencias y controles de cierre

## Implementado
- Registro `TransferenciaInventario` con clave de idempotencia única y huella SHA-256 del contenido.
- Transferencia en una transacción de MongoDB: registro, salida condicionada por saldo, entrada y movimientos vinculados.
- Reintentos con la misma clave y contenido devuelven la transferencia previa; con contenido distinto devuelven HTTP 409.
- La consulta de reintento verifica nuevamente el acceso a ambas bodegas.
- El cliente Angular genera `Idempotency-Key` por operación; una repetición de la misma petición HTTP conserva la clave.
- Pruebas estáticas de regresión de estas invariantes.

## Seguridad existente conservada
- Las anulaciones de pagos, documentos y devoluciones y los egresos a proveedores permanecen restringidos a administradores.
- Los reportes globales permanecen restringidos hasta contar con segregación completa.

## Limitaciones y validación requerida
- Sin pruebas de integración MongoDB replica set ni simulación de concurrencia real. El índice único debe crearse en la base de datos.
- Si dos peticiones simultáneas usan la misma clave, la segunda puede recibir HTTP 409 temporalmente; consultar antes de reintentar.
- No se implementó migración automática de datos históricos sin sede, para evitar asignaciones incorrectas.
- La pantalla Angular todavía requiere compilación y pruebas funcionales.
- Facturación electrónica real continúa pendiente de proveedor, certificados y habilitación.
- Para producción: pruebas con dos usuarios de sedes distintas, transacciones simultáneas y fallo inducido entre movimientos.
