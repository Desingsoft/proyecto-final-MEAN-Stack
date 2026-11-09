/** Autorización de dos niveles: rol base y restricciones individuales opcionales.
 * `permisos` vacío conserva los permisos estándar del rol para usuarios antiguos.
 * Una lista no vacía funciona como lista de permisos permitidos DENTRO del rol.
 * Nunca se aceptan permisos de la solicitud HTTP ni del contenido JWT sin consultar BD.
 */
const { permiteRol } = require('./rolesPermisos');
module.exports = (accion) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ mensaje: 'Autenticación requerida' });
  if (!permiteRol(req.usuario.role, accion)) return res.status(403).json({ mensaje: 'Permiso insuficiente' });
  const restricciones = req.usuario.permisos || [];
  if (req.usuario.role !== 'admin' && restricciones.length && !restricciones.includes(accion)) {
    return res.status(403).json({ mensaje: 'Permiso insuficiente' });
  }
  return next();
};
