# Revisión secuencial de riesgos — noviembre de 2026

## Alcance y límites
Revisión estática del código. Por solicitud del propietario **no se realizaron pruebas funcionales, pruebas de integración, compilación de Angular ni conexiones a MongoDB**. La verificación de sintaxis de los archivos modificados no sustituye las pruebas pendientes.

## 1. Cancelación de pedidos — corregido en el controlador
- **Antes:** estado, anulación documental, reposición de stock y movimientos se ejecutaban de forma independiente.
- **Ahora:** se agrupan en una transacción MongoDB (`conTransaccion`) y una sesión compartida. Un error revierte el conjunto.
- La cancelación repetida devuelve el pedido ya cancelado sin reponer existencias otra vez. Se rechaza reactivar pedidos cancelados.
- Se bloquea cancelar pedidos con devoluciones vigentes o facturas emitidas. La anulación de documentos distintos de factura ocurre dentro de la transacción.
- **Límite:** se necesita MongoDB replica set y probar concurrencia real. Revisar la política de cancelación de pedidos enviados y el tratamiento de pagos/cartera antes de producción.

## 2. Productos repetidos y sobreventa — ya existía validación; se conservó
- El controlador de creación rechaza productos repetidos, identificadores inválidos y cantidades no enteras o no positivas.
- Descuenta stock mediante condición `stock >= cantidad` dentro de la transacción.
- **Pendiente:** revisar otros puntos de escritura de inventario (devoluciones, órdenes de compra, ajustes físicos, bodegas) para imponer una única política de existencias.

## 3. Conciliación global vs bodegas — diagnóstico reforzado
- `backend/scripts/conciliarBodegas.js` genera un JSON **sin alterar datos**.
- Incluye productos sin existencia asignada, diferencias, cantidades negativas y existencias huérfanas.
- Sale con código 2 cuando encuentra diferencias, útil para un proceso de revisión controlada.
- **Pendiente crítico:** definir la fuente de verdad y migración aprobada. El stock global y el stock por bodega todavía pueden divergir porque no todas las operaciones los actualizan juntos.

## 4. Ordenamiento y paginación — protección previa conservada
- Límite de página entre 1 y 100, página positiva y lista blanca de ordenamientos.
- **Pendiente:** evaluar índices y planes de ejecución con datos representativos. La paginación con `skip` puede degradarse en páginas profundas.

## 5. Mensajes internos — reducción parcial de exposición
- Se eliminaron campos `error.message` de respuestas HTTP 500 de controladores que seguían el patrón simple de `res.status(500).json(...)`.
- El controlador de pedidos evita exponer mensajes de errores inesperados y los registra en el servidor.
- **Pendiente:** auditoría manual de otros patrones, middleware global, trazas, datos sensibles y normalización de errores de validación.

## 6. Monitor de alertas — arranque secuenciado
- El servidor espera `conectarDB()` antes de iniciar el monitor y escuchar en HTTP.
- **Pendiente:** coordinación entre múltiples instancias, estrategia de reintentos y apagado controlado.

## 7. Documentación y comentarios — ampliación específica
- Se documentaron las invariantes de cancelación, el propósito de la transacción, los errores esperados, el diagnóstico de conciliación y el ciclo de arranque.
- Los comentarios genéricos previos siguen existiendo: documentar individualmente cada variable sin añadir ruido requiere una segunda pasada por cada módulo y contrato de API.

## Riesgos adicionales encontrados
1. Los movimientos de inventario no incluyen una referencia obligatoria al pedido que permita rastrear de forma inequívoca la cancelación; se recomienda añadir `pedidoRef` y una clave de idempotencia mediante migración.
2. Los cambios de estado distintos de cancelación no implementan todavía una máquina de estados comercial estricta.
3. La reposición global de un pedido no determina a qué bodega debe regresar el producto; se necesita una política de reservas/ubicaciones.
4. Los controladores de pagos, cartera y devoluciones deben revisarse para garantizar atomicidad cruzada.
5. Los documentos de cotización y pedido deben preservar versiones de precios, descuentos e impuestos de manera verificable.

## Próxima etapa, antes de las pruebas
Revisar y corregir secuencialmente devoluciones, movimientos de inventario, pagos y cartera; después completar los comentarios JSDoc de funciones de dominio y la documentación OpenAPI de los endpoints. Al final ejecutar pruebas de transacciones, concurrencia, integración, compilación Angular y restauración.
