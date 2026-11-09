/**
 * Archivo: MovimientoInventario.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  tipo: { type: String, enum: ['entrada', 'salida'], required: true },
  cantidad: { type: Number, required: true },
  motivo: { type: String },
  // Ubicación opcional del movimiento para rastrear su origen físico.
  bodega: { type: mongoose.Schema.Types.ObjectId, ref: 'Bodega' },
  // Pedido que originó la salida o su reversión; facilita auditoría y conciliación.
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', index: true },
  // Devolución que originó la entrada o su reversión.
  devolucion: { type: mongoose.Schema.Types.ObjectId, ref: 'Devolucion', index: true },
  // Ubicación física de origen/destino del movimiento, si aplica.
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', index: true },
  transferenciaId: { type: mongoose.Schema.Types.ObjectId, index: true },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  // Solo movimientos manuales: idempotencia para reintentos de red.
  claveIdempotencia: { type: String },
  huellaSolicitud: { type: String }
}, { timestamps: true });

// Índice parcial: no afecta movimientos automáticos anteriores sin clave.
movimientoSchema.index({ claveIdempotencia: 1 }, { unique: true, partialFilterExpression: { claveIdempotencia: { $type: 'string' } } });
module.exports = mongoose.model('MovimientoInventario', movimientoSchema);
