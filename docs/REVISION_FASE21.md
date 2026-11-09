# Fase 21 — Titularidad financiera y verificación

## Política
- **Administrador:** acceso general sujeto a permisos.
- **Ventas:** solo pagos, devoluciones y cartera vinculados a pedidos con `creadoPor` igual a su ID; los registros sin propietario se reservan al administrador.
- **Bodeguero:** sin acceso a cobros, cartera ni devoluciones financieras; reportes de inventario según permisos.
- **Reportes globales:** `/reportes/ventas` y `/reportes/dashboard` no están disponibles para ventas mientras no exista una versión con agregaciones acotadas al propietario. Esto evita divulgar datos de terceros.

## Cobertura
- Pagos: cobros/reembolsos, listado, detalle y consulta por documento.
- Devoluciones: creación, listado, consulta por pedido y detalle.
- Cartera: listado, resúmenes, saldos a favor, clientes y estado de cuenta; pagos asociados filtrados.
- Reportes: se impide consultar agregados globales desde el rol ventas.
- Angular: la matriz local retira `reportes.leer` del rol ventas. **El backend es la autoridad final**.

## Limitaciones y validación
- La comprobación de titularidad realiza consultas adicionales: medir el rendimiento con datos reales.
- Revisar que los usuarios existentes tengan `creadoPor` y regularizar los registros históricos sin propietario.
- Las pruebas de integración deben incluir usuarios A/B, cobros, reembolsos, devoluciones, cartera, consultas directas por ID y acceso a reportes.
- Se necesitan pruebas funcionales reales en un entorno con dependencias instaladas, MongoDB disponible y frontend compilable.

## Navegación Angular
El vendedor inicia en `/pedidos`; no se ofrece el dashboard global ni los reportes de ventas agregados. Los guards redirigen a `/pedidos` para evitar bucles de navegación.
