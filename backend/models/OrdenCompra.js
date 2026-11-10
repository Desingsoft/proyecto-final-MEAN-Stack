/**
 * Archivo: OrdenCompra.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const ordenCompraSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor', required: true },
  items: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidad: { type: Number, required: true, min: 1 },
    cantidadRecibida: { type: Number, default: 0, min: 0 },
    costoUnitario: { type: Number, required: true, min: 0 }
  }],
  total: { type: Number, required: true, default: 0 },
  estado: {
    type: String,
    enum: ['borrador', 'enviada', 'parcial', 'recibida', 'cancelada'],
    default: 'borrador'
  },
  notas: { type: String, default: '' },
  // Cuentas por pagar: lo que se debe es el valor de lo recibido; lo pagado se recalcula desde los egresos vigentes.
  facturaProveedor: { type: String, default: '' },
  fechaVencimientoPago: { type: Date },
  pagado: { type: Number, default: 0 },
  fechaEsperada: { type: Date },
  enviadaEn: { type: Date },
  recepciones: [{
    fecha: { type: Date, default: Date.now },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    nota: { type: String, default: '' },
    bodega: { type: mongoose.Schema.Types.ObjectId, ref: 'Bodega' },
    items: [{
      producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
      cantidad: { type: Number }
    }]
  }],
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', index: true },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('OrdenCompra', ordenCompraSchema);
