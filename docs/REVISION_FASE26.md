# Fase 26 — Segregación, importación JSON y adaptador fiscal

## Sucursales
- GET `/api/empresa/sucursales` devuelve solo sedes asignadas a no administradores.
- GET `/api/empresa/sucursales/:id/pedidos` y `/existencias` verifican pertenencia desde MongoDB y rechazan sin asignación.
- `npm run auditar:asignacion-sucursales` genera un diagnóstico de solo lectura; **no asigna sedes por inferencia**.
- **Pendiente**: aplicar restricciones de sucursal a todas las rutas heredadas de pedidos, documentos, pagos, inventario, cartera y reportes; asociar los documentos y conciliaciones a sede, y migrar registros históricos bajo revisión humana. No afirmar segregación completa.

## Importación JSON
- Previsualización verifica campos permitidos, tipos, SKU duplicados dentro del lote y SKU existentes.
- Confirmación revalida todo e inserta en una **transacción MongoDB**: todo o nada; no modifica stock inicial. Requiere MongoDB con transacciones (replica set o cluster).
- **Pendiente**: interfaz XLSX, trazabilidad de importaciones, importación de actualización de catálogo y controles de autorización más granulares.

## Facturación electrónica
- Puerto `AdaptadorFacturacion` con error explícito cuando falta proveedor; validación de respuestas `aceptada/rechazada/pendiente` y CUFE obligatorio para aceptada.
- **No existe emisión electrónica real**: requiere proveedor autorizado, certificados, resolución de numeración, UBL/XML, CUFE, ambientes y pruebas de habilitación DIAN. Nunca marcar como aceptada sin respuesta verificable.

## Verificación
- Solo sintaxis JavaScript e integridad ZIP; pruebas funcionales e integración pendientes.
