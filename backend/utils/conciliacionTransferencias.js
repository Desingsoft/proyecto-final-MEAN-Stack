/** Funciones puras para diagnosticar transferencias sin modificar inventarios. */
function evaluarTransferencia(transferencia, movimientos) {
  const errores = [];
  const vinculados = movimientos.filter(m => String(m.transferenciaId) === String(transferencia._id));
  const salidas = vinculados.filter(m => m.tipo === 'salida');
  const entradas = vinculados.filter(m => m.tipo === 'entrada');
  if (salidas.length !== 1 || entradas.length !== 1) errores.push('PAR_MOVIMIENTOS_INCOMPLETO');
  for (const [tipo, lista, bodega] of [['salida', salidas, transferencia.origen], ['entrada', entradas, transferencia.destino]]) {
    for (const m of lista) {
      if (String(m.producto) !== String(transferencia.producto) || String(m.bodega) !== String(bodega) || m.cantidad !== transferencia.cantidad)
        errores.push('MOVIMIENTO_' + tipo.toUpperCase() + '_INCONSISTENTE');
    }
  }
  return { transferenciaId: String(transferencia._id), errores: [...new Set(errores)], correcto: errores.length === 0 };
}
module.exports = { evaluarTransferencia };
