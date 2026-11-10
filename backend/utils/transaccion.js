/**
 * Archivo: transaccion.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

/**
 * Ejecuta `fn(session)` dentro de una transacción de MongoDB (todo o nada).
 * Requiere un replica set. La variable PERMITIR_SIN_TRANSACCION=true existe SOLO para pruebas
 * automáticas contra bases que no soportan transacciones; no la uses con datos reales.
 */
const conTransaccion = async (fn) => {
  if (process.env.PERMITIR_SIN_TRANSACCION === 'true') {
    // Prohibido omitir atomicidad con datos reales.
    if (process.env.NODE_ENV !== 'test') throw new Error('Transacciones obligatorias fuera de pruebas');
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    let resultado;
    await session.withTransaction(async () => {
      resultado = await fn(session);
    });
    return resultado;
  } finally {
    await session.endSession();
  }
};

module.exports = { conTransaccion };
