/**
 * Middleware central de errores de Express.
 * Evita exponer mensajes de excepciones, trazas y datos internos a clientes.
 * Los errores operacionales se comunican con un mensaje público controlado.
 * Los detalles técnicos se registran solo en el servidor.
 */
const mongoose = require('mongoose');

/**
 * @param {Error & {status?: number, statusCode?: number, mensaje?: string}} err Error capturado.
 * @param {import('express').Request} req Solicitud original.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {import('express').NextFunction} next Requerido por la firma de Express.
 */
module.exports = function errorHandler(err, req, res, next) {
  // Evita responder dos veces si el servidor ya inició la respuesta.
  if (res.headersSent) return next(err);

  // No incluir tokens, contraseñas ni cuerpos de solicitudes en el registro.
  console.error('[API_ERROR]', { metodo: req.method, ruta: req.originalUrl, nombre: err.name, mensaje: err.message });

  // Errores conocidos de validación y conversión de identificadores de MongoDB.
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ mensaje: 'Datos de solicitud inválidos' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ mensaje: 'Ya existe un registro con esos datos' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ mensaje: 'Solicitud demasiado grande' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ mensaje: 'JSON inválido' });
  }

  // Solo códigos 4xx explícitos pueden publicar mensajes de negocio.
  const codigo = Number(err.status || err.statusCode);
  if (Number.isInteger(codigo) && codigo >= 400 && codigo < 500) {
    return res.status(codigo).json({ mensaje: err.mensaje || 'Solicitud no válida' });
  }
  return res.status(500).json({ mensaje: 'Error interno del servidor' });
};
