# Fase 70 — Conciliación de egresos con memoria acotada

## Problema corregido
La auditoría financiera conservaba en memoria un `Set` con **todos** los identificadores de órdenes conciliadas. En bases históricas grandes, el consumo crecía proporcionalmente al número total de órdenes.

## Solución
La segunda pasada consulta en cada lote de hasta 100 pagos qué órdenes corresponden al filtro original de conciliación (sucursal/período). Solo esos identificadores se usan para evitar duplicar alertas en el lote actual. La lista global ya no se conserva. Se mantiene la revisión de órdenes inexistentes, egresos sin orden y diferencias de sucursal/proveedor.

La solución añade una consulta MongoDB adicional por lote, a cambio de reducir la memoria de pertenencia de O(total de órdenes) a O(órdenes del lote). No se han realizado pruebas de rendimiento con bases reales.

## Validación
Ejecutar `cd backend && npm test` y `npm run verificar:referencias-angular`. La compilación Angular y las pruebas con MongoDB real siguen pendientes.

## Limitaciones
El informe JSON conserva un máximo configurable de hallazgos detallados. La auditoría es solo lectura. Debe verificarse con un conjunto de datos representativo antes de uso operativo.
