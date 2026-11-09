/**
 * Archivo: authRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');

// Las reglas se ejecutan antes del controlador y rechazan datos mal formados.
const reglas = require('../middlewares/validacionesApi');
const validar = require('../middlewares/validarSolicitud');
const limitarLogin = require('../middlewares/limitarLogin');
router.post('/login', limitarLogin, reglas.login, validar, authController.login);
router.post('/recuperar', limitarLogin, reglas.recuperar, validar, authController.solicitarRecuperacion);
router.post('/restablecer', reglas.restablecer, validar, authController.restablecer);

// El registro de cuentas sigue reservado al administrador autenticado.
router.post('/registro', verifyToken, checkRole(['admin']), reglas.registro, validar, authController.registro);

module.exports = router;
