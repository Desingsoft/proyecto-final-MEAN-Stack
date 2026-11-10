/** Construye el filtro de órdenes conciliadas en el lote de egresos actual. */
function filtroOrdenesConciliadas(filtroOriginal, ids) {
  if (!Array.isArray(ids)) throw new TypeError('Se requiere un arreglo de identificadores');
  const unicos = [...new Set(ids.filter(x => x !== null && x !== undefined && String(x).trim()).map(String))];
  return { ...filtroOriginal, _id: { $in: unicos } };
}
function idsConciliadosEnLote(ordenes) {
  return new Set(ordenes.map(o => String(o._id)));
}
module.exports = { filtroOrdenesConciliadas, idsConciliadosEnLote };
