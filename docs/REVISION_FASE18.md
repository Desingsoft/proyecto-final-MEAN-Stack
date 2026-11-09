# Fase 18 — Seguridad, roles y validaciones

## Cambios

- `rolesPermisos.js`: permisos base explícitos por rol. Los permisos individuales no pueden elevar el rol. Las cuentas existentes con `permisos: []` heredan el rol base.
- `limitarLogin.js`: límite por combinación IP/correo para login y recuperación. Complementa el bloqueo por cuenta; es **solo memoria local**. En producción con varias instancias se necesita Redis y rate limiting perimetral.
- `validacionesUsuarios.js`: lista blanca de campos, tipos, contraseña de mínimo 12 caracteres y validación de consultas.
- `validacionesClientes.js`: lista blanca de campos, validación de importes, email y paginación.
- `/usuarios/yo` y cambio de contraseña propia: accesibles a cualquier usuario autenticado, sin requerir permisos administrativos.

## Matriz de referencia

| Operación | Administrador | Ventas | Bodeguero |
|---|---|---|---|
| Gestión de usuarios | Sí | No | No |
| Lectura de productos | Sí | Sí | Sí |
| Crear productos | Sí | No | No |
| Editar productos | Sí | No | Sí |
| Clientes: leer/crear/editar | Sí | Sí | No |
| Pedidos: leer/editar | Sí | Sí | Sí |
| Inventario: leer/crear movimientos | Sí | No | Sí |
| Reportes avanzados | Sí | No | No |

**Advertencia:** la matriz incluye permisos previstos; los `checkRole` y `permiso` de cada ruta siguen siendo obligatorios. Los nombres de permiso en rutas heredadas pueden requerir ajustes tras una auditoría completa. No se ha demostrado cobertura exhaustiva de todos los endpoints.

## Pendientes antes de producción

1. Auditar todos los endpoints, especialmente rutas `avanzado`, `cartera`, `pago`, `devolucion`, `documento` y `configuracion`, contra una matriz completa y sus controles de pertenencia por registro.
2. Revisar todas las respuestas de usuarios para evitar exposición de hashes o tokens de recuperación.
3. Verificar el tratamiento de permisos en los guards y menús Angular.
4. Revisar contraseñas existentes de longitud inferior a 12: no se invalidan hasta su siguiente cambio.
5. Sustituir el limitador en memoria por un almacén compartido en despliegues con réplicas.
6. Compilación, pruebas funcionales, concurrencia, MongoDB y SMTP: **pospuestas al cierre**, por decisión del usuario.
