# Fase 59 — Seguimiento de órdenes de compra pendientes por sucursal

## Cambios

- Endpoint `GET /api/empresa/sucursales/:id/compras-pendientes?pagina=1&limite=20&plazo=7`.
- Requiere autenticación, permiso `inventario.leer` y autorización efectiva sobre la sucursal.
- Solo consulta órdenes `enviada` y `parcial` de la sede autorizada; nunca incluye compras de otras sedes.
- Clasifica cada línea pendiente en `pendientes`, `vencidos`, `inciertos` y `posteriores` usando la fecha esperada y el plazo del proveedor del producto (o plazo general supletorio).
- Excluye cantidades ya recibidas; devuelve SKU y nombre, cuando están disponibles.
- Paginación limitada a 100 órdenes por página. Los totales del reporte son **solo de la página consultada**.
- Operación de solo lectura; no genera ni cancela órdenes.

## Validación

Ejecutar desde `backend`: `npm test` y `npm run verificar:referencias-angular`.
La compilación Angular y las pruebas con MongoDB requieren dependencias y servidor configurados; las pruebas estructurales no sustituyen las pruebas HTTP de integración.

## Pendientes

Agregar una vista Angular para este nuevo endpoint, probar el endpoint con MongoDB real y verificar los flujos de órdenes/recepciones de punta a punta.

## Interfaz

La sección de Administración empresarial muestra un panel de compras pendientes, con navegación anterior/siguiente y control de respuestas HTTP obsoletas al cambiar de sucursal. No expone datos de otras sedes porque el servidor verifica el acceso en cada consulta.
