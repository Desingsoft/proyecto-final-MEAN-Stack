# Revisión técnica — Fase 7

## Implementado
- **Pagos:** clave de idempotencia obligatoria para cobros, reembolsos y egresos; índice único parcial en MongoDB. Repetir la clave devuelve conflicto (409), sin crear otro pago. La interfaz Angular aún debe generar y conservar la clave por intento de pago.
- **Conciliación:** reporte de solo lectura ampliado con entradas y salidas históricas. No se igualan movimientos con stock sin conocer saldos iniciales.
- **Frontend:** reglas CSS de foco y tamaño táctil; pendiente inspección componente a componente.
- **OpenAPI:** inventario preliminar de rutas; **no** es un contrato final: faltan cuerpos, tipos y respuestas exactas.

## Riesgos críticos pendientes
1. Los pagos simultáneos con claves **distintas** pueden calcular el mismo saldo antes de confirmar. Se requiere bloqueo/actualización condicional del documento y prueba de concurrencia.
2. Devoluciones simultáneas requieren límites atómicos por línea, idempotencia y conciliación con notas crédito y reembolsos.
3. La conservación de valores de facturas existentes debe verificarse frente a las rutas de modificación; no deben recalcularse desde el catálogo.
4. El inventario multibodega necesita conciliación histórica con saldo inicial y trazabilidad por ubicación; el script no ajusta datos.
5. Auditoría de autorización: revisar rutas montadas y permisos por operación y probar roles negativos.
6. Revisar todos los formularios, navegación móvil y servicios Angular.
7. Completar documentación JSDoc por función y esquemas OpenAPI reales.

## Pruebas diferidas
Por decisión del usuario no se ejecutaron pruebas funcionales, compilación Angular, MongoDB, SMTP ni restauración. La sintaxis estática puede comprobarse sin levantar servicios.
