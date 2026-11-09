const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: proveedorRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');

router.get('/', verifyToken, permiso('proveedores.leer'), proveedorController.obtenerTodos);
router.get('/:id', verifyToken, permiso('proveedores.leer'), ...aplicar(identificador('id')), proveedorController.obtenerPorId);
router.post('/', verifyToken, checkRole(['admin']), permiso('proveedores.crear'), ...aplicar(objeto), proveedorController.crear);
router.put('/:id', verifyToken, checkRole(['admin']), permiso('proveedores.editar'), ...aplicar(identificador('id'), objeto), proveedorController.actualizar);
router.delete('/:id', verifyToken, checkRole(['admin']), permiso('proveedores.eliminar'), ...aplicar(identificador('id')), proveedorController.eliminar);

module.exports = router;
