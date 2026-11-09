/**
 * Validaciones transversales de rutas comerciales con express-validator.
 * Se validan identificadores y estructuras de solicitudes sin convertir importes
 * automáticamente: los controladores siguen siendo responsables de las reglas
 * contables, concurrencia y límites transaccionales.
 */
const { body, param, header } = require('express-validator');
const validar = require('./validarSolicitud');

/** Comprueba que el cuerpo JSON sea un objeto y limita la cantidad de campos. */
const objeto = body().custom(valor => {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Se requiere un objeto JSON');
  if (Object.keys(valor).length > 60) throw new Error('Demasiados campos');
  return true;
});
const identificador = campo => param(campo).isMongoId().withMessage(`Identificador ${campo} inválido`);
const monto = campo => body(campo).optional().isFloat({ min: 0, max: 1e12 }).withMessage(`${campo} debe ser un importe no negativo`);
const porcentaje = campo => body(campo).optional().isFloat({ min: 0, max: 100 }).withMessage(`${campo} debe estar entre 0 y 100`);
const items = body('items').optional().isArray({ min: 1, max: 200 }).withMessage('Se requiere una lista válida de productos');
const claveIdempotencia = header('Idempotency-Key').exists().withMessage('Falta Idempotency-Key').bail()
  .isString().isLength({ min: 8, max: 128 }).matches(/^[a-zA-Z0-9._:-]+$/)
  .withMessage('Clave de idempotencia inválida');

/** Aplica reglas a rutas específicas; no reemplaza el middleware de permisos. */
const aplicar = (...reglas) => [...reglas, validar];
module.exports = { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar };
