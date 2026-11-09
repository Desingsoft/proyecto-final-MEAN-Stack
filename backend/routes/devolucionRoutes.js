const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: devolucionRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const sedeOperacion = require('../middlewares/sucursalOperaciones');
const express = require('express');
const router = express.Router();
const controller = require('../controllers/devolucionController');
const verifyToken = require('../middlewares/verifyToken');
const reglasFinancieras = require('../middlewares/validacionesFinancieras');
const checkRole = require('../middlewares/checkRole');
const titular = require('../middlewares/autorizacionFinanciera');

router.use(verifyToken);
router.get('/', checkRole(['admin', 'ventas']), permiso('devoluciones.leer'), controller.listar);
router.get('/pedido/:pedidoId', checkRole(['admin', 'ventas']), permiso('devoluciones.leer'), ...aplicar(identificador('pedidoId')), titular.permitirPedidoDevolucion, controller.porPedido); // antes que /:id
router.get('/:id', checkRole(['admin', 'ventas']), permiso('devoluciones.leer'), ...aplicar(identificador('id')), titular.permitirDevolucion, controller.obtener);
router.post('/', checkRole(['admin', 'ventas']), permiso('devoluciones.crear'), ...aplicar(objeto, items, claveIdempotencia), ...reglasFinancieras.devolucion, titular.permitirPedidoDevolucion, ...sedeOperacion.porPedido('pedidoId'), controller.crear);
router.patch('/:id/anular', checkRole(['admin']), permiso('devoluciones.editar'), ...aplicar(identificador('id'), objeto), ...reglasFinancieras.anulacion, controller.anular);

module.exports = router;
