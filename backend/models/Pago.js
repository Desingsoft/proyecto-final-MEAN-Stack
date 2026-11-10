/**
 * Archivo: Pago.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

// Un abono recibido de un cliente (cobro, recibo de caja RC-0001)
// o un pago hecho a un proveedor (egreso, comprobante CE-0001).
const pagoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['cobro', 'egreso', 'reembolso'], required: true },   // reembolso: dinero devuelto a un cliente
  numero: { type: String, required: true, unique: true },
  // Identificador enviado por el cliente para impedir doble contabilización por reintentos HTTP.
  claveIdempotencia: { type: String, trim: true, maxlength: 128 },
  huellaSolicitud: { type: String, trim: true, match: /^[a-f0-9]{64}$/ },
  documento: { type: mongoose.Schema.Types.ObjectId, ref: 'Documento' },     // factura (cobros y reembolsos)
  orden: { type: mongoose.Schema.Types.ObjectId, ref: 'OrdenCompra' },       // orden de compra (egresos)
  clienteRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor' },
  contraparte: { type: String, required: true },       // nombre del cliente o proveedor, tal como estaba al registrar
  referenciaDocumento: { type: String, default: '' },  // número de la factura u orden
  monto: { type: Number, required: true, min: 1 },
  fecha: { type: Date, default: Date.now },
  metodo: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'], default: 'efectivo' },
  referencia: { type: String, default: '' },           // número de transferencia, cheque, etc.
  nota: { type: String, default: '' },
  estado: { type: String, enum: ['vigente', 'anulado'], default: 'vigente' },
  anuladoEn: { type: Date },
  motivoAnulacion: { type: String },
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', index: true },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

// Índice parcial: los pagos antiguos sin clave no entran en la restricción.
pagoSchema.index({ claveIdempotencia: 1 }, { unique: true, partialFilterExpression: { claveIdempotencia: { $type: 'string' } } });
pagoSchema.index({ documento: 1, estado: 1 });
pagoSchema.index({ orden: 1, estado: 1 });

module.exports = mongoose.model('Pago', pagoSchema);
