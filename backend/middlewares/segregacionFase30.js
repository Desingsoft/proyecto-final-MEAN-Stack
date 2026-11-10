/**
 * Fase 30: autorización conservadora para endpoints históricos globales.
 * No se debe mostrar un agregado global a un usuario limitado por sucursales.
 * Las compras todavía actualizan stock global: se bloquean para roles locales
 * hasta migrar recepciones a existencias por bodega.
 */
const mongoose = require('mongoose');
const { cargar, filtro } = require('./alcanceSucursal');
const OrdenCompra = require('../models/OrdenCompra');
const denegar = (res) => res.status(403).json({ mensaje: 'Operación global restringida hasta completar segregación por sucursal' });
const soloGlobal = [cargar, (req, res, next) => req.alcanceSucursales === null ? next() : denegar(res)];
const compra = [cargar, async (req, res, next) => {
  try {
    if (req.alcanceSucursales === null) return next();
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    const existe = await OrdenCompra.exists({ _id: id, ...filtro(req) });
    return existe ? next() : res.status(404).json({ mensaje: 'Registro no encontrado' });
  } catch (error) { next(error); }
}];
module.exports = { soloGlobal, compra };
