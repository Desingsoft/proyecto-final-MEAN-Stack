/** Contratos de escritura: lista blanca para impedir campos de control inyectados. */
const { body, param } = require('express-validator');
const { aplicar } = require('./validacionesComerciales');
const permitir = (...campos) => body().custom(valor => {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Se requiere un objeto JSON');
  const extras = Object.keys(valor).filter(k => !campos.includes(k));
  if (extras.length) throw new Error(`Campos no permitidos: ${extras.join(', ')}`);
  return true;
});
const id = campo => body(campo).isMongoId().withMessage(`${campo} debe ser un identificador válido`);
const importe = body('monto').isFloat({ gt: 0, max: 1e12 }).withMessage('monto debe ser positivo');
const pago = (campo) => aplicar(
  permitir(campo, 'monto', 'metodo', 'fecha', 'referencia', 'nota'), id(campo), importe,
  body('metodo').optional().isString().isLength({ min: 1, max: 40 }),
  body('referencia').optional().isString().isLength({ max: 160 }),
  body('nota').optional().isString().isLength({ max: 1000 })
);
const devolucion = aplicar(
  permitir('pedidoId', 'motivo', 'nota', 'items', 'reembolso'), id('pedidoId'),
  body('motivo').isString().trim().isLength({ min: 3, max: 500 }),
  body('nota').optional().isString().isLength({ max: 1000 }),
  body('items').isArray({ min: 1, max: 200 }),
  body('items.*').isObject(),
  body('items.*.cantidad').isInt({ min: 1, max: 1000000 }),
  body('items.*').custom(item => {
    const permitidos = ['producto', 'cantidad', 'estado', 'bodega', 'motivo'];
    if (Object.keys(item).some(k => !permitidos.includes(k))) throw new Error('Campo no permitido en producto devuelto');
    return true;
  })
);
const documento = aplicar(
  permitir('pedidoId', 'tipo', 'formaPago', 'diasCredito', 'notas', 'ivaPorcentaje', 'metodoPago', 'referenciaPago', 'forzarCupo'),
  id('pedidoId'), body('tipo').isIn(['factura', 'remision']),
  body('formaPago').optional().isIn(['contado', 'credito']),
  body('diasCredito').optional().isInt({ min: 0, max: 3650 }),
  body('ivaPorcentaje').optional().isFloat({ min: 0, max: 100 }),
  body('forzarCupo').optional().isBoolean(),
  body('notas').optional().isString().isLength({ max: 2000 })
);
const anulacion = aplicar(permitir('motivo'), body('motivo').isString().trim().isLength({ min: 3, max: 1000 }));
module.exports = { pago, devolucion, documento, anulacion };
