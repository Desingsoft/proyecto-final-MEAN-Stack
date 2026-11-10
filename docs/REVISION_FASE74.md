# Fase 74 — Preflight de configuración y arranque Docker

## Problema corregido

`docker-compose.yml` iniciaba el backend con `NODE_ENV=production`, pero no transmitía `CORS_ORIGINS`. El servidor exige esa variable en producción, por lo que el despliegue Docker podía fallar durante el arranque. Se añadió `CORS_ORIGINS` al servicio backend, con valor local predeterminado `http://localhost:8080`. Si se cambia `WEB_PORT`, también debe cambiarse `CORS_ORIGINS`; para un dominio real, usar el origen HTTPS exacto.

## Controles añadidos

- Validación centralizada antes de conectar a MongoDB o escuchar HTTP.
- JWT de al menos 32 caracteres y no de ejemplo en producción.
- MongoDB y JWT obligatorios; CORS obligatorio en producción y validación de URL de origen sin rutas, credenciales ni comodines.
- Impide `PERMITIR_SIN_TRANSACCION=true` en producción.
- Advertencia por orígenes HTTP públicos sin TLS.
- Mensajes diagnósticos que no imprimen los valores de los secretos.
- `npm run verificar:entorno`: preflight sin conexión a base de datos; código de salida 2 si no es válido.
- Doce pruebas unitarias nuevas.

## Pruebas y límites

`npm test`: 323 aprobadas, 0 fallidas, 3 omitidas (326 totales). Este cambio no acredita que Docker Compose o Angular compilen, ni sustituye las pruebas de integración con MongoDB replica set. La validación de CORS no reemplaza la autenticación ni las políticas de red.
