/**
 * Autorización de escritura por sucursal. La sede se deriva de registros
 * persistidos (bodega/pedido/documento), nunca de una afirmación del cliente.
 * Fail closed para registros históricos sin sede; no altera datos históricos.
 */
const mongoose = require('mongoose');
const { cargar } = require('./alcanceSucursal');
const Pedido = require('../models/Pedido');
const Documento = require('../models/Documento');
const Bodega = require('../models/Bodega');
const ocultar = res => res.status(404).json({ mensaje: 'Registro no encontrado' });
const valido = id => mongoose.isValidObjectId(id);
function permitido(req, sucursal) {
  return req.alcanceSucursales === null ||
    Boolean(sucursal && (req.alcanceSucursales || []).includes(String(sucursal)));
}
/** Resuelve la bodega indicada al crear pedidos o registrar inventario. */
function porBodega(campo = 'bodegaId') {
  return [cargar, async (req, res, next) => {
    try {
      if (req.alcanceSucursales === null) return next();
      const id = req.body?.[campo];
      if (!valido(id)) return res.status(422).json({ mensaje: 'Bodega válida obligatoria para la sede' });
      const bodega = await Bodega.findById(id).select('sucursal activa').lean();
      if (!bodega?.activa || !permitido(req, bodega.sucursal)) return ocultar(res);
      req.sucursalOperacion = bodega.sucursal;
      next();
    } catch (error) { next(error); }
  }];
}
/** Comprueba el pedido indicado en el body o en la URL. */
function porPedido(campo = 'pedidoId', origen = 'body') {
  return [cargar, async (req, res, next) => {
    try {
      if (req.alcanceSucursales === null) return next();
      const id = req[origen]?.[campo];
      if (!valido(id)) return ocultar(res);
      const pedido = await Pedido.findById(id).select('sucursal').lean();
      if (!pedido || !permitido(req, pedido.sucursal)) return ocultar(res);
      req.sucursalOperacion = pedido.sucursal;
      next();
    } catch (error) { next(error); }
  }];
}
/** Comprueba el documento financiero y el pedido de origen. */
function porDocumento(campo = 'documentoId', origen = 'body') {
  return [cargar, async (req, res, next) => {
    try {
      if (req.alcanceSucursales === null) return next();
      const id = req[origen]?.[campo];
      if (!valido(id)) return ocultar(res);
      const doc = await Documento.findById(id).select('pedido').lean();
      if (!doc?.pedido) return ocultar(res);
      const pedido = await Pedido.findById(doc.pedido).select('sucursal').lean();
      if (!pedido || !permitido(req, pedido.sucursal)) return ocultar(res);
      req.sucursalOperacion = pedido.sucursal;
      next();
    } catch (error) { next(error); }
  }];
}
module.exports = { porBodega, porPedido, porDocumento };
