# Fase 40 — Estabilización de movimientos manuales e integración Angular

## Implementado

1. Movimientos manuales de inventario ejecutados mediante `conTransaccion`, con comprobación condicional de existencias por bodega y stock global. La utilidad exige transacciones MongoDB fuera del modo de pruebas.
2. `Idempotency-Key` opcional (16–128 caracteres alfanuméricos, guion o subrayado) para compatibilidad con clientes anteriores. Si está presente, se guarda una huella SHA-256 de producto, bodega, tipo, cantidad y motivo normalizados. El índice único parcial evita dos movimientos con la misma clave.
3. Reintentos con la misma clave y datos devuelven HTTP 200 y `repetida: true`; datos distintos, HTTP 409. El backend vuelve a verificar acceso a la bodega antes de revelar el movimiento previo. Ante colisión concurrente, HTTP 409 para que el cliente consulte antes de reintentar.
4. Formulario Angular de movimientos: selector obligatorio de bodega autorizada, consulta de bodegas y envío de clave de idempotencia.
5. Ocho pruebas de comportamiento del controlador manual, además de actualización de la prueba de estructura de Fase 37 para reflejar el uso de `conTransaccion`.

## Resultado de las verificaciones

- `node --test tests/*.test.js`: 53 pruebas; 52 aprobadas, 0 fallidas, 1 omitida (integración MongoDB no configurada).
- Sintaxis de controlador y modelo verificada con `node --check`.
- No se compiló Angular: en el entorno las dependencias Angular CLI no están disponibles de manera completa (`ng: not found`).
- No se probaron transacciones reales, índices MongoDB ni concurrencia en replica set.

## Riesgos y pendientes

- Crear/verificar el índice parcial en la base real antes de habilitar reintentos idempotentes; verificar si ya existen claves duplicadas.
- No usar `PERMITIR_SIN_TRANSACCION=true` con datos reales.
- La clave generada por Angular permanece estable dentro de un mismo objeto de solicitud HTTP; si el usuario vuelve a enviar el formulario se genera una clave nueva. La interfaz debe incorporar una recuperación explícita de solicitudes cuyo resultado sea desconocido antes de desplegar en producción.
- La transacción puede abortar por conflictos de escritura; las pruebas de concurrencia real deben comprobar los códigos de respuesta y la consistencia de saldos.
- El modelo de existencias no tiene historial completo reconstruible para todos los movimientos anteriores a la migración multisucursal. Ejecutar auditorías antes de correcciones manuales.
- Quedan pendientes compilación Angular, pruebas con MongoDB replica set, validación de autorizaciones de extremo a extremo, conciliación de históricos y proveedor de facturación electrónica real.

## Comandos

```bash
cd backend
npm install
npm test
# Requiere configuración MongoDB de pruebas compatible con transacciones
```

```bash
cd frontend
npm install
npm run build
```
