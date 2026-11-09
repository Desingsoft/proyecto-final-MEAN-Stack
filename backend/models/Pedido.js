/**
 * Archivo: Pedido.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
  // Identificador de origen único: evita pedidos duplicados de una misma cotización.
  cotizacionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion', unique: true, sparse: true },
  cliente: { type: String, required: true },
  clienteRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  items: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    cantidad: { type: Number, required: true },
    precioUnitario: { type: Number, required: true },
    // Bodega de la que se despachó; se usa al cancelar para reponer en la misma ubicación.
    bodega: { type: mongoose.Schema.Types.ObjectId, ref: 'Bodega' }
  }],
  // Fotografía comercial: estos importes no deben recalcularse desde el catálogo.
  subtotal: { type: Number },
  descuentoValor: { type: Number, default: 0 },
  ivaPorcentaje: { type: Number, default: 0 },
  ivaValor: { type: Number, default: 0 },
  preciosIncluyenIva: { type: Boolean, default: true },
  descuentoPorcentaje: { type: Number, default: 0, min: 0, max: 100 },
  total: { type: Number, required: true },
  estado: {
    type: String,
    enum: ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'],
    default: 'pendiente'
  },
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('Pedido', pedidoSchema);
