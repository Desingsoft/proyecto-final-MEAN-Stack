# Fase 50 — Conciliación cruzada de transferencias

## Alcance

Se incorpora un diagnóstico de solo lectura que contrasta cada transferencia con sus movimientos de salida y entrada y comprueba la existencia de registros de stock por producto y bodega. Detecta movimientos incompletos, duplicados, cantidades/productos/bodegas distintos, movimientos huérfanos, transferencias inválidas, existencias duplicadas y saldos negativos/no enteros.

## Uso

Desde `backend`, configurar `MONGODB_URI` con permisos de lectura y ejecutar:

```bash
npm run auditar:transferencias-completo
```

El informe se emite en JSON a la salida estándar. Código de salida `0`: sin hallazgos; `2`: con hallazgos; `1`: error de conexión o ejecución. No altera registros. En bases muy grandes la versión actual carga datos seleccionados en memoria; ejecutar en una ventana de mantenimiento o sobre una réplica y evolucionar a paginación por cursor antes de usar con millones de registros.

## Alcances y límites

- El diagnóstico **no** calcula el saldo esperado a partir de todos los movimientos: podría faltar el saldo inicial o parte de los movimientos previos a la migración.
- No sustituye `npm run auditar:inventario-sucursales`, que compara inventario general con la suma por bodega.
- No verifica transacciones concurrentes, permisos HTTP ni compilación Angular.
- Las pruebas unitarias usan datos sintéticos y no requieren MongoDB.
- El proceso no repara automáticamente discrepancias; se deben investigar y documentar antes de modificar existencias.

## Pendientes de estabilización

Compilar Angular con dependencias instaladas, ejecutar las pruebas de MongoDB en replica set, validar permisos por sucursal con usuarios reales de prueba, revisar flujos de pagos y anulaciones y realizar pruebas de aceptación de punta a punta.
