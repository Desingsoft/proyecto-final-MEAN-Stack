/**
 * Archivo: Configuracion.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

// Datos de la empresa y reglas de facturación. Es un único documento (_id: 'general').
const configuracionSchema = new mongoose.Schema({
  _id: { type: String, default: 'general' },
  nombreEmpresa: { type: String, default: 'Mi Empresa' },
  nit: { type: String, default: '' },
  direccion: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  telefono: { type: String, default: '' },
  email: { type: String, default: '' },
  ivaPorcentaje: { type: Number, default: 19, min: 0, max: 100 },
  preciosIncluyenIva: { type: Boolean, default: true },
  prefijoFactura: { type: String, default: 'FV' },
  prefijoRemision: { type: String, default: 'RM' },
  prefijoOrdenCompra: { type: String, default: 'OC' },
  prefijoRecibo: { type: String, default: 'RC' },
  prefijoEgreso: { type: String, default: 'CE' },
  prefijoNotaCredito: { type: String, default: 'NC' },
  prefijoDevolucion: { type: String, default: 'DV' },
  prefijoReembolso: { type: String, default: 'RE' },
  diasCreditoDefecto: { type: Number, default: 30, min: 0 },
  notaFactura: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Configuracion', configuracionSchema);
