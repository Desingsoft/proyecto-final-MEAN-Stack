# Fase 20 — Titularidad y navegación por permisos

## Política adoptada
- **Administrador:** acceso a todos los pedidos y documentos, sujeto a controles del endpoint.
- **Ventas:** solo pedidos creados por la propia cuenta (`Pedido.creadoPor`) y documentos asociados a esos pedidos. Los pedidos históricos sin autor quedan solo para administración hasta regularización.
- **Bodeguero:** consulta operativa de pedidos compartida, sin acceso a documentos fiscales; no se aplica titularidad comercial a operaciones logísticas.
- Se responde **404** para recursos ajenos a fin de no revelar su existencia.

## Backend
`middlewares/autorizacionRegistro.js` centraliza filtros y comprobaciones. Listados y detalles de pedidos y documentos aplican la política; creación de documentos exige titularidad del pedido. Cambios de estado de pedido también comprueban acceso.

## Angular
Se agregaron guards de permisos a rutas de lectura/detalle y operaciones de órdenes de compra; el menú filtra opciones según rol y permisos individuales. La interfaz nunca sustituye la autorización de la API.

## Límites y tareas antes de producción
- Revisar rutas de cartera, pagos, devoluciones, reportes y consultas indirectas que puedan exponer información de otros vendedores: **no quedan cubiertas automáticamente por este middleware**.
- Revisar que las rutas de creación de documentos relacionadas con notas crédito usen las mismas reglas de titularidad.
- Si la organización necesita visibilidad compartida entre vendedores, sustituir la política por una explícita basada en equipo/sucursal.
- Los datos históricos sin `creadoPor` requieren regularización supervisada, no asignación automática.
- No se ejecutaron compilación, tests ni conexión a MongoDB, por acuerdo con el usuario.
