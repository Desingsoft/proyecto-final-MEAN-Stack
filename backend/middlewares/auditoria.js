/**
 * Archivo: auditoria.js
 * Propósito: Middleware Express: aplica controles transversales a las solicitudes.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const Auditoria = require('../models/Auditoria');
// Registra operaciones de escritura después de responder; fallos de auditoría no bloquean la API.
module.exports = (req,res,next) => {
  if (!['POST','PUT','PATCH','DELETE'].includes(req.method) || req.path.startsWith('/auth/')) return next();
  res.on('finish', () => {
    if (!req.usuario?.id) return;
    Auditoria.create({usuario:req.usuario.id,metodo:req.method,ruta:req.originalUrl,estado:res.statusCode,ip:req.ip}).catch(error=>console.error('Auditoría:',error.message));
  });
  next();
};
