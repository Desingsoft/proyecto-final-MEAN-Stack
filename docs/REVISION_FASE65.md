# Fase 65 — Conciliación monetaria de órdenes de compra

Se incorporaron validaciones de `costoUnitario` y `total` en la auditoría de recepciones. La suma se calcula como `Math.round(sum(cantidad * costoUnitario))`, en línea con el controlador de órdenes. Detecta costos ausentes, negativos, no finitos, operaciones fuera del rango seguro y diferencias del total registrado. Se evita afirmar un descuadre cuando la cantidad o el costo de una línea es inválido.

El cursor de auditoría ahora proyecta `items.costoUnitario` y `total`. El diagnóstico sigue siendo de solo lectura y no reemplaza una conciliación contable o tributaria. Los importes utilizan `Number` porque el modelo existente así los almacena; una migración futura a enteros de centavos o Decimal128 es recomendable.

Ejecutar `cd backend && npm test` y, con `MONGODB_URI`, `npm run auditar:recepciones-compras`. Compilación Angular e integración real con MongoDB pendientes.
