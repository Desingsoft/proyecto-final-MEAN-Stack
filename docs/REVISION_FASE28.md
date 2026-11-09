# Fase 28: restricciones de escritura por sucursal y contrato de proveedor

## Implementado
- `sucursalOperaciones.js`: comprobación de pertenencia de bodega, pedido y documento a sucursales asignadas, con respuesta 404 si el recurso no es visible. Se lee la asignación vigente de MongoDB y se rechazan registros históricos sin sucursal para usuarios no administradores.
- Aplicado a creación y cambio de estado de pedidos, emisión de documentos, cobros, reembolsos y creación de devoluciones. Las restricciones de titularidad previas se conservan.
- `proveedorElectronicoHttp.js`: adaptador configurable que requiere HTTPS, rutas de operaciones explícitas y un transporte autenticado inyectado; valida las respuestas con el contrato ya existente.

## Limitaciones importantes
- No se habilita emisión DIAN: no hay proveedor escogido, credenciales, firma XML, generación CUFE ni homologación.
- La segregación aún no cubre todas las operaciones: anulaciones, movimientos manuales de inventario, reportes agregados, cartera y exportaciones requieren auditoría y filtros por sede. No afirmar aislamiento total.
- La bodega de los pedidos debe estar asociada a una sucursal; los datos anteriores sin sede requieren migración revisada. La comprobación previa a una transacción no sustituye las restricciones de escritura dentro de ella frente a cambios concurrentes de sede.
- El adaptador no implementa transporte real ni firma de callbacks: el proveedor elegido definirá endpoints, firma, mTLS, límites, reintentos, autenticación y validación DIAN.

## Verificación final pendiente
Pruebas con MongoDB de dos sucursales, usuario sin sede, vendedor de otra sede, registros históricos, concurrencia y acceso directo a la API; compilación Angular y revisión de pantallas; sandbox del proveedor tecnológico.
