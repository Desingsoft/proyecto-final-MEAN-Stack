/**
 * Archivo: Cliente.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  tipoDocumento: { type: String, enum: ['NIT', 'CC', 'CE', 'Pasaporte', 'Otro'], default: 'CC' },
  documento: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  telefono: { type: String, trim: true, default: '' },
  direccion: { type: String, trim: true, default: '' },
  ciudad: { type: String, trim: true, default: '' },
  diasCredito: { type: Number, min: 0 },              // si no se indica, se usa el de la configuración
  cupoCredito: { type: Number, min: 0, default: 0 },  // 0 = sin límite
  notas: { type: String, default: '' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

clienteSchema.index({ nombre: 1 });

module.exports = mongoose.model('Cliente', clienteSchema);
