const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: usuarioRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const reglasUsuario = require('../middlewares/validacionesUsuarios');

router.use(verifyToken);

// Cualquier usuario autenticado gestiona su propio perfil.
// (Estas rutas van antes que las que llevan /:id para que "yo" no se tome como un id.)
router.get('/yo', usuarioController.yo);
router.patch('/yo/password', ...reglasUsuario.passwordPropio, usuarioController.cambiarMiPassword);

// Gestión de usuarios: solo administradores.
router.get('/', checkRole(['admin']), permiso('usuarios.leer'), ...reglasUsuario.listar, usuarioController.listar);
router.patch('/:id', checkRole(['admin']), permiso('usuarios.editar'), ...aplicar(identificador('id')), ...reglasUsuario.actualizar, usuarioController.actualizar);
router.patch('/:id/password', checkRole(['admin']), permiso('usuarios.editar'), ...aplicar(identificador('id')), ...reglasUsuario.passwordAdmin, usuarioController.restablecerPassword);

module.exports = router;
