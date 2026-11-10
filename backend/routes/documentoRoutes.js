const sede = require('../middlewares/alcanceSucursal');
const sedeOperacion = require('../middlewares/sucursalOperaciones');
const titularidad = require('../middlewares/autorizacionRegistro');
const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: documentoRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/documentoController');
const verifyToken = require('../middlewares/verifyToken');
const reglasFinancieras = require('../middlewares/validacionesFinancieras');
const checkRole = require('../middlewares/checkRole');

router.use(verifyToken);
router.get('/', checkRole(['admin', 'ventas']), permiso('documentos.leer'), sede.cargar, controller.listar);
router.get('/pedido/:pedidoId', checkRole(['admin', 'ventas']), permiso('documentos.leer'), ...aplicar(identificador('pedidoId')), titularidad.permitirPedido('pedidoId'), sede.cargar, sede.pedido('pedidoId'), controller.porPedido); // antes que /:id
router.get('/:id', checkRole(['admin', 'ventas']), permiso('documentos.leer'), ...aplicar(identificador('id')), titularidad.permitirDocumento(), sede.cargar, sede.documento(), controller.obtener);
router.post('/', checkRole(['admin', 'ventas']), permiso('documentos.crear'), ...aplicar(objeto), ...reglasFinancieras.documento, ...sedeOperacion.porPedido('pedidoId'), controller.crear);
router.patch('/:id/anular', checkRole(['admin']), permiso('documentos.editar'), ...aplicar(identificador('id'), objeto), ...reglasFinancieras.anulacion, controller.anular);

module.exports = router;
