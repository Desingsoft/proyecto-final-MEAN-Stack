# Fase 75 — Cierre ordenado de servicios

Se incorpora un mecanismo de cierre para SIGTERM/SIGINT en el backend: detiene el monitor periódico, deja de aceptar nuevas conexiones HTTP, espera las solicitudes en curso (máximo 10 segundos) y desconecta MongoDB. Las señales repetidas comparten la misma promesa de cierre.

## Verificación

`cd backend && npm test` y `node --check server.js`. Se añaden cinco pruebas unitarias de orden, idempotencia, errores y tiempo máximo. No reemplazan pruebas de integración reales con MongoDB ni la compilación de Angular.

## Limitaciones

El límite de 10 segundos aplica a la espera de cierre HTTP; las operaciones MongoDB en curso y los trabajos externos requieren pruebas de integración para garantizar su terminación. La terminación forzada del contenedor sigue siendo responsabilidad del orquestador.
