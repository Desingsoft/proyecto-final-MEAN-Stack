/** Contrato de entrada para clientes; prohíbe cambios de campos internos. */
const { body, query } = require('express-validator');
const validar = require('./validarSolicitud');
const { objeto } = require('./validacionesComerciales');
const permitidos = ['nombre','tipoDocumento','documento','email','telefono','direccion','ciudad','notas','diasCredito','cupoCredito'];
const reglas = [objeto, body().custom(v => {
  if (Object.keys(v || {}).some(k => !permitidos.includes(k))) throw Error('Campos no permitidos');
  return true;
}),
  body('nombre').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('email').optional({ values: 'falsy' }).isEmail(),
  ...['tipoDocumento','documento','telefono','direccion','ciudad','notas'].map(c => body(c).optional({ values: 'falsy' }).isString().isLength({ max: c === 'notas' ? 1000 : 200 })),
  body('diasCredito').optional({ values: 'falsy' }).isInt({ min: 0, max: 3650 }),
  body('cupoCredito').optional({ values: 'falsy' }).isFloat({ min: 0, max: 1e12 })];
module.exports = { crear: [...reglas, body('nombre').exists().notEmpty(), validar], actualizar: [...reglas, validar], listar: [query('pagina').optional().isInt({ min: 1, max: 100000 }), query('limite').optional().isInt({ min: 1, max: 100 }), query('buscar').optional().isString().isLength({ max: 100 }), validar] };
