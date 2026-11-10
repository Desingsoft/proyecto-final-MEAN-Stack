/** Auditoría de vínculos de egresos. No altera documentos. */
const id = value => value == null ? '' : String(value);
const montoValido = monto => typeof monto === 'number' && Number.isSafeInteger(monto) && monto > 0;
function auditarVinculosEgresos(pagos, ordenes, opciones = {}) {
  const porId = new Map(ordenes.map(o => [id(o._id), o]));
  const hallazgos = [];
  const idsYaConciliados = new Set(Array.from(opciones.ordenesConciliadas || [], id));
  for (const pago of pagos) {
    const pagoId = id(pago._id);
    const ordenId = id(pago.orden);
    const agregar = (codigo, detalle) => hallazgos.push({orden:ordenId, numero:pago.numero || '', pago:pagoId, codigo, detalle});
    // Validaciones independientes de la existencia de la orden: también cubren egresos huérfanos.
    // Las órdenes ya conciliadas se excluyen para no duplicar los hallazgos de la primera pasada.
    if (!ordenId) {
      agregar('EGRESO_SIN_ORDEN', 'Egreso sin referencia a orden de compra');
      if (!montoValido(pago.monto)) agregar('EGRESO_MONTO_INVALIDO', 'Importe ausente, cero o fuera del rango seguro');
      if (!['vigente','anulado'].includes(pago.estado)) agregar('EGRESO_ESTADO_INVALIDO', 'Estado de egreso inválido');
      continue;
    }
    const orden = porId.get(ordenId);
    if (!orden) {
      agregar('EGRESO_ORDEN_INEXISTENTE', 'La orden referenciada no existe');
      if (!montoValido(pago.monto)) agregar('EGRESO_MONTO_INVALIDO', 'Importe ausente, cero o fuera del rango seguro');
      if (!['vigente','anulado'].includes(pago.estado)) agregar('EGRESO_ESTADO_INVALIDO', 'Estado de egreso inválido');
      continue;
    }
    // Los pagos de órdenes conciliadas en la primera pasada ya se revisaron allí.
    // Solo se comprueban vínculos de órdenes fuera del filtro de órdenes, sin duplicar alertas.
    if (idsYaConciliados.has(ordenId)) continue;
    if (!montoValido(pago.monto)) agregar('EGRESO_MONTO_INVALIDO', 'Importe ausente, cero o fuera del rango seguro');
    if (!['vigente','anulado'].includes(pago.estado)) agregar('EGRESO_ESTADO_INVALIDO', 'Estado de egreso inválido');
    if (orden.sucursal && !pago.sucursal) agregar('EGRESO_SIN_SUCURSAL', 'Egreso sin sucursal para una orden con sucursal');
    if (orden.proveedor && !pago.proveedor) agregar('EGRESO_SIN_PROVEEDOR', 'Egreso sin proveedor para una orden con proveedor');
    if (orden.sucursal && pago.sucursal && id(orden.sucursal) !== id(pago.sucursal))
      agregar('EGRESO_SUCURSAL_DISTINTA', 'La sucursal del egreso difiere de la orden');
    if (orden.proveedor && pago.proveedor && id(orden.proveedor) !== id(pago.proveedor))
      agregar('EGRESO_PROVEEDOR_DISTINTO', 'El proveedor del egreso difiere de la orden');
  }
  return {resumen:{pagosRevisados:pagos.length},hallazgos};
}
module.exports = {auditarVinculosEgresos};
