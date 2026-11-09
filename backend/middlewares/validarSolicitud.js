/**
 * Recoge los errores generados por express-validator y devuelve HTTP 422.
 * No expone el cuerpo original ni información sensible en las respuestas.
 */
const { validationResult } = require('express-validator');

module.exports = function validarSolicitud(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();
  return res.status(422).json({
    mensaje: 'Los datos enviados no son válidos',
    errores: resultado.array({ onlyFirstError: true }).map(({ path, msg }) => ({ campo: path, mensaje: msg }))
  });
};
