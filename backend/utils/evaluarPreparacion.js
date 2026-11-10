/** Evaluación pura de requisitos de operación; nunca modifica la base. */
const INDICES = [
  { coleccion: 'existencias', campos: ['producto', 'bodega'], unico: true },
  { coleccion: 'transferenciainventarios', campos: ['claveIdempotencia'], unico: true },
  { coleccion: 'movimientoinventarios', campos: ['claveIdempotencia'], unico: true, parcial: true }
];
function contieneIndice(indices, requisito) {
  return (indices || []).some(indice => indice.unique === requisito.unico &&
    requisito.campos.length === Object.keys(indice.key || {}).length &&
    requisito.campos.every(campo => indice.key[campo] === 1) &&
    (!requisito.parcial || Boolean(indice.partialFilterExpression)));
}
function evaluarPreparacion({ replicaSet, indices = {}, registrosSinSucursal = {}, diferencias = 0, configuracion = {} }) {
  const hallazgos = [];
  if (!replicaSet) hallazgos.push({ nivel: 'bloqueante', codigo: 'SIN_REPLICA_SET', detalle: 'Se requieren transacciones MongoDB.' });
  for (const requisito of INDICES) {
    if (!contieneIndice(indices[requisito.coleccion], requisito))
      hallazgos.push({ nivel: 'bloqueante', codigo: 'INDICE_FALTANTE', detalle: requisito.coleccion + ': ' + requisito.campos.join(',') });
  }
  for (const [modelo, cantidad] of Object.entries(registrosSinSucursal)) {
    if (cantidad > 0) hallazgos.push({ nivel: 'revision', codigo: 'SIN_SUCURSAL', detalle: `${modelo}: ${cantidad} registros` });
  }
  if (diferencias > 0) hallazgos.push({ nivel: 'revision', codigo: 'DIFERENCIAS_INVENTARIO', detalle: `${diferencias} hallazgos de inventario` });
  if (!configuracion.jwtSeguro) hallazgos.push({ nivel: 'bloqueante', codigo: 'JWT_INSEGURO', detalle: 'Configurar JWT_SECRET fuerte.' });
  if (!configuracion.corsRestringido) hallazgos.push({ nivel: 'bloqueante', codigo: 'CORS_ABIERTO', detalle: 'Definir CORS_ORIGINS.' });
  if (configuracion.permitirSinTransaccion) hallazgos.push({ nivel: 'bloqueante', codigo: 'TRANSACCIONES_DESACTIVADAS', detalle: 'Eliminar PERMITIR_SIN_TRANSACCION.' });
  return { aptoParaPiloto: hallazgos.length === 0, hallazgos, bloqueantes: hallazgos.filter(h => h.nivel === 'bloqueante').length };
}
module.exports = { INDICES, contieneIndice, evaluarPreparacion };
