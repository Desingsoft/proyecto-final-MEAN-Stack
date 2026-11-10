const sede = require('../middlewares/alcanceSucursal');
const sedeOperacion = require('../middlewares/sucursalOperaciones');
const titularidad = require('../middlewares/autorizacionRegistro');
const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: pedidoRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const permiso = require('../middlewares/permiso');

router.get('/', verifyToken, permiso('pedidos.leer'), sede.cargar, pedidoController.obtenerTodos);
router.get('/resumen', verifyToken, permiso('pedidos.leer'), sede.cargar, pedidoController.obtenerResumen);
router.get('/:id', verifyToken, permiso('pedidos.leer'), ...aplicar(identificador('id')), titularidad.permitirPedido(), sede.cargar, sede.pedido(), pedidoController.obtenerPorId);
router.post('/', verifyToken, checkRole(['admin', 'Ventas']), permiso('pedidos.crear'), ...aplicar(objeto, items, porcentaje('descuentoPorcentaje')), ...sedeOperacion.porBodega('bodegaId'), pedidoController.crear);
router.patch('/:id/estado', verifyToken, checkRole(['admin', 'ventas', 'bodeguero']), permiso('pedidos.editar'), ...aplicar(identificador('id'), objeto), titularidad.permitirPedido(), ...sedeOperacion.porPedido('id', 'params'), pedidoController.cambiarEstado);

module.exports = router;
