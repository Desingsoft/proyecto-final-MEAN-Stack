const sede = require('../middlewares/alcanceSucursal');
const sedeOperacion = require('../middlewares/sucursalOperaciones');
const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: pagoRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/pagoController');
const verifyToken = require('../middlewares/verifyToken');
const reglasFinancieras = require('../middlewares/validacionesFinancieras');
const checkRole = require('../middlewares/checkRole');
const titular = require('../middlewares/autorizacionFinanciera');

router.use(verifyToken);

// Cobros a clientes: admin y ventas. Pagos a proveedores: solo admin (el controlador lo exige en las consultas).
router.get('/', checkRole(['admin', 'ventas']), permiso('pagos.leer'), sede.cargar, controller.listar);
router.post('/cobro', checkRole(['admin', 'ventas']), permiso('pagos.crear'), ...aplicar(objeto, claveIdempotencia), ...reglasFinancieras.pago('documentoId'), titular.permitirDocumentoFinanciero, ...sedeOperacion.porDocumento('documentoId'), controller.registrarCobro);
router.post('/reembolso', checkRole(['admin', 'ventas']), permiso('pagos.crear'), ...aplicar(objeto, claveIdempotencia), ...reglasFinancieras.pago('documentoId'), titular.permitirDocumentoFinanciero, ...sedeOperacion.porDocumento('documentoId'), controller.registrarReembolso);
router.post('/egreso', checkRole(['admin']), permiso('pagos.crear'), ...aplicar(objeto, claveIdempotencia), ...reglasFinancieras.pago('ordenId'), controller.registrarEgreso);
router.get('/documento/:id', checkRole(['admin', 'ventas']), permiso('pagos.leer'), ...aplicar(identificador('id')), titular.permitirDocumentoFinanciero, ...sedeOperacion.porDocumento('id', 'params'), controller.porDocumento); // antes que /:id
router.get('/orden/:id', checkRole(['admin']), permiso('pagos.leer'), ...aplicar(identificador('id')), controller.porOrden);
router.get('/:id', checkRole(['admin', 'ventas']), permiso('pagos.leer'), ...aplicar(identificador('id')), titular.permitirPago, sede.cargar, controller.obtener);
router.patch('/:id/anular', checkRole(['admin']), permiso('pagos.editar'), ...aplicar(identificador('id'), objeto), ...reglasFinancieras.anulacion, controller.anular);

module.exports = router;
