/**
 * Archivo: Documento.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

// Remisión o factura emitida a partir de un pedido. Guarda una "foto" de los datos de la empresa,
// del cliente y de las líneas en el momento de emitirla, para que el documento no cambie después.
const documentoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['factura', 'remision', 'nota_credito'], required: true },
  numero: { type: String, required: true, unique: true },
  consecutivo: { type: Number, required: true },
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  clienteRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  empresa: {
    nombreEmpresa: String, nit: String, direccion: String, ciudad: String, telefono: String, email: String
  },
  cliente: {
    nombre: { type: String, required: true },
    tipoDocumento: String, documento: String, direccion: String, ciudad: String, telefono: String, email: String
  },
  items: [{
    sku: String,
    descripcion: String,
    cantidad: Number,
    precioUnitario: Number,
    subtotal: Number,
    // Instantánea fiscal por renglón: nunca recalcular desde el catálogo.
    descuentoValor: Number, base: Number, ivaPorcentaje: Number,
    ivaValor: Number, total: Number
  }],
  subtotalBruto: { type: Number, required: true },
  descuentoPorcentaje: { type: Number, default: 0 },
  descuentoValor: { type: Number, default: 0 },
  base: { type: Number, required: true },
  ivaPorcentaje: { type: Number, default: 0 },
  ivaValor: { type: Number, default: 0 },
  total: { type: Number, required: true },
  preciosIncluyenIva: { type: Boolean, default: true },
  formaPago: { type: String, enum: ['contado', 'credito'], default: 'contado' },
  // Cartera (solo facturas): lo abonado y el estado de cobro. Se recalculan desde los pagos vigentes.
  pagado: { type: Number, default: 0 },
  acreditado: { type: Number, default: 0 },    // suma de las notas crédito vigentes que afectan esta factura
  reembolsado: { type: Number, default: 0 },   // dinero devuelto al cliente por esta factura
  estadoPago: { type: String, enum: ['pendiente', 'parcial', 'pagada', 'acreditada'] },
  // Solo en notas crédito: la factura que corrige y la devolución que la originó.
  facturaOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'Documento' },
  numeroOrigen: { type: String },
  devolucion: { type: mongoose.Schema.Types.ObjectId, ref: 'Devolucion' },
  motivoDevolucion: { type: String },
  fechaVencimiento: { type: Date },
  notas: { type: String, default: '' },
  notaLegal: { type: String, default: '' },
  estado: { type: String, enum: ['emitida', 'anulada'], default: 'emitida' },
  anuladaEn: { type: Date },
  motivoAnulacion: { type: String },
  emitidoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('Documento', documentoSchema);
