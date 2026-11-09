const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: clienteRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/clienteController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const reglasCliente = require('../middlewares/validacionesClientes');

router.use(verifyToken);
router.get('/', checkRole(['admin', 'ventas']), permiso('clientes.leer'), ...reglasCliente.listar, controller.listar);
router.get('/:id', checkRole(['admin', 'ventas']), permiso('clientes.leer'), ...aplicar(identificador('id')), controller.obtener);
router.post('/', checkRole(['admin', 'ventas']), permiso('clientes.crear'), ...reglasCliente.crear, controller.crear);
router.put('/:id', checkRole(['admin', 'ventas']), permiso('clientes.editar'), ...aplicar(identificador('id')), ...reglasCliente.actualizar, controller.actualizar);
router.delete('/:id', checkRole(['admin']), permiso('clientes.eliminar'), ...aplicar(identificador('id')), controller.eliminar);

module.exports = router;
