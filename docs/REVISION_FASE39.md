# Fase 39 — Verificación de integridad y prueba MongoDB optativa

## Cambios
- Se comprueba que el incremento de la bodega destino afecte una existencia o cree una nueva antes de confirmar la transferencia. Si no lo hace, se aborta la transacción.
- Se normalizan identificadores al calcular la huella de idempotencia.
- Se añade prueba unitaria de reversión cuando el incremento del destino no modifica ningún registro.
- Se añade prueba de integración opcional que ejecuta dos traslados concurrentes contra un MongoDB real con replica set, comprueba saldos y elimina los registros de prueba.

## Ejecución
`cd backend && npm test` ejecuta pruebas sin conexión externa; la integración se omite sin `MONGO_TEST_URI`.
Para ejecutar la integración: `MONGO_TEST_URI=mongodb://localhost:27017/inventario_fase39_test npm test`.
**Advertencia:** utilizar únicamente una base dedicada de pruebas. La prueba crea y elimina registros. Se requiere replica set para transacciones.

## Limitaciones
- No se ha certificado la compilación Angular ni el funcionamiento completo del sistema.
- La integración requiere dependencias Node instaladas y MongoDB accesible; si faltan, se omite.
- La prueba de concurrencia verifica el patrón transaccional y los modelos, no todos los endpoints HTTP ni todos los roles.
- Falta completar la segregación por sede en rutas heredadas y la facturación electrónica con proveedor real.
