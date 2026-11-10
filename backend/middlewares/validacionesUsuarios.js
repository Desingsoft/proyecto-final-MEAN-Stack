/** Reglas estrictas de edición de usuarios y contraseñas. */
const { body, query } = require('express-validator');
const { objeto } = require('./validacionesComerciales');
const validar = require('./validarSolicitud');
const campos = ['nombre', 'email', 'role', 'activo', 'fechaNacimiento', 'sexo', 'ciudad'];
const sinExtras = permitidos => body().custom(v => {
  if (Object.keys(v || {}).some(k => !permitidos.includes(k))) throw new Error('Campos no permitidos');
  if (!Object.keys(v || {}).length) throw new Error('Solicitud vacía');
  return true;
});
const clave = body('password').isString().isLength({ min: 12, max: 128 }).withMessage('La contraseña debe tener entre 12 y 128 caracteres');
const actualizar = [objeto, sinExtras(campos),
  body('nombre').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'ventas', 'bodeguero']),
  body('activo').optional().isBoolean(),
  body('fechaNacimiento').optional().isISO8601({ strict: true }).custom(v => { const d = new Date(v); if (d > new Date() || d < new Date('1900-01-01')) throw Error('Fecha fuera de rango'); return true; }),
  body('sexo').optional().isIn(['femenino', 'masculino', 'otro', 'prefiero_no_decir']),
  body('ciudad').optional().isString().trim().isLength({ min: 2, max: 100 }), validar];
const listar = [query('role').optional().isIn(['admin', 'ventas', 'bodeguero']), query('activo').optional().isIn(['true', 'false']), query('buscar').optional().isString().isLength({ max: 100 }), validar];
const passwordAdmin = [objeto, sinExtras(['password']), clave, validar];
const passwordPropio = [objeto, sinExtras(['passwordActual', 'password']), body('passwordActual').isString().notEmpty(), clave, validar];
module.exports = { actualizar, listar, passwordAdmin, passwordPropio };
