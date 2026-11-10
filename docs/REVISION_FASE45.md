# Fase 45 — Automatización de integración y seguridad de pruebas

## Incorporado
- Flujo de GitHub Actions con dos trabajos: backend y frontend. Instala dependencias desde lockfiles, ejecuta pruebas y compilación Angular.
- Trabajo backend con MongoDB 7 efímero y un intento de inicializar un replica set para ejecutar la prueba transaccional existente.
- Función `validarBasePruebas` para evitar que la prueba destructiva se active por coincidencias en usuario, host o parámetros de conexión.
- 14 pruebas nuevas de aceptación y rechazo de URI de base de pruebas.

## Advertencias
- El flujo CI no se ha ejecutado en GitHub Actions en esta entrega. El arranque del replica set puede necesitar ajuste según la red del runner y la versión de MongoDB.
- No se han instalado dependencias Angular ni MongoDB localmente en este entorno. No afirmar que la compilación o la integración se completaron.
- Las pruebas MongoDB crean y borran registros: usar únicamente una base de datos efímera dedicada.
- La facturación electrónica sigue sin proveedor tecnológico configurado.

## Comandos
`cd backend && npm test`
`cd backend && MONGO_TEST_URI='mongodb://localhost:27017/inventario_ci_test?directConnection=true' node --test tests/fase39-integracion-mongo.test.js`
`cd frontend && npm ci && npm run build:prod`
