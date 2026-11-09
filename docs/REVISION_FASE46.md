# Fase 46 — Integración continua y pruebas obligatorias

## Problema corregido
El flujo anterior iniciaba la imagen oficial `mongo:7` sin el argumento `--replSet`. Ejecutar `rs.initiate()` sobre un servidor sin esa opción no configura transacciones. Además, la prueba MongoDB se omite deliberadamente si falta `MONGO_TEST_URI`, y Node puede devolver código 0 aun cuando una prueba se haya omitido. Esto podía crear una falsa sensación de cobertura.

## Cambios
1. `.github/workflows/calidad.yml`: el job backend inicia un contenedor MongoDB con `--replSet rs0`, espera la disponibilidad y el estado PRIMARY y ejecuta la integración en una base efímera. El job frontend instala dependencias con `npm ci`, revisa referencias y compila en modo producción. Se conservan logs del contenedor en caso de fallo y se detiene al terminar.
2. `backend/scripts/ejecutarIntegracionMongo.js`: exige `MONGO_TEST_URI` seguro, ejecuta la prueba transaccional y falla si el resumen muestra omisiones, errores, cero pruebas o código de salida distinto de cero.
3. `backend/package.json`: agrega `npm run test:integracion-mongo`.
4. `backend/tests/fase46-ci-integracion.test.js` y `fase46-configuracion-ci.test.js`: verifican el contrato de ejecución obligatoria y la configuración del pipeline.

## Ejecución local
```bash
cd backend
npm test
# En otra terminal: MongoDB configurado como replica set y una base EXCLUSIVA de pruebas
MONGO_TEST_URI='mongodb://127.0.0.1:27017/inventario_ci_test?directConnection=true' npm run test:integracion-mongo
```
**No ejecutar la prueba de integración sobre datos de negocio:** crea y elimina documentos. La validación del nombre de la base es una salvaguarda adicional, no una garantía de que el servidor esté vacío.

## Verificaciones de esta entrega
- Pruebas automatizadas de backend: 120 aprobadas, una omitida (MongoDB no configurado en este entorno), cero fallidas.
- Referencias locales Angular: 97 archivos TypeScript y 425 referencias, sin archivos faltantes.
- Sintaxis JavaScript del backend: comprobada.
- El ejecutor de integración falla deliberadamente sin `MONGO_TEST_URI`.
- La compilación Angular real y el pipeline de GitHub Actions siguen **sin ejecutar** en este entorno; la instalación offline de dependencias no pudo completarse.

## Pendientes críticos
- Ejecutar GitHub Actions en un repositorio real y corregir los problemas que aparezcan.
- Probar escenarios concurrentes adicionales y autorización con MongoDB real.
- Compilar Angular con sus dependencias completas.
- Revisar las políticas multisucursal y los procesos de facturación electrónica antes de producción.
