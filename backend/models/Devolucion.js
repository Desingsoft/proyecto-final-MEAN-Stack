/**
 * Archivo: Devolucion.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

// Devolución de productos de un pedido. Si el pedido tiene factura vigente, genera una nota crédito.
const devolucionSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  // Identificador del intento lógico enviado por Angular; índice único para reintentos.
  claveIdempotencia: { type: String, trim: true, maxlength: 128 },
  // SHA-256 del cuerpo lógico; impide reutilizar una clave con otro contenido.
  huellaSolicitud: { type: String, match: /^[a-f0-9]{64}$/ },
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  clienteRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  cliente: { type: String, required: true },             // nombre del cliente al momento de la devolución
  items: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    sku: String,
    descripcion: String,
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true },    // el precio al que se vendió
    bodega: { type: mongoose.Schema.Types.ObjectId, ref: 'Bodega' },
    reintegrar: { type: Boolean, default: true }         // true: vuelve al stock; false: dañado, se descarta
  }],
  motivo: { type: String, enum: ['defectuoso', 'error_pedido', 'no_deseado', 'garantia', 'otro'], required: true },
  nota: { type: String, default: '' },
  subtotalBruto: { type: Number, required: true },
  descuentoPorcentaje: { type: Number, default: 0 },
  valor: { type: Number, required: true },               // lo que se le reconoce al cliente (con descuento e IVA incluidos)
  notaCredito: { type: mongoose.Schema.Types.ObjectId, ref: 'Documento' },
  estado: { type: String, enum: ['vigente', 'anulada'], default: 'vigente' },
  anuladaEn: { type: Date },
  motivoAnulacion: { type: String },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

devolucionSchema.index({ pedido: 1, estado: 1 });
devolucionSchema.index({ claveIdempotencia: 1 }, { unique: true, partialFilterExpression: { claveIdempotencia: { $type: 'string' } } });

module.exports = mongoose.model('Devolucion', devolucionSchema);
