# Revisión Fase 56 — Plazos de abastecimiento por producto

## Problema corregido
La Fase 55 clasificaba todas las órdenes abiertas con el plazo general solicitado en la pantalla, pero calculaba el punto de pedido usando el plazo individual del proveedor. Eso podía descontar como oportuna una compra posterior al plazo del producto, o ignorar otra que sí llegaba a tiempo.

## Implementación
- Cada línea de orden hereda el plazo `diasEntrega` de su producto/proveedor, con fallback al parámetro general.
- `clasificarPendientes` decide por línea entre vigente, vencida, sin fecha o fuera de plazo.
- La API construye el mapa de plazos a partir de los productos consultados y lo aplica a las órdenes abiertas.
- Se omiten líneas totalmente recibidas y se validan existencias y movimientos como cantidades enteras no negativas.
- Se incorporan seis pruebas unitarias de casos límite.

## Límites
No se han realizado compilación Angular ni pruebas de integración MongoDB real en esta entrega. No equivale a una certificación de producción.
