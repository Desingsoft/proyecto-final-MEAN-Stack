/**
 * Archivo: checkRole.js
 * Propósito: Middleware Express: aplica controles transversales a las solicitudes.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
module.exports = (rolesPermitidos) => (req, res, next) => {
  if (!rolesPermitidos.includes(req.usuario.role)) {
    return res.status(403).json({ mensaje: 'No autorizado para esta acción' });
  }
  next();
};
