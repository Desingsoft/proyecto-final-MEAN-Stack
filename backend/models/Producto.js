/**
 * Archivo: Producto.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  categoria: { type: String },
  // Código EAN/UPC o interno para lectores de códigos de barras.
  codigoBarras: { type: String, trim: true, sparse: true, unique: true },
  // Código EAN/UPC o interno para lectores de códigos de barras.
  precio: { type: Number, required: true },
  costo: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  stockMinimo: { type: Number, default: 5 },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor' },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);
