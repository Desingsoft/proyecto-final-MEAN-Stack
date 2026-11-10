/**
 * Archivo: preciosCotizados.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
/**
 * Compara dos listas sin depender del orden. Rechaza productos duplicados para
 * impedir que una misma referencia se facture con cantidades inconsistentes.
 */
function validarLineasCotizadas(solicitadas, aprobadas) {
  if (!Array.isArray(solicitadas) || !Array.isArray(aprobadas) || solicitadas.length !== aprobadas.length || !aprobadas.length) return false;
  const a = new Map();
  for (const item of aprobadas) {
    const clave = String(item.producto);
    if (a.has(clave) || !Number.isInteger(item.cantidad) || item.cantidad <= 0 || !Number.isFinite(item.precioUnitario) || item.precioUnitario < 0) return false;
    a.set(clave, item.cantidad);
  }
  const vistos = new Set();
  return solicitadas.every(item => {
    const clave = String(item.producto);
    if (vistos.has(clave) || !Number.isInteger(item.cantidad) || a.get(clave) !== item.cantidad) return false;
    vistos.add(clave);
    return true;
  });
}

/** Calcula el total aprobado y comprueba que no se haya alterado el importe. */
function calcularTotalCotizado(cotizacion) {
  const esperado = Math.round(cotizacion.subtotal * (1 - cotizacion.descuentoPorcentaje / 100) * 100) / 100;
  if (!Number.isFinite(cotizacion.total) || Math.abs(esperado - cotizacion.total) > 0.01) {
    throw { status: 409, mensaje: 'El total de la cotización no coincide con el descuento aprobado' };
  }
  return cotizacion.total;
}
module.exports = { validarLineasCotizadas, calcularTotalCotizado };
