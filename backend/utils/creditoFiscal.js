/** Asignación acumulada de una línea fiscal. Cada componente se limita al valor histórico. */
const CAMPOS = ['descuentoValor', 'base', 'ivaValor'];
const entero = (n) => Number.isSafeInteger(n) && n >= 0;
function asignarCredito(origen, unidadesPrevias, unidadesNuevas) {
  const totalUnidades = Number(origen.cantidad);
  if (!entero(totalUnidades) || totalUnidades === 0 || !entero(unidadesPrevias) ||
      !entero(unidadesNuevas) || unidadesPrevias + unidadesNuevas > totalUnidades) {
    throw new Error('Cantidad acumulada fuera del histórico facturado');
  }
  const resultado = {};
  for (const campo of CAMPOS) {
    const valor = Number(origen[campo]);
    if (!entero(valor)) throw new Error('Importe fiscal histórico inválido');
    // Diferencia de acumulados: una devolución final recibe exactamente el remanente.
    resultado[campo] = Math.round(valor * (unidadesPrevias + unidadesNuevas) / totalUnidades) -
      Math.round(valor * unidadesPrevias / totalUnidades);
  }
  resultado.total = resultado.base + resultado.ivaValor;
  return resultado;
}
module.exports = { asignarCredito };
