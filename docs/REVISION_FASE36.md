# Fase 36 — Diagnóstico de integridad por sucursales

Se añadió `npm run auditar:inventario-sucursales` para comparar el inventario global con las existencias por bodega e identificar bodegas sin sucursal, productos/bodegas huérfanos, cantidades inválidas y registros duplicados. **Solo lectura**; salida JSON en stdout; código de salida 2 si existen hallazgos. Puede haber diferencias legítimas por saldos históricos sin migrar: no corregir automáticamente.

Se añadieron pruebas unitarias para las reglas puras de diagnóstico. No se ejecutaron pruebas reales de concurrencia ni de acceso con MongoDB; tampoco compilación Angular. La segregación completa de anulaciones y pagos a proveedores y la conexión con DIAN siguen pendientes. Antes de usar en producción: probar con replica set, usuarios de dos sedes, fallos transaccionales y conciliación de datos históricos.
