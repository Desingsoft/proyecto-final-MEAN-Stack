# Fase 66 — Trazabilidad temporal de recepciones

Se amplía la auditoría de compras para detectar identificadores de recepción duplicados, fechas ausentes o inválidas y recepciones registradas antes de la creación de la orden (con tolerancia de un minuto por posibles diferencias de reloj). Se incorporan `_id`, `fecha` y `createdAt` a la proyección de MongoDB del diagnóstico, para evitar falsos positivos por campos no recuperados.

La herramienta es de solo lectura y no modifica documentos. Ejecutar desde `backend` con `npm run auditar:recepciones-compras`. Las verificaciones no reemplazan la revisión contable ni las pruebas de integración con MongoDB real. Los documentos antiguos sin `createdAt` no se califican automáticamente como recepciones anteriores a la orden.
