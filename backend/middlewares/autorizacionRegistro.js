/**
 * Titularidad comercial: ventas solo consulta y modifica pedidos creados por sí mismo.
 * Los pedidos antiguos sin creadoPor quedan reservados al administrador hasta regularización.
 * Bodeguero puede consultar pedidos para su ejecución logística, pero no documentos fiscales.
 * Toda comprobación se realiza en el servidor; no confiar en IDs enviados por Angular.
 */
const Pedido = require('../models/Pedido');
const Documento = require('../models/Documento');
const mongoose = require('mongoose');
const esVentas = req => req.usuario?.role === 'ventas';
const filtroPedidos = req => esVentas(req) ? { creadoPor: req.usuario.id } : {};
const pedidoAutorizado = async (req, pedidoId, session) => {
  if (!mongoose.isValidObjectId(pedidoId)) return false;
  const query = Pedido.exists({ _id: pedidoId, ...filtroPedidos(req) });
  if (session) query.session(session);
  return Boolean(await query);
};
/** Evita revelar la existencia de documentos de otros vendedores (404). */
const permitirPedido = (param = 'id') => async (req, res, next) => {
  try {
    if (!esVentas(req)) return next();
    if (!await pedidoAutorizado(req, req.params[param])) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    next();
  } catch (error) { next(error); }
};
const permitirDocumento = () => async (req, res, next) => {
  try {
    if (!esVentas(req)) return next();
    const doc = await Documento.findById(req.params.id).select('pedido').lean();
    if (!doc || !await pedidoAutorizado(req, doc.pedido)) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    next();
  } catch (error) { next(error); }
};
module.exports = { esVentas, filtroPedidos, pedidoAutorizado, permitirPedido, permitirDocumento };
