/**
 * Política de titularidad financiera. Para ventas, el vínculo de autorización es
 * Pago -> Documento -> Pedido -> creadoPor, o Devolución -> Pedido -> creadoPor.
 * Nunca se confía en el ID del usuario enviado por el navegador.
 * Registros históricos sin creadoPor solo son accesibles por administración.
 */
const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Documento = require('../models/Documento');
const Pago = require('../models/Pago');
const Devolucion = require('../models/Devolucion');
const { esVentas, pedidoAutorizado } = require('./autorizacionRegistro');
const ocultar = (res) => res.status(404).json({ mensaje: 'Registro no encontrado' });

/** Devuelve identificadores de pedidos que pertenecen al vendedor autenticado. */
async function pedidosPropios(req) {
  if (!esVentas(req)) return null;
  return Pedido.find({ creadoPor: req.usuario.id }).distinct('_id');
}
/** Devuelve documentos relacionados con pedidos del vendedor. */
async function documentosPropios(req) {
  const pedidos = await pedidosPropios(req);
  if (pedidos === null) return null;
  return Documento.find({ pedido: { $in: pedidos } }).distinct('_id');
}
async function permitirDocumentoFinanciero(req, res, next) {
  try {
    if (!esVentas(req)) return next();
    const id = req.params.id || req.body?.documentoId;
    if (!mongoose.isValidObjectId(id)) return ocultar(res);
    const docs = await documentosPropios(req);
    if (!docs.some((d) => String(d) === String(id))) return ocultar(res);
    next();
  } catch (err) { next(err); }
}
async function permitirPago(req, res, next) {
  try {
    if (!esVentas(req)) return next();
    const pago = await Pago.findById(req.params.id).select('documento tipo').lean();
    if (!pago || !pago.documento || pago.tipo === 'egreso') return ocultar(res);
    const docs = await documentosPropios(req);
    if (!docs.some((d) => String(d) === String(pago.documento))) return ocultar(res);
    next();
  } catch (err) { next(err); }
}
async function permitirDevolucion(req, res, next) {
  try {
    if (!esVentas(req)) return next();
    const dev = await Devolucion.findById(req.params.id).select('pedido').lean();
    if (!dev || !await pedidoAutorizado(req, dev.pedido)) return ocultar(res);
    next();
  } catch (err) { next(err); }
}
async function permitirPedidoDevolucion(req, res, next) {
  try {
    if (esVentas(req) && !await pedidoAutorizado(req, req.params.pedidoId || req.body?.pedidoId)) return ocultar(res);
    next();
  } catch (err) { next(err); }
}
async function permitirClienteCartera(req, res, next) {
  try {
    if (!esVentas(req)) return next();
    const docs = await documentosPropios(req);
    const existe = await Documento.exists({ _id: { $in: docs }, clienteRef: req.params.clienteId });
    if (!existe) return ocultar(res);
    next();
  } catch (err) { next(err); }
}
module.exports = { pedidosPropios, documentosPropios, permitirDocumentoFinanciero, permitirPago, permitirDevolucion, permitirPedidoDevolucion, permitirClienteCartera };
