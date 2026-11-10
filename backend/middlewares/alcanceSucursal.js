/**
 * Alcance de sucursales (fail closed): la lista de sedes se obtiene del usuario
 * persistido, nunca de un query parameter ni de datos del JWT.
 * Registros antiguos sin sucursal no se muestran a usuarios no administradores.
 */
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Pedido = require('../models/Pedido');
const Documento = require('../models/Documento');

async function cargar(req, res, next) {
  try {
    if (req.usuario?.role === 'admin') { req.alcanceSucursales = null; return next(); }
    const usuario = await Usuario.findById(req.usuario?.id).select('activo sucursal sucursales').lean();
    if (!usuario?.activo) return res.status(401).json({ mensaje: 'Sesión inválida' });
    const ids = [...new Set([...(usuario.sucursales || []), usuario.sucursal].filter(Boolean).map(String))];
    req.alcanceSucursales = ids;
    if (!ids.length) return res.status(403).json({ mensaje: 'Usuario sin sucursales asignadas' });
    const solicitada = req.query.sucursal || req.body?.sucursal;
    if (solicitada && (!mongoose.isValidObjectId(solicitada) || !ids.includes(String(solicitada))))
      return res.status(403).json({ mensaje: 'Sucursal no autorizada' });
    next();
  } catch (error) { next(error); }
}
function filtro(req) { return req.alcanceSucursales === null ? {} : { sucursal: { $in: req.alcanceSucursales || [] } }; }
/** Verificación por ID: requiere que el pedido pertenezca a una sede permitida. */
const pedido = (param = 'id') => async (req, res, next) => {
  try {
    if (req.alcanceSucursales === null) return next();
    const valor = req.params[param];
    if (!mongoose.isValidObjectId(valor) || !await Pedido.exists({ _id: valor, ...filtro(req) }))
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    next();
  } catch (error) { next(error); }
};
const documento = (param = 'id') => async (req, res, next) => {
  try {
    if (req.alcanceSucursales === null) return next();
    const valor = req.params[param];
    if (!mongoose.isValidObjectId(valor)) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    const doc = await Documento.findById(valor).select('pedido').lean();
    if (!doc || !await Pedido.exists({ _id: doc.pedido, ...filtro(req) }))
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    next();
  } catch (error) { next(error); }
};
module.exports = { cargar, filtro, pedido, documento };
