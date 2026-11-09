# Fase 41 — Preparación operativa y validación de despliegue

## Entrega
- Nuevo comando de diagnóstico **solo lectura**: `cd backend && npm run verificar:preparacion`.
- Inspección de compatibilidad de transacciones (replica set), índices únicos de existencias y claves de idempotencia, configuración de JWT/CORS, registros históricos sin sucursal y discrepancias entre stock general y existencias.
- Evaluador puro reutilizable y ocho pruebas unitarias de las reglas de preparación.
- El comando devuelve código 0 si no detecta hallazgos, 2 si hay bloqueantes o revisiones, y 1 ante fallo técnico.

## Limitaciones
- No corrige datos, no crea índices ni modifica la base. Una salida favorable no certifica el sistema para producción.
- Requiere conexión real y credenciales de solo lectura para ejecutarse; no se ejecutó contra MongoDB en esta entrega.
- El recuento de registros históricos sin sucursal exige revisión humana; no todos los pagos antiguos necesariamente tienen campo `sucursal`.
- No se pudo compilar Angular: el paquete de Angular CLI no está instalado completamente en este entorno.

## Secuencia para aceptación
1. Hacer copia de seguridad de la base de pruebas.
2. Revisar variables de entorno y ejecutar `npm run verificar:preparacion`.
3. Corregir índices faltantes y migrar datos **solo después** de evaluar duplicados y asignaciones de sede.
4. Ejecutar `MONGO_TEST_URI=... npm test` contra una base exclusiva de pruebas y un replica set.
5. Instalar dependencias de frontend con `npm ci` en entorno con acceso al registro y ejecutar `npm run build`.
6. Probar accesos cruzados entre sucursales, pagos, cartera, inventarios y reportes antes de habilitar usuarios reales.
