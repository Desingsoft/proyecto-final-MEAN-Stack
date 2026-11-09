const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: ordenCompraRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/ordenCompraController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const { cargar } = require('../middlewares/alcanceSucursal');
const { soloGlobal, compra } = require('../middlewares/segregacionFase30');

router.use(verifyToken, checkRole(['admin', 'bodeguero']));
router.get('/', permiso('ordenes-compra.leer'), cargar, controller.listar);
router.post('/desde-reposicion', ...soloGlobal, permiso('ordenes-compra.crear'), controller.desdeReposicion); // antes que /:id
router.get('/:id', permiso('ordenes-compra.leer'), ...aplicar(identificador('id')), ...compra, controller.obtener);
router.post('/', ...soloGlobal, permiso('ordenes-compra.crear'), ...aplicar(objeto), controller.crear);
router.put('/:id', ...soloGlobal, permiso('ordenes-compra.editar'), ...aplicar(identificador('id'), objeto), controller.actualizar);
router.patch('/:id/estado', ...soloGlobal, permiso('ordenes-compra.editar'), ...aplicar(identificador('id'), objeto), controller.cambiarEstado);
router.post('/:id/recibir', ...compra, permiso('ordenes-compra.crear'), ...aplicar(identificador('id'), objeto), controller.recibir);
router.patch('/:id/facturacion', ...soloGlobal, permiso('ordenes-compra.editar'), ...aplicar(identificador('id'), objeto), controller.actualizarFacturacion);

module.exports = router;
