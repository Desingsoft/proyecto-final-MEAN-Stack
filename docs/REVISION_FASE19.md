# Fase 19 — Seguridad de roles y validaciones

## Cambios
- Matriz de roles: se alineó `ordenes-compra.*` con las rutas existentes y se habilitó `reportes.leer` para los roles que consultan reportes.
- Validaciones financieras: lista blanca de campos y tipos para cobros, reembolsos, egresos, devoluciones y facturación; se rechazan campos inesperados en esas operaciones.
- Validación de identificadores de las rutas de consulta por pedido y documento.
- Angular: `permissionGuard` y matriz de permisos para rutas sensibles; se añadió tipado de permisos al usuario y se corrigieron propiedades duplicadas de su interfaz.
- Se conserva el limitador de intentos de login de Fase 18 (por IP/correo, en memoria).

## Autorización por registro
El sistema tiene roles funcionales (administrador, ventas, bodeguero), pero **no dispone de una política de titularidad individual universal**. No se inventó una regla de acceso por propietario que impida a ventas consultar documentos comerciales compartidos. Para restringir documentos por sucursal, vendedor o cliente, primero se debe definir el modelo de asignación, propagarlo en las consultas de listado y detalle, y aplicarlo a operaciones de escritura y reportes. La matriz por rol no equivale a autorización por registro.

## Pendientes antes de producción
1. Confirmar que los valores de `estado`, `metodo`, `reembolso` y productos de devolución coinciden con el contrato de cada controlador y completar esquemas de todas las rutas restantes.
2. Sincronizar la matriz Angular con permisos individuales obtenidos del servidor y ocultar acciones de componentes, no solo rutas.
3. Ejecutar revisión de autorización por registro con escenarios de varias sucursales/usuarios cuando se establezca la política.
4. Ejecutar pruebas de login, JWT, permisos, validaciones 422, regresión de formularios y compilación Angular al final.
5. En producción distribuida sustituir el limitador de login en memoria por un almacenamiento compartido.

**No se ejecutaron pruebas funcionales, de base de datos ni compilación Angular en esta fase.**
