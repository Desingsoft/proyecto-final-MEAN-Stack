# Fase 62 — Auditoría de compras escalable y control de desbordamientos

- La auditoría de órdenes mantiene un cursor de MongoDB y limita a 1.000 los detalles devueltos por defecto para evitar informes desproporcionados.
- `AUDITORIA_MAX_HALLAZGOS` permite ajustar el máximo entre 0 y 100.000. Aunque se omitan detalles, el informe conserva `totalHallazgos`, `hallazgosOmitidos` y `codigos`.
- La auditoría detecta desbordamientos al acumular cantidades de líneas y recepciones; ya no conserva acumulaciones numéricas inseguras.
- El comando es de solo lectura y sale con código 2 si detecta hallazgos, 1 ante errores y 0 si no detecta problemas.
- Pendiente: pruebas de integración con MongoDB y compilación de Angular.
