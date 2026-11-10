/** Conciliación de transferencias contra movimientos y existencias (solo lectura).
 * No reconstruye saldos de apertura: los movimientos anteriores a la migración pueden faltar.
 */
const id = value => value == null ? '' : String(value);
const entero = value => Number.isSafeInteger(value) && value >= 0;

function conciliarTransferencias(transferencias, movimientos, existencias) {
  const hallazgos = [];
  const mapaMovimientos = new Map();
  const mapaExistencias = new Map();
  for (const e of existencias) {
    const clave = `${id(e.producto)}:${id(e.bodega)}`;
    if (mapaExistencias.has(clave)) hallazgos.push({ codigo: 'EXISTENCIA_DUPLICADA', producto: id(e.producto), bodega: id(e.bodega) });
    mapaExistencias.set(clave, e);
  }
  for (const m of movimientos) {
    if (!m.transferenciaId) continue;
    const clave = id(m.transferenciaId);
    if (!mapaMovimientos.has(clave)) mapaMovimientos.set(clave, []);
    mapaMovimientos.get(clave).push(m);
  }
  const idsTransferencias = new Set();
  for (const t of transferencias) {
    const tid = id(t._id);
    if (idsTransferencias.has(tid)) { hallazgos.push({ codigo: 'TRANSFERENCIA_DUPLICADA', transferencia: tid }); continue; }
    idsTransferencias.add(tid);
    if (!Number.isSafeInteger(t.cantidad) || t.cantidad <= 0 || id(t.origen) === id(t.destino)) {
      hallazgos.push({ codigo: 'TRANSFERENCIA_INVALIDA', transferencia: tid });
      continue;
    }
    const asociados = mapaMovimientos.get(tid) || [];
    const salidas = asociados.filter(m => m.tipo === 'salida');
    const entradas = asociados.filter(m => m.tipo === 'entrada');
    if (salidas.length !== 1 || entradas.length !== 1 || asociados.length !== 2)
      hallazgos.push({ codigo: 'MOVIMIENTOS_INCOMPLETOS', transferencia: tid, salidas: salidas.length, entradas: entradas.length, total: asociados.length });
    for (const [tipo, esperada, bodega] of [['salida', salidas, t.origen], ['entrada', entradas, t.destino]]) {
      for (const m of esperada) {
        if (id(m.producto) !== id(t.producto) || id(m.bodega) !== id(bodega) || m.cantidad !== t.cantidad)
          hallazgos.push({ codigo: 'MOVIMIENTO_NO_COINCIDE', transferencia: tid, movimiento: id(m._id), tipo });
      }
    }
    for (const bodega of [t.origen, t.destino]) {
      const clave = `${id(t.producto)}:${id(bodega)}`;
      const existencia = mapaExistencias.get(clave);
      // La ausencia de existencia es anomalía de ubicación, no prueba de que el saldo sea incorrecto.
      if (!existencia) hallazgos.push({ codigo: 'EXISTENCIA_NO_LOCALIZADA', transferencia: tid, bodega: id(bodega) });
      else if (!entero(existencia.cantidad)) hallazgos.push({ codigo: 'SALDO_INVALIDO', transferencia: tid, bodega: id(bodega) });
    }
  }
  for (const [tid, registros] of mapaMovimientos) {
    if (!idsTransferencias.has(tid)) hallazgos.push({ codigo: 'MOVIMIENTO_HUERFANO', transferencia: tid, movimientos: registros.length });
  }
  return { transferencias: transferencias.length, movimientosTransferencia: [...mapaMovimientos.values()].reduce((n, a) => n + a.length, 0), hallazgos };
}
module.exports = { conciliarTransferencias };
