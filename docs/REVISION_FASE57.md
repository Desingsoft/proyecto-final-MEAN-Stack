# Fase 57 — Calidad del pronóstico y exportación controlada

- El pronóstico por sucursal incorpora `calidadEstimacion`: `sin_demanda_historica`, `requiere_revision` y `basada_en_ventas`.
- La API devuelve un resumen de productos y unidades sugeridas, y advertencias de calidad. Los conteos son solo de productos con reposición positiva.
- Angular muestra resumen y estado de calidad y permite exportar CSV de **las filas ya recibidas de la API autorizada por sucursal**. No ejecuta una consulta global adicional.
- Las celdas CSV se entrecomillan y se neutralizan posibles fórmulas de hoja de cálculo.
- No se automatiza la compra ni se considera el pronóstico una orden de compra.

## Limitaciones

No se ha compilado Angular con sus dependencias en este entorno. Los tests unitarios no sustituyen las pruebas de integración transaccional con MongoDB real. Se requiere revisión manual del flujo de descarga en navegador. Las advertencias no garantizan la precisión estadística del pronóstico.
