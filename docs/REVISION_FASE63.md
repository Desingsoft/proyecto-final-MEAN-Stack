# Fase 63 — Integridad de auditoría y filtros operativos

## Avances
- La auditoría detecta proveedores faltantes, órdenes sin productos, estados desconocidos, fechas inválidas, recepciones sin líneas, órdenes canceladas con recepciones y recibidas sin productos.
- El comando admite `AUDITORIA_SUCURSAL` (ObjectId) y `AUDITORIA_DESDE` (YYYY-MM-DD, UTC) para acotar el diagnóstico. Los filtros se reflejan en el JSON.
- La consulta mantiene cursor y límite de detalles; no modifica datos.
- Se agregan nueve pruebas automatizadas.

## Ejemplo
`AUDITORIA_DESDE=2026-01-01 AUDITORIA_MAX_HALLAZGOS=500 npm run auditar:recepciones-compras`

## Pendientes
Compilación Angular, pruebas con MongoDB real y validación integral de flujos de negocio.
