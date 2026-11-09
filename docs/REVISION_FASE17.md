# Fase 17 — Auditoría de rutas y validaciones comerciales

## Cambios

- Se incorpora `middlewares/validacionesComerciales.js`, con reglas reutilizables de `express-validator` para identificadores MongoDB, cuerpos JSON, listas de ítems, porcentajes y claves de idempotencia.
- Se añaden validaciones de parámetros y solicitudes a los endpoints de escritura de clientes, proveedores, pedidos, órdenes de compra, documentos, devoluciones, pagos, configuración, inventario y usuarios.
- Se añaden permisos explícitos de lectura a pedidos, productos, eventos y endpoints de lectura del módulo avanzado que antes solo verificaban JWT.
- Se mantiene la comprobación de rol y permiso existente: las validaciones no sustituyen las autorizaciones ni las reglas de negocio de los controladores.

## Riesgos y revisión manual

- **Compatibilidad de permisos:** los usuarios no administradores deben contar con `productos.leer`, `pedidos.leer` y `eventos.leer` (según su trabajo). Revisar asignaciones y la interfaz antes de desplegar.
- **Idempotency-Key:** ahora se valida su formato en pagos y devoluciones. Revisar clientes existentes y cualquier integración que no envíe el encabezado.
- **Rutas avanzadas:** las cotizaciones, los conteos y las alertas necesitan una revisión más profunda de permisos por rol, visibilidad por usuario y validaciones específicas.
- **Validación de campos:** la nueva capa cubre tipos estructurales básicos. No constituye un esquema exhaustivo por endpoint. Las reglas de precio, saldo, stock, concurrencia y límites de devolución permanecen en controladores y transacciones.
- **Pruebas pendientes:** pruebas de permisos 401/403, entradas inválidas 422, operaciones válidas, JWT, compatibilidad de Angular y pruebas de regresión. No se ejecutaron.

## Recomendaciones antes de producción

1. Completar matrices de acceso por rol y endpoint, incluyendo el módulo avanzado.
2. Definir esquemas estrictos por recurso y campos permitidos; limitar las actualizaciones masivas.
3. Revisar autorización a nivel de documento (por propietario, bodega o cliente) cuando corresponda.
4. Añadir rate limiting a login y recuperación, y revisar el transporte del JWT para eventos SSE.
5. Ejecutar la batería final de pruebas, compilación y verificaciones con MongoDB.
