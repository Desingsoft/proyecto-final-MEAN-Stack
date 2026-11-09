/**
 * Archivo: carteraRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/carteraController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const titular = require('../middlewares/autorizacionFinanciera');
const { soloGlobal } = require('../middlewares/segregacionFase30');
const { cargar } = require('../middlewares/alcanceSucursal');

router.use(verifyToken);

// Por cobrar: admin y ventas. Por pagar: solo admin.
router.get('/cobrar/resumen', cargar, checkRole(['admin', 'ventas']), permiso('cartera.leer'), controller.resumenCobrar);
router.get('/cobrar/a-favor', cargar, checkRole(['admin', 'ventas']), permiso('cartera.leer'), controller.listaAFavor);
router.get('/cobrar/clientes', cargar, checkRole(['admin', 'ventas']), permiso('cartera.leer'), controller.porCliente);
router.get('/cobrar/estado-cuenta/:clienteId', cargar, checkRole(['admin', 'ventas']), permiso('cartera.leer'), titular.permitirClienteCartera, controller.estadoCuenta);
router.get('/cobrar', cargar, checkRole(['admin', 'ventas']), permiso('cartera.leer'), controller.listaCobrar);

router.get('/pagar/resumen', cargar, checkRole(['admin']), permiso('cartera.leer'), controller.resumenPagar);
router.get('/pagar', cargar, checkRole(['admin']), permiso('cartera.leer'), controller.listaPagar);

module.exports = router;
