/**
 * Archivo: reporteRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const { soloGlobal } = require('../middlewares/segregacionFase30');
const { cargar } = require('../middlewares/alcanceSucursal');

router.use(verifyToken);

// El dashboard lo ven todos los roles; el controlador oculta las cifras de ventas a quien no corresponde.
router.get('/sucursal/resumen', cargar, checkRole(['admin', 'bodeguero']), permiso('reportes.leer'), require('../controllers/reporteSucursalController'));
router.get('/dashboard', ...soloGlobal, checkRole(['admin', 'bodeguero']), permiso('reportes.leer'), reporteController.dashboard);
router.get('/ventas', ...soloGlobal, checkRole(['admin']), permiso('reportes.leer'), reporteController.ventas);
router.get('/inventario', ...soloGlobal, checkRole(['admin', 'bodeguero']), permiso('reportes.leer'), reporteController.inventario);
router.get('/movimientos', cargar, checkRole(['admin', 'bodeguero']), permiso('reportes.leer'), reporteController.movimientos);

module.exports = router;
