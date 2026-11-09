# Fase 61 — Auditoría de recepciones de compras

Se agrega una auditoría de solo lectura de las órdenes de compra frente a su historial de recepciones. Detecta cantidades inconsistentes, líneas duplicadas, recepciones de productos no solicitados, sobrerecepciones, estados incoherentes, sucursales y bodegas ausentes.

Ejecutar en `backend`: `npm run auditar:recepciones-compras` con `MONGODB_URI` configurada. Devuelve JSON; código de salida 0 sin hallazgos, 2 con hallazgos y 1 por error. No corrige ni modifica documentos.

Limitaciones: no coteja movimientos físicos ni pagos; se requiere prueba con MongoDB real. Las órdenes históricas sin registro de recepciones pueden generar hallazgos que requieren revisión humana.
