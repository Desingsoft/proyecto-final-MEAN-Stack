# Fase 11 — Refactorización incremental del frontend

## Alcance

Se parte de la Fase 10 y se conservan las rutas y contratos existentes. Esta fase no reemplaza componentes ni altera los procesos financieros.

### Cambios implementados

- `core/utils/api-error.ts`: función pura para convertir errores HTTP en mensajes adecuados para usuarios. No muestra errores internos 500.
- `core/utils/form-errors.ts`: utilidades compartidas para anunciar errores de formularios reactivos y marcar campos como tocados al enviar.
- `core/services/pedido.service.ts`: se reemplaza `any` en el resumen por `ResumenPedidos` y se documenta la bodega opcional en las solicitudes.
- `core/services/producto.service.ts`: documentación del servicio y sus operaciones.
- `features/productos/form-producto/form-producto.component.ts`: se elimina `any` al normalizar proveedor y construir el payload, se usan mensajes HTTP compartidos y se muestran los errores del formulario tras intentar enviarlo.

### Pendientes para próximas iteraciones

1. Extender `obtenerMensajeApi` y `mensajeControl` a los demás formularios y servicios, sin modificar sus contratos.
2. Revisar los componentes con `any`, comenzando por pagos, devoluciones, cotizaciones y cartera.
3. Auditar los estilos y las tablas de cada pantalla en móvil, incluyendo foco y lectores de pantalla.
4. Verificar que el backend acepte `bodega` y que las operaciones que afectan stock utilicen las reglas de inventario multibodega.
5. Ejecutar la compilación Angular, pruebas unitarias, integración y pruebas visuales al finalizar las fases, como se acordó.

### Nota de seguridad

La validación de Angular es únicamente de experiencia de usuario. El backend debe seguir validando permisos, formatos, límites y reglas de negocio.
