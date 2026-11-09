# Auditoría técnica — revisión estática

**Alcance:** código fuente de Fase 4. No se han ejecutado pruebas por indicación del usuario.

## Prioridades

| Prioridad | Archivo o área | Hallazgo | Acción recomendada |
|---|---|---|---|
| Crítica | `backend/controllers/pedidoController.js` | Cancelación sin transacción para stock, movimientos, documentos y estado | Unificar en transacción y bloquear transiciones concurrentes |
| Alta | `backend/controllers/pedidoController.js` | Se permitían líneas repetidas y paginación sin límites | **Corregido** con validaciones preventivas |
| Alta | Inventario / bodegas | Posible divergencia entre stock global y existencias por bodega | Conciliar, elegir fuente de verdad y registrar transferencias atómicas |
| Alta | API / controladores | Respuestas incluyen detalles internos de excepciones | Normalizar errores y registro seguro |
| Alta | Dependencias frontend | 70 alertas reportadas por npm (captura del usuario) | Clasificar directas/transitivas, runtime/dev y actualizar sin `--force` |
| Media | `backend/server.js` | Monitor inicia sin esperar conexión | Inicialización ordenada y liderazgo único |
| Media | Autorización | Permisos por ruta requieren auditoría de cobertura y recursos | Matriz CRUD por rol, controles de pertenencia y denegación por defecto |
| Media | Documentación | Comentarios desiguales | Encabezados agregados; completar JSDoc semántico por módulo |

## Orden sugerido de trabajo (sin pruebas todavía)

1. Refactor de cancelación y devoluciones; transacciones, idempotencia y reglas de estados.
2. Inventario por bodega: conciliación, movimientos, transferencias y ajustes.
3. Autorización y sanitización de errores en todos los endpoints.
4. Integridad de cotizaciones, descuentos, pagos y cartera.
5. Documentación funcional, técnica y de despliegue; diagramas y OpenAPI.
6. Al final: pruebas unitarias, integración, concurrencia, seguridad, Angular, SMTP y restauración aislada.

## Límite de esta entrega

No se afirma que los riesgos pendientes estén solucionados. Los comentarios nuevos describen responsabilidades de archivos y controladores; la documentación exhaustiva de cada función o variable requiere inspección semántica individual.
