# Inventario de contratos API (extraído del código de rutas)

Las rutas siguientes son **declaraciones**, no una especificación OpenAPI validada. Consultar los controladores para campos de solicitud y respuesta. Los prefijos montados en `backend/server.js` pueden variar respecto al nombre del archivo.

| Archivo de rutas | Método | Ruta relativa |
|---|---|---|
| `authRoutes.js` | `POST` | `/login` |
| `authRoutes.js` | `POST` | `/recuperar` |
| `authRoutes.js` | `POST` | `/restablecer` |
| `authRoutes.js` | `POST` | `/recuperar` |
| `authRoutes.js` | `POST` | `/restablecer` |
| `authRoutes.js` | `POST` | `/registro` |
| `avanzadoRoutes.js` | `GET` | `/bodegas` |
| `avanzadoRoutes.js` | `POST` | `/bodegas` |
| `avanzadoRoutes.js` | `GET` | `/existencias` |
| `avanzadoRoutes.js` | `GET` | `/auditoria` |
| `avanzadoRoutes.js` | `GET` | `/alertas` |
| `avanzadoRoutes.js` | `GET` | `/notificaciones` |
| `avanzadoRoutes.js` | `PATCH` | `/notificaciones/:id/leida` |
| `avanzadoRoutes.js` | `POST` | `/conteos` |
| `avanzadoRoutes.js` | `GET` | `/conteos` |
| `avanzadoRoutes.js` | `GET` | `/cotizaciones` |
| `avanzadoRoutes.js` | `POST` | `/cotizaciones` |
| `avanzadoRoutes.js` | `PATCH` | `/cotizaciones/:id/estado` |
| `avanzadoRoutes.js` | `GET` | `/indicadores` |
| `avanzadoRoutes.js` | `GET` | `/codigo-barras/:codigo` |
| `avanzadoRoutes.js` | `POST` | `/cotizaciones/:id/convertir` |
| `carteraRoutes.js` | `GET` | `/cobrar/resumen` |
| `carteraRoutes.js` | `GET` | `/cobrar/a-favor` |
| `carteraRoutes.js` | `GET` | `/cobrar/clientes` |
| `carteraRoutes.js` | `GET` | `/cobrar/estado-cuenta/:clienteId` |
| `carteraRoutes.js` | `GET` | `/cobrar` |
| `carteraRoutes.js` | `GET` | `/pagar/resumen` |
| `carteraRoutes.js` | `GET` | `/pagar` |
| `clienteRoutes.js` | `GET` | `/` |
| `clienteRoutes.js` | `GET` | `/:id` |
| `clienteRoutes.js` | `POST` | `/` |
| `clienteRoutes.js` | `PUT` | `/:id` |
| `clienteRoutes.js` | `DELETE` | `/:id` |
| `configuracionRoutes.js` | `GET` | `/` |
| `configuracionRoutes.js` | `PUT` | `/` |
| `devolucionRoutes.js` | `GET` | `/` |
| `devolucionRoutes.js` | `GET` | `/pedido/:pedidoId` |
| `devolucionRoutes.js` | `GET` | `/:id` |
| `devolucionRoutes.js` | `POST` | `/` |
| `devolucionRoutes.js` | `PATCH` | `/:id/anular` |
| `documentoRoutes.js` | `GET` | `/` |
| `documentoRoutes.js` | `GET` | `/pedido/:pedidoId` |
| `documentoRoutes.js` | `GET` | `/:id` |
| `documentoRoutes.js` | `POST` | `/` |
| `documentoRoutes.js` | `PATCH` | `/:id/anular` |
| `eventoRoutes.js` | `GET` | `/` |
| `inventarioRoutes.js` | `GET` | `/movimientos` |
| `inventarioRoutes.js` | `POST` | `/movimiento` |
| `ordenCompraRoutes.js` | `GET` | `/` |
| `ordenCompraRoutes.js` | `POST` | `/desde-reposicion` |
| `ordenCompraRoutes.js` | `GET` | `/:id` |
| `ordenCompraRoutes.js` | `POST` | `/` |
| `ordenCompraRoutes.js` | `PUT` | `/:id` |
| `ordenCompraRoutes.js` | `PATCH` | `/:id/estado` |
| `ordenCompraRoutes.js` | `POST` | `/:id/recibir` |
| `ordenCompraRoutes.js` | `PATCH` | `/:id/facturacion` |
| `pagoRoutes.js` | `GET` | `/` |
| `pagoRoutes.js` | `POST` | `/cobro` |
| `pagoRoutes.js` | `POST` | `/reembolso` |
| `pagoRoutes.js` | `POST` | `/egreso` |
| `pagoRoutes.js` | `GET` | `/documento/:id` |
| `pagoRoutes.js` | `GET` | `/orden/:id` |
| `pagoRoutes.js` | `GET` | `/:id` |
| `pagoRoutes.js` | `PATCH` | `/:id/anular` |
| `pedidoRoutes.js` | `GET` | `/` |
| `pedidoRoutes.js` | `GET` | `/resumen` |
| `pedidoRoutes.js` | `GET` | `/:id` |
| `pedidoRoutes.js` | `POST` | `/` |
| `pedidoRoutes.js` | `PATCH` | `/:id/estado` |
| `productoRoutes.js` | `GET` | `/` |
| `productoRoutes.js` | `GET` | `/stock-bajo` |
| `productoRoutes.js` | `GET` | `/categorias` |
| `productoRoutes.js` | `GET` | `/reposicion` |
| `productoRoutes.js` | `GET` | `/:id` |
| `productoRoutes.js` | `POST` | `/` |
| `productoRoutes.js` | `PUT` | `/:id` |
| `productoRoutes.js` | `DELETE` | `/:id` |
| `proveedorRoutes.js` | `GET` | `/` |
| `proveedorRoutes.js` | `GET` | `/:id` |
| `proveedorRoutes.js` | `POST` | `/` |
| `proveedorRoutes.js` | `PUT` | `/:id` |
| `proveedorRoutes.js` | `DELETE` | `/:id` |
| `reporteRoutes.js` | `GET` | `/dashboard` |
| `reporteRoutes.js` | `GET` | `/ventas` |
| `reporteRoutes.js` | `GET` | `/inventario` |
| `reporteRoutes.js` | `GET` | `/movimientos` |
| `usuarioRoutes.js` | `GET` | `/yo` |
| `usuarioRoutes.js` | `PATCH` | `/yo/password` |
| `usuarioRoutes.js` | `GET` | `/` |
| `usuarioRoutes.js` | `PATCH` | `/:id` |
| `usuarioRoutes.js` | `PATCH` | `/:id/password` |

## Convenciones
- Autenticación: `Authorization: Bearer <token>` en endpoints protegidos.
- Errores: JSON con `mensaje`; códigos HTTP 400, 401, 403, 404, 409 y 500 según el caso.
- Los endpoints transaccionales necesitan `MONGODB_URI` apuntando a un replica set.
- Pendiente: completar esquemas request/response, ejemplos y validación OpenAPI por endpoint.
