/**
 * Archivo: consecutivos.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

// Contadores atómicos para numerar documentos: OC-0001, FV-0001, RM-0001...
const Contador = mongoose.models.Contador || mongoose.model(
  'Contador',
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } })
);

const siguiente = async (nombre, session) => {
  const doc = await Contador.findOneAndUpdate(
    { _id: nombre },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session: session || undefined }
  );
  return doc.seq;
};

const formatear = (prefijo, numero) => `${prefijo}-${String(numero).padStart(4, '0')}`;

module.exports = { Contador, siguiente, formatear };
