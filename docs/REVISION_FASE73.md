# Fase 73 — Puerta de calidad y evidencia reproducible

Se mejoró `npm run verificar:calidad` para distinguir resultados de pruebas aprobadas, fallidas y omitidas, validar la coherencia del resumen TAP y publicar bloqueos y advertencias en `docs/resultado-puerta-calidad.json`.

Una compilación Angular no ejecutada bloquea la aprobación. Las pruebas de integración MongoDB omitidas se señalan expresamente; la bandera `listoParaProduccion` permanece `false` hasta realizar una validación integral fuera de esta puerta. Se agregaron siete pruebas unitarias para la nueva política.

## Ejecución

Desde `backend`: `npm run verificar:calidad`. El comando puede terminar con código 2 cuando faltan dependencias de Angular; es intencional y no significa que las pruebas del backend fallen. Se recomienda `npm ci` en `frontend` y un entorno MongoDB replica set para la integración. La auditoría no modifica datos de negocio.
