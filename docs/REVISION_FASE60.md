# Fase 60 — Exportación de compras y controles numéricos

- Se incorporó la descarga CSV de **la página visible** de compras pendientes de la sucursal autorizada, con identificador de página en el nombre del archivo. No es una exportación del universo de órdenes.
- El botón solo aparece cuando existe una consulta válida; antes de exportar se comprueba sucursal y plazo, y se neutralizan celdas potencialmente interpretadas como fórmulas por aplicaciones de hojas de cálculo.
- El pronóstico rechaza restas de cantidades y totales de reposición fuera del rango seguro de JavaScript.
- Pruebas estáticas y unitarias nuevas en `backend/tests/fase60-exportacion-compras.test.js`.

## Limitaciones

Compilación Angular y pruebas transaccionales MongoDB aún pendientes de ejecución en un entorno con dependencias y base de datos. El CSV exporta solo la página consultada y no constituye un informe contable.
