# Fase 24 — Controles empresariales adicionales (entrega parcial)

## Implementado

1. **Cierre de caja:** `POST /api/empresa/caja/conciliar` compara transferencias/tarjetas por referencia e importe contra movimientos bancarios suministrados en JSON. No importa archivos OFX ni modifica pagos. `GET /api/empresa/caja/cierres/:id/pagos-posteriores` identifica pagos del día registrados después del cierre. **No bloquea pagos retroactivos**.
2. **Aprobaciones:** decisión con actualización atómica condicionada (`pendiente` -> estado final); la segunda decisión devuelve 409. **No es una transacción completa de envío de la orden**.
3. **Auditoría:** `POST /api/empresa/auditoria/eventos` registra motivo, antes y después de campos expresamente permitidos, solo administrador. Requiere integración automática en controladores para garantizar cobertura; el endpoint manual no prueba que el cambio descrito ocurrió.

## Pendiente, sin afirmar implementación

- **Sucursales:** migración de referencias en usuario, bodega, pedido, pago y movimiento, y aplicación de filtros obligatorios por sede en todos los controladores. No activar segregación hasta revisar registros históricos.
- **Facturación electrónica DIAN:** requiere contrato con proveedor tecnológico autorizado, credenciales, certificado, habilitación, resolución de numeración y validación normativa. No hay XML firmado, CUFE real ni transmisión a DIAN.
- **Indicadores:** costos históricos por línea, fecha de vencimiento fiable y métricas verificadas; todavía no hay panel completo.
- **Reposición:** plazos por proveedor, consumo diario real y gestión de estacionalidad.
- **Importación Excel:** lectura XLSX, validación transaccional y rollback por lote; solo existe previsualización JSON.
- **Angular:** falta construir pantallas y conectar estas operaciones; no se ha compilado.

## Verificación

Comprobación estática de sintaxis de los archivos JavaScript modificados. No se realizaron pruebas funcionales ni integración con MongoDB/DIAN.
