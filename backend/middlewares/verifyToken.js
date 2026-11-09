/**
 * Archivo: verifyToken.js
 * Propósito: Middleware Express: aplica controles transversales a las solicitudes.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');


module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ mensaje: 'Token requerido' });

  // Exigir el formato exacto Bearer para evitar tokens vacíos o mal formados.
  const coincidencia = /^Bearer ([^\s]+)$/i.exec(authHeader);
  if (!coincidencia) return res.status(401).json({ mensaje: 'Encabezado de autorización inválido' });
  const token = coincidencia[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Comprobar estado y versión evita usar tokens de cuentas desactivadas.
    const usuario = await Usuario.findById(payload.id).select('activo role permisos versionToken');
    if (!usuario || !usuario.activo || (payload.version || 0) !== (usuario.versionToken || 0)) {
      return res.status(401).json({ mensaje: 'Sesión revocada' });
    }
    req.usuario = { ...payload, role: usuario.role, permisos: usuario.permisos || [] };
    return next();
  } catch (error) {
    // Un fallo de MongoDB no es un token inválido: remitir al gestor de errores.
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError' && error.name !== 'NotBeforeError') {
      return next(error);
    }
    // 401 = la sesión no es válida (token inválido o vencido): el frontend cierra la sesión.
    // 403 se reserva para falta de permisos por rol (ver checkRole).
    res.status(401).json({ mensaje: 'Sesión expirada o token inválido. Inicia sesión de nuevo.' });
  }
};
