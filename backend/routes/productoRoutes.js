/**
 * Archivo: productoRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const permiso = require('../middlewares/permiso');
const reglas = require('../middlewares/validacionesApi');
const validar = require('../middlewares/validarSolicitud');

router.get('/', verifyToken, permiso('productos.leer'), reglas.listarProductos, validar, productoController.obtenerTodos);
router.get('/stock-bajo', verifyToken, permiso('productos.leer'), productoController.obtenerStockBajo);
router.get('/categorias', verifyToken, permiso('productos.leer'), productoController.obtenerCategorias);
router.get('/reposicion', verifyToken, permiso('productos.leer'), checkRole(['admin', 'bodeguero']), productoController.obtenerReposicion);
router.get('/:id', verifyToken, permiso('productos.leer'), reglas.idProducto, validar, productoController.obtenerPorId);
router.post('/', verifyToken, checkRole(['admin']), permiso('productos.crear'), reglas.crearProducto, validar, productoController.crear);
router.put('/:id', verifyToken, checkRole(['admin', 'bodeguero']), permiso('productos.editar'), reglas.actualizarProducto, validar, productoController.actualizar);
router.delete('/:id', verifyToken, checkRole(['admin']), permiso('productos.eliminar'), reglas.idProducto, validar, productoController.eliminar);

module.exports = router;
