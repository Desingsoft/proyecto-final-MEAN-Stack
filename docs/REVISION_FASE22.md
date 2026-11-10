# Fase 22 — Auditoría de madurez operativa y seguridad

## Correcciones aplicadas

1. **Limitación de inicio de sesión**: anteriormente se limitaba únicamente por la pareja IP/correo; un atacante podía variar el correo para evitar el límite. Ahora se aplican dos límites independientes: 60 solicitudes por IP y 15 por pareja IP/correo en 15 minutos. El control continúa siendo en memoria y requiere Redis o equivalente para múltiples réplicas.
2. **CORS de producción**: se impide iniciar el backend en modo `production` sin `CORS_ORIGINS`. En desarrollo se conserva la compatibilidad con instalaciones locales.
3. **Identificación de solicitudes**: cada respuesta incorpora `X-Request-ID` para facilitar soporte y correlación de incidencias. El identificador lo genera el servidor.
4. **Cabeceras**: `Cache-Control: no-store` y `Permissions-Policy` para limitar exposición de datos sensibles y funciones del navegador.
5. **Angular**: el guard de permisos comprueba que exista una sesión antes de decidir si el usuario puede entrar a una ruta.

## Mejoras recomendadas para una empresa real

- **Multiempresa / sucursales**: separación de datos por organización, almacén y sucursal en *todas* las consultas, con migración controlada; no basta con agregar un campo a Usuario.
- **Cierre de caja**: arqueos, conciliación de pagos por medio de pago, diferencias justificadas y aprobación de cierre.
- **Compras**: solicitudes de compra, aprobaciones por importe, recepción parcial, costos adicionales y devoluciones a proveedor.
- **Trazabilidad**: auditoría inmutable de cambios sensibles, usuario, fecha, IP, motivo y valores anterior/nuevo, con políticas de retención.
- **Facturación Colombia**: evaluar integración con un proveedor tecnológico autorizado y requisitos DIAN aplicables; el PDF interno no equivale a factura electrónica validada.
- **Datos y operación**: respaldos cifrados, restauración probada, monitoreo, alertas, políticas de retención y tratamiento de datos personales.
- **Gestión**: dashboard por roles, indicadores de rotación, margen, productos sin movimiento, cartera vencida, pronóstico de reposición y exportaciones controladas.

## Hallazgos pendientes y riesgos

- La autorización por titularidad debe verificarse con dos vendedores y accesos cruzados a pedidos, pagos, devoluciones, cartera y exportaciones.
- La protección de login en memoria no es suficiente para despliegues escalados o detrás de proxies sin configuración confiable.
- Se necesita auditar el tratamiento de registros antiguos y la consistencia de las notas crédito históricas.
- El frontend guarda JWT en localStorage; estudiar cookies HttpOnly + CSRF como mejora de seguridad según arquitectura de despliegue.
- Revisar índices, paginación, concurrencia, errores y observabilidad con carga representativa.

## Plan de verificación

1. Instalar dependencias según README y configurar MongoDB replica set.
2. Ejecutar pruebas unitarias y compilación Angular con memoria suficiente.
3. Pruebas de integración de titularidad y roles, transacciones simultáneas y reintentos.
4. Pruebas de dispositivos móviles y accesibilidad.
5. Restaurar backup en entorno aislado y comprobar integridad.

**No se declara el sistema listo para producción sin estas verificaciones.**
