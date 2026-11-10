# Corrección: búsqueda de productos en Nuevo pedido

## Causa comprobada
La pantalla solicitaba `GET /api/productos?pagina=1&limite=1000`, pero Express Validator permite un máximo de 100 (`backend/middlewares/validacionesApi.js`). La petición era rechazada y la pantalla no mostraba el error, por lo que parecía que no había productos.

## Cambio
- Consulta al backend por nombre o SKU, con espera de 250 ms para evitar peticiones excesivas.
- Máximo 30 coincidencias por búsqueda, sin depender de cargar el catálogo completo.
- Manejo de fallos y mensajes de búsqueda vacía o sin resultados.
- Instrucciones visibles y campo de descuento antes del carrito; totales claros cuando se agregan productos.
- Se conservan el contrato de creación de pedidos y las validaciones de stock y precio en backend.

## Verificación
- Backend: 328 pruebas aprobadas, 0 fallidas, 3 omitidas (requieren MongoDB real).
- Compilación Angular: no realizada en este entorno (sin dependencias de frontend instaladas).
- En Windows, abrir el proyecto y ejecutar `cd frontend; npm install; npm start`. Iniciar sesión como Ventas y buscar un producto activo por nombre o SKU.
- Si el producto tiene stock 0, aparecerá en la búsqueda pero no se podrá añadir al pedido hasta registrar existencias.

## Alcance
No se añaden datos de cliente, entrega o pagos al contrato de pedidos: agregarlos solo a la interfaz sin persistencia sería engañoso. Esos campos requieren cambios coordinados en modelo, validaciones y API.
