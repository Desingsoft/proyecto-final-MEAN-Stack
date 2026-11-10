# Fase 25 — Desarrollo empresarial incremental

## Entregado
- Campo sucursal en Usuario (con lista de sucursales autorizadas), Bodega, Pedido, Pago y MovimientoInventario. **No se filtran automáticamente todas las rutas heredadas**; la segregación completa sigue pendiente. Endpoint seguro `GET /api/empresa/sucursales/:id/pedidos` (sin asignación explícita, acceso denegado).
- Auditoría no destructiva `npm run auditar:sucursales`. Los datos históricos sin sede deben asignarse manualmente previa revisión; no se adivina su sucursal.
- `GET /api/empresa/indicadores/historicos`: ventas facturadas por mes; no equivale a utilidad.
- `GET /api/empresa/reposicion/pronostico`: demanda aproximada desde salidas de inventario y plazo de entrega suministrado.
- `POST /api/empresa/importar/productos/confirmar`: importa productos nuevos sin stock; valida lote y duplicados. **Limitación**: ante fallo durante inserción puede haber importación parcial, el resultado reporta SKUs creados; falta transacción de lote y carga XLSX binaria. La previsualización existente acepta JSON; XLSX puede convertirse a JSON en el cliente en una etapa posterior.
- Contrato `AdaptadorFacturacion` con comportamiento cerrado sin credenciales; no genera XML ni CUFE ni factura electrónica válida.
- Ruta Angular `/empresa` para administrador con consulta de cierres, aprobaciones, auditoría y sucursales; diseño adaptable.

## Pendientes críticos
1. Migración controlada y propagación de `sucursal` en cada escritura comercial; controles de sede en TODAS las rutas de pedidos, pagos, inventario y reportes.
2. Cargas XLSX con previsualización de archivo, transacción y seguimiento de lote; pruebas de duplicados concurrentes.
3. Integración con proveedor autorizado DIAN, habilitación, certificados, UBL/XML, firma, CUFE, eventos y estados.
4. Cálculo de márgenes con costos históricos, rotación y vencimientos reales; parámetros de reposición por proveedor.
5. Interfaz Angular de conciliación bancaria y gráficas; pruebas de compilación y extremo a extremo.

No se realizaron pruebas funcionales ni de integración en esta fase. Los controles nuevos deben validarse antes de producción.
