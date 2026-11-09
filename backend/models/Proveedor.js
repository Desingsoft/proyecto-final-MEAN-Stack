/**
 * Archivo: Proveedor.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  contacto: { type: String },
  telefono: { type: String },
  email: { type: String },
  diasEntrega: { type: Number, default: 7, min: 1, max: 180 }, // Plazo estimado de abastecimiento; distinto del crédito comercial.
  diasCredito: { type: Number, default: 30, min: 0 }, // plazo que te da este proveedor para pagarle
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Proveedor', proveedorSchema);
