# Fase 42 — Estabilización transversal y controles de acceso

## Alcance implementado

1. **Idempotencia obligatoria para movimientos manuales**: `POST /api/inventario/movimiento` exige encabezado `Idempotency-Key` (16 a 128 caracteres alfanuméricos, guion o guion bajo). Un cliente antiguo que no lo envíe recibirá HTTP 400. El frontend ya lo suministra. Una clave reutilizada con un cuerpo diferente devuelve 409; una operación idéntica devuelve el movimiento anterior. La garantía efectiva depende del índice único de MongoDB y de transacciones operativas.
2. **Validación del motivo en transferencias**: el motivo debe ser texto de máximo 300 caracteres; se rechazan objetos y valores inválidos.
3. **Diagnóstico de inventario**: las existencias duplicadas ya no se suman dos veces como saldo localizado válido. Se reportan anomalías de duplicados, referencias inexistentes, valores inválidos, diferencias globales y bodegas sin sucursal.
4. **Pruebas de seguridad por sucursal**: siete casos con dobles de base de datos, incluyendo administrador, usuario inactivo, usuario sin sucursal, consulta de sede ajena y pedidos históricos sin sede.
5. **Puerta de calidad**: `npm run verificar:calidad` ejecuta las pruebas del backend, intenta la compilación Angular si está instalada y genera `docs/resultado-puerta-calidad.json`. Un paso omitido por falta de dependencias NO se considera aprobado. No conecta a producción ni modifica datos.

## Verificación ejecutada en esta entrega

- Backend: 74 casos detectados; 73 aprobados, 0 fallidos y 1 omitido por no estar configurada `MONGO_TEST_URI`.
- Angular: instalación de dependencias intentada, sin completarse dentro del tiempo disponible; compilación NO verificada.
- MongoDB: NO se ejecutó prueba real de concurrencia.
- No se probó la emisión electrónica DIAN.

## Procedimiento para entorno de pruebas

```bash
cd backend
npm ci
npm test
npm run verificar:calidad
```

En `frontend`:

```bash
npm ci
npm run build:prod
```

Para habilitar la prueba MongoDB, usar una **base exclusiva de pruebas** cuyo nombre incluya `test` o `prueba`, configurada como replica set, y definir `MONGO_TEST_URI` antes de ejecutar `npm test`. Nunca apuntar esa variable a producción.

## Criterios de aceptación pendientes

- Angular compila sin errores en modo producción.
- Pruebas de integración sobre replica set con operaciones simultáneas y reintentos.
- Verificación de índices únicos y migración controlada de registros sin sucursal.
- Pruebas HTTP con cuentas de diferentes sedes, también para pagos, anulaciones y reportes.
- Conciliación de saldos por bodega y validación de datos históricos.
- Pruebas de recuperación y restauración de respaldos.
- Integración con proveedor tecnológico DIAN: aún no configurada.

**Estado:** versión de desarrollo, no certificada para producción.
