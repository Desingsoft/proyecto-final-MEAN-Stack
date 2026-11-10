# Fase 47 — Integración transaccional y preparación de entorno

## Implementado
- Dos pruebas adicionales **reales** con MongoDB: reversión completa ante fallo y unicidad de clave de transferencia.
- El ejecutor obligatorio de integración ahora corre tanto la prueba de concurrencia F39 como las nuevas pruebas F47. Si cualquiera se omite, la puerta de integración falla.
- `npm run verificar:dependencias` diagnostica dependencias esenciales del backend y Angular sin instalarlas ni modificar archivos.
- Pruebas de regresión de configuración y documentación de los pasos de ejecución.

## Ejecución
1. `cd backend && npm ci && npm test`
2. `npm run verificar:dependencias` (debe señalar los módulos instalados)
3. Configurar MongoDB 7 como replica set en una base exclusiva de pruebas.
4. `MONGO_TEST_URI=mongodb://127.0.0.1:27017/inventario_ci_test?directConnection=true npm run test:integracion-mongo`
5. `cd ../frontend && npm ci && npm run build:prod`

## Limitaciones
No se ejecutaron pruebas MongoDB reales ni compilación Angular en el entorno local por dependencias ausentes. Las pruebas MongoDB requieren replica set y base de pruebas; no usar base productiva. No se ha integrado proveedor de facturación electrónica real. No habilitar producción hasta pasar la puerta de calidad y pruebas funcionales completas.
