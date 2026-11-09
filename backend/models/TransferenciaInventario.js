/** Registro único de traslados: evita duplicación por reintentos de red. */
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  claveIdempotencia: { type: String, required: true, unique: true, match: /^[A-Za-z0-9_-]{16,128}$/ },
  huellaSolicitud: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  origen: { type: mongoose.Schema.Types.ObjectId, ref: 'Bodega', required: true },
  destino: { type: mongoose.Schema.Types.ObjectId, ref: 'Bodega', required: true },
  cantidad: { type: Number, required: true, min: 1 },
  motivo: { type: String, required: true },
  registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
}, { timestamps: true });
module.exports = mongoose.model('TransferenciaInventario', schema);
