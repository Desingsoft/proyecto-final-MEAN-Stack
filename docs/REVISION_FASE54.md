# Fase 54 — Reposición comercial y pedidos atrasados

- La demanda por sede se estima únicamente con movimientos de salida asociados a pedidos, excluyendo salidas manuales y transferencias.
- Las órdenes enviadas o parciales con fecha esperada vencida se informan como `enCaminoVencido`, pero no se descuentan de la recomendación de compra.
- Las órdenes sin fecha esperada se siguen contando como suministro en camino: es una limitación explícita.
- Se valida que las cantidades de compra sean enteras y que lo recibido no supere lo solicitado.
- Se añadieron pruebas unitarias para vencimientos, clasificación, cantidades y cálculos.

## Límites
No se consideran devoluciones, estacionalidad, ventas anuladas ni calidad de las fechas del proveedor. La demanda histórica depende de la integridad de `MovimientoInventario.pedido`. No se ejecutaron pruebas con MongoDB real ni compilación Angular. No usar el pronóstico como orden automática de compra.
