/**
 * Archivo: Usuario.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'bodeguero', 'ventas'],
    default: 'ventas'
  },
  activo: { type: Boolean, default: true },
  sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', index: true },
  sucursales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal' }],
  // Datos de perfil: se guardan solo para la administración de usuarios.
  fechaNacimiento: { type: Date, default: null },
  sexo: { type: String, enum: ['femenino', 'masculino', 'otro', 'prefiero_no_decir'], default: 'prefiero_no_decir' },
  ciudad: { type: String, trim: true, maxlength: 100, default: '' },
  // Intentos fallidos y bloqueo temporal por cuenta.
  intentosFallidos: { type: Number, default: 0 },
  bloqueadoHasta: { type: Date },
  // Solo se conserva el hash del token de recuperación, nunca el token original.
  resetTokenHash: { type: String, select: false },
  resetExpira: { type: Date },
  // Revoca tokens anteriores al cambio de contraseña.
  versionToken: { type: Number, default: 0 },
  // Permisos adicionales individuales; el rol sigue siendo el límite por defecto.
  permisos: { type: [String], default: [] }
}, { timestamps: true });

usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

usuarioSchema.methods.compararPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
