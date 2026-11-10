/**
 * Archivo: stock.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Niveles de stock compartidos por productos, reposición y reportes.
//  agotado   : sin unidades
//  critico   : queda la mitad del mínimo o menos
//  bajo      : en o por debajo del mínimo
//  saludable : por encima del mínimo
const nivelStock = (stock, minimo) => {
  if (stock <= 0) return 'agotado';
  if (stock <= minimo * 0.5) return 'critico';
  if (stock <= minimo) return 'bajo';
  return 'saludable';
};

// Meta de reposición: volver al doble del mínimo.
const objetivoStock = (minimo) => Math.max(minimo * 2, 1);

const cantidadSugerida = (stock, minimo) =>
  Math.max(objetivoStock(minimo) - Math.max(stock, 0), 1);

module.exports = { nivelStock, objetivoStock, cantidadSugerida };
