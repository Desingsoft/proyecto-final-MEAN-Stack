/** Reglas puras para detectar anomalías sin modificar existencias. */
function evaluarExistencias(productos, existencias, bodegas) {
  const mapaProductos = new Map(productos.map(p => [String(p._id), p]));
  const mapaBodegas = new Map(bodegas.map(b => [String(b._id), b]));
  const acumulados = new Map();
  const hallazgos = [];
  const claves = new Set();
  for (const e of existencias) {
    const producto = String(e.producto), bodega = String(e.bodega);
    const clave = `${producto}:${bodega}`;
    const duplicada = claves.has(clave);
    if (duplicada) hallazgos.push({ codigo: 'EXISTENCIA_DUPLICADA', producto, bodega });
    claves.add(clave);
    if (!mapaProductos.has(producto)) hallazgos.push({ codigo: 'PRODUCTO_INEXISTENTE', producto, bodega });
    if (!mapaBodegas.has(bodega)) hallazgos.push({ codigo: 'BODEGA_INEXISTENTE', producto, bodega });
    else if (!mapaBodegas.get(bodega).sucursal) hallazgos.push({ codigo: 'BODEGA_SIN_SUCURSAL', producto, bodega });
    const cantidad = Number(e.cantidad);
    if (!Number.isSafeInteger(cantidad) || cantidad < 0) hallazgos.push({ codigo: 'CANTIDAD_INVALIDA', producto, bodega, cantidad: e.cantidad });
    else if (!duplicada && mapaProductos.has(producto) && mapaBodegas.has(bodega))
      acumulados.set(producto, (acumulados.get(producto) || 0) + cantidad);
  }
  for (const p of productos) {
    const producto = String(p._id), global = Number(p.stock), ubicado = acumulados.get(producto) || 0;
    if (!Number.isSafeInteger(global) || global < 0) hallazgos.push({ codigo: 'STOCK_GLOBAL_INVALIDO', producto, stock: p.stock });
    else if (global !== ubicado) hallazgos.push({ codigo: 'DIFERENCIA_GLOBAL_BODEGAS', producto, global, ubicado, diferencia: global - ubicado });
  }
  return { productos: productos.length, existencias: existencias.length, bodegas: bodegas.length, hallazgos };
}
module.exports = { evaluarExistencias };
