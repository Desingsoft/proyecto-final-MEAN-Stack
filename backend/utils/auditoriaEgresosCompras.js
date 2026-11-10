/** Conciliación de egresos vigentes por orden, sin modificar datos. */
const id = value => value == null ? '' : String(value);
const entero = n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
function auditarEgresosOrden(orden, pagos) {
  const hallazgos = [];
  const agregar = (codigo, detalle) => hallazgos.push({orden:id(orden._id),numero:orden.numero||'',codigo,detalle});
  const ordenId=id(orden._id);
  let totalVigente=0, totalAnulado=0;
  const ids=new Set(), numeros=new Set(), claves=new Set();
  for (const pago of pagos) {
    if (id(pago.orden)!==ordenId) {agregar('EGRESO_ORDEN_DISTINTA',`Egreso ${id(pago._id)} asociado a otra orden`);continue;}
    if (pago.tipo!=='egreso') {agregar('PAGO_TIPO_INVALIDO',`Pago ${id(pago._id)} no es egreso`);continue;}
    const identificador=id(pago._id);
    if (identificador) {if(ids.has(identificador))agregar('EGRESO_DUPLICADO',`Identificador ${identificador}`);ids.add(identificador);}
    if (pago.numero) {if(numeros.has(pago.numero))agregar('EGRESO_NUMERO_DUPLICADO',`Comprobante ${pago.numero}`);numeros.add(pago.numero);}
    if (pago.claveIdempotencia) {if(claves.has(pago.claveIdempotencia))agregar('EGRESO_CLAVE_DUPLICADA','Clave de idempotencia repetida');claves.add(pago.claveIdempotencia);}
    if (!entero(pago.monto)||pago.monto===0) {agregar('EGRESO_MONTO_INVALIDO',`Pago ${identificador}`);continue;}
    if (!['vigente','anulado'].includes(pago.estado)) {agregar('EGRESO_ESTADO_INVALIDO',`Pago ${identificador}`);continue;}
    if (orden.sucursal && !pago.sucursal) agregar('EGRESO_SIN_SUCURSAL',`Pago ${identificador}`);
    if (orden.proveedor && !pago.proveedor) agregar('EGRESO_SIN_PROVEEDOR',`Pago ${identificador}`);
    if (orden.sucursal && pago.sucursal && id(orden.sucursal)!==id(pago.sucursal)) agregar('EGRESO_SUCURSAL_DISTINTA',`Pago ${identificador}`);
    if (orden.proveedor && pago.proveedor && id(orden.proveedor)!==id(pago.proveedor)) agregar('EGRESO_PROVEEDOR_DISTINTO',`Pago ${identificador}`);
    const campo=pago.estado==='vigente'?'vigente':'anulado';
    const actual=campo==='vigente'?totalVigente:totalAnulado;
    if (!Number.isSafeInteger(actual+pago.monto)) {agregar('EGRESOS_FUERA_RANGO',`Pago ${identificador}`);continue;}
    if(campo==='vigente')totalVigente+=pago.monto;else totalAnulado+=pago.monto;
  }
  if(!entero(orden.pagado))agregar('ORDEN_PAGADO_INVALIDO','Valor pagado inválido');
  else if(orden.pagado!==totalVigente)agregar('ORDEN_PAGADO_DESCUADRADO',`Registrado ${orden.pagado}, egresos vigentes ${totalVigente}`);
  if (entero(orden.total) && totalVigente>orden.total) agregar('EGRESOS_SUPERAN_TOTAL',`Pagado ${totalVigente}, total orden ${orden.total}`);
  if (orden.estado==='cancelada' && totalVigente>0) agregar('ORDEN_CANCELADA_CON_EGRESOS',`Egresos vigentes ${totalVigente}`);
  return {resumen:{ordenes:1,egresos:pagos.length,totalVigente,totalAnulado},hallazgos};
}
module.exports={auditarEgresosOrden};
