/** Resumen operativo por sede: pedidos e inventario de bodegas de esa sucursal. */
const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Bodega = require('../models/Bodega');
const Existencia = require('../models/Existencia');
module.exports = async (req, res, next) => {
  try {
    const id = req.query.sucursal;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ mensaje: 'Indica una sucursal válida' });
    if (req.alcanceSucursales !== null && !req.alcanceSucursales.includes(String(id)))
      return res.status(404).json({ mensaje: 'Sucursal no encontrada' });
    const bodegas = await Bodega.find({ sucursal: id }).select('_id nombre').lean();
    const ids = bodegas.map(b => b._id);
    const [pedidos, existencias] = await Promise.all([
      Pedido.aggregate([
        { $match: { sucursal: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: '$estado', cantidad: { $sum: 1 }, total: { $sum: '$total' } } }
      ]),
      Existencia.aggregate([
        { $match: { bodega: { $in: ids } } },
        { $group: { _id: '$bodega', unidades: { $sum: '$cantidad' }, productos: { $sum: 1 } } }
      ])
    ]);
    res.json({ sucursal: id, pedidosPorEstado: pedidos, bodegas: bodegas.map(b => ({
      id: b._id, nombre: b.nombre,
      unidades: existencias.find(e => String(e._id) === String(b._id))?.unidades || 0,
      productos: existencias.find(e => String(e._id) === String(b._id))?.productos || 0
    })), nota: 'Totales de pedidos por estado; no equivalen a ingresos facturados.' });
  } catch (error) { next(error); }
};
