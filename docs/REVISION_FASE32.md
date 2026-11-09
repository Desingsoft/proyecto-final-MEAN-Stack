# Fase 32 — Cartera por sede y transferencias Angular

## Cambios
- Se sustituyó el bloqueo global de los endpoints de **cartera por cobrar** por carga del alcance de sucursales. Los documentos se limitan a los pedidos con sede autorizada, intersectando además la titularidad del vendedor. Las facturas históricas sin pedido asociado a una sede quedan excluidas para roles locales.
- El cálculo de recaudos del mes y el estado de cuenta restringen también los pagos a los documentos del alcance.
- El endpoint `GET /api/inventario/bodegas-autorizadas` entrega únicamente bodegas activas con sucursal dentro del alcance del usuario.
- Nueva pantalla Angular `/transferencias` con formulario y confirmación; la autorización final y la transacción permanecen en el backend.

## Límites pendientes
- Cartera por pagar y otros reportes globales siguen restringidos a administradores.
- Falta completar segregación de anulaciones y otras rutas antiguas; no se afirma aislamiento integral.
- Falta probar con MongoDB real, carreras de concurrencia y compilar Angular.
- La interfaz de transferencias no verifica disponibilidad previa: el backend devuelve conflicto si no hay existencias suficientes.
- El estado de cuenta oculta clientes sin documentos en sedes autorizadas; se requieren pruebas de integración para verificar todos los casos de titularidad.
- Facturación electrónica continúa pendiente de un proveedor y credenciales reales.
