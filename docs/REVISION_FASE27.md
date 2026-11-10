# Fase 27 — alcance por sucursal y contrato de facturación electrónica

## Implementado
- Middleware `alcanceSucursal`: consulta asignaciones persistidas del usuario, rechaza sedes ajenas y aplica exclusión por defecto de registros históricos sin sede.
- Listados de pedidos, resumen de pedidos, documentos y pagos filtran según las sedes asignadas, además de las restricciones de titularidad existentes.
- Detalles de pedido y documento verifican la sede mediante su pedido asociado.
- Validación más estricta de las respuestas del proveedor electrónico: estados permitidos, CUFE hexadecimal de 96 caracteres e identificador acotado.
- Contrato de precondiciones para un futuro adaptador real. **No existe emisión DIAN, firma, XML UBL ni validación remota real.**

## Pendientes y riesgos importantes
- **No es segregación total**: deben extenderse las verificaciones a escrituras, cobros por documento, cartera, devoluciones, inventario, reportes, exportaciones y rutas empresariales.
- En operaciones de creación debe derivarse la sucursal desde la bodega/pedido autorizado y comprobarse dentro de la transacción; nunca aceptar un ID de sede arbitrario del frontend.
- Revisar y asignar sucursales a datos históricos antes de habilitar usuarios no administradores.
- Los filtros con `distinct` pueden requerir paginación/optimización en bases grandes.
- Para un proveedor real se requieren contrato y documentación de API, firma y autenticación de callbacks, idempotencia de envío, reintentos, cola persistente, certificado, numeración, XML UBL y validación DIAN.
- **No se ejecutaron pruebas de integración, compilación Angular ni conexiones reales.**
