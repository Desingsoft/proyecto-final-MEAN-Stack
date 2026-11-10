/** Pronóstico por sede. No confundir movimientos de transferencia con ventas. */
function enteroLimitado(valor, defecto, minimo, maximo) {
  if (valor === undefined || valor === null || valor === '') return defecto;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < minimo || numero > maximo) return null;
  return numero;
}
/** Clasifica las órdenes según la fecha de entrega y el horizonte de reposición.
 * Las órdenes sin fecha o posteriores al horizonte se reportan, pero no reducen
 * la recomendación. Las fechas se comparan por día UTC, no por hora exacta.
 */
function clasificarPendientes(ordenes, fechaCorte=new Date(), plazoDias=180) {
  const hoy=new Date(fechaCorte);
  if(Number.isNaN(hoy.getTime()))throw new Error('Fecha de corte inválida');
  if(!Number.isSafeInteger(plazoDias)||plazoDias<1||plazoDias>180)throw new Error('Horizonte inválido');
  const inicio=Date.UTC(hoy.getUTCFullYear(),hoy.getUTCMonth(),hoy.getUTCDate());
  const pendientes=[];const vencidos=[];const inciertos=[];const posteriores=[];
  // La clasificación se realiza por línea de compra: cada producto puede tener
  // un plazo de proveedor diferente. El plazo general es solo un valor supletorio.
  for(const orden of ordenes){
    let fecha=null;
    if(orden.fechaEsperada!==undefined&&orden.fechaEsperada!==null&&orden.fechaEsperada!==''){
      fecha=new Date(orden.fechaEsperada);
      if(Number.isNaN(fecha.getTime()))throw new Error('Fecha esperada de compra inválida');
    }
    const dia=fecha?Date.UTC(fecha.getUTCFullYear(),fecha.getUTCMonth(),fecha.getUTCDate()):null;
    for(const item of orden.items||[]){
      const solicitada=Number(item.cantidad),recibida=Number(item.cantidadRecibida??0);
      if(!Number.isSafeInteger(solicitada)||solicitada<1||!Number.isSafeInteger(recibida)||recibida<0||recibida>solicitada)throw new Error('Cantidad de compra inválida');
      const cantidad=solicitada-recibida;
      if(!cantidad)continue;
      const plazoItem=Number.isSafeInteger(item.diasEntrega)&&item.diasEntrega>=1&&item.diasEntrega<=180?item.diasEntrega:plazoDias;
      const limite=inicio+plazoItem*86400000;
      const destino=dia===null?inciertos:dia<inicio?vencidos:dia>limite?posteriores:pendientes;
      destino.push({producto:item.producto,cantidad,orden:orden._id,fechaEsperada:fecha,diasEntrega:plazoItem});
    }
  }
  return {pendientes,vencidos,inciertos,posteriores};
}
/** Detalle auditable de cada línea pendiente; reutiliza la misma clasificación del pronóstico. */
function resumirComprasPendientes(ordenes, fechaCorte=new Date(), plazoDias=7) {
  const grupos=clasificarPendientes(ordenes,fechaCorte,plazoDias);
  const filas=[];
  for(const [estado,items] of Object.entries(grupos)){
    for(const item of items) filas.push({orden:item.orden,producto:item.producto,cantidad:item.cantidad,
      fechaEsperada:item.fechaEsperada,diasEntrega:item.diasEntrega,clasificacion:estado});
  }
  const totales=Object.fromEntries(Object.entries(grupos).map(([k,items])=>{
    let unidades=0;
    for(const item of items){unidades+=item.cantidad;if(!Number.isSafeInteger(unidades))throw new Error('Total de compras fuera de rango');}
    return [k,{lineas:items.length,unidades}];
  }));
  return {filas,totales};
}
function proyectarReposicion({existencias, salidas, productos, dias, plazo, pendientes=[], vencidos=[], inciertos=[], posteriores=[]}) {
  if (!Number.isSafeInteger(dias) || dias < 1 || !Number.isSafeInteger(plazo) || plazo < 1) throw new Error('Período inválido');
  const entrantes = new Map();
  for (const e of pendientes) {
    if (!Number.isSafeInteger(e.cantidad) || e.cantidad < 0) throw new Error('Cantidad pendiente inválida');
    const key=String(e.producto);const suma=(entrantes.get(key)||0)+e.cantidad;
    if(!Number.isSafeInteger(suma))throw new Error('Compra acumulada fuera de rango');
    entrantes.set(key,suma);
  }
  const atrasados = new Map();
  for (const e of vencidos) {
    if (!Number.isSafeInteger(e.cantidad) || e.cantidad < 0) throw new Error('Cantidad vencida inválida');
    const key=String(e.producto);const suma=(atrasados.get(key)||0)+e.cantidad;
    if(!Number.isSafeInteger(suma))throw new Error('Compra atrasada fuera de rango');
    atrasados.set(key,suma);
  }
  const totalPorProducto = (items) => {
    const mapa=new Map();
    for(const e of items){
      if(!Number.isSafeInteger(e.cantidad)||e.cantidad<0)throw new Error('Cantidad de compra inválida');
      const key=String(e.producto);const suma=(mapa.get(key)||0)+e.cantidad;
      if(!Number.isSafeInteger(suma))throw new Error('Compra acumulada fuera de rango');
      mapa.set(key,suma);
    }
    return mapa;
  };
  const sinFecha=totalPorProducto(inciertos);
  const fueraPlazo=totalPorProducto(posteriores);
  const stock = new Map();
  for (const e of existencias) {
    const key = String(e.producto);
    if (!Number.isSafeInteger(e.cantidad) || e.cantidad < 0) throw new Error('Existencia inválida');
    const suma=(stock.get(key)||0)+e.cantidad;
    if(!Number.isSafeInteger(suma))throw new Error('Stock acumulado fuera de rango');
    stock.set(key,suma);
  }
  const demanda = new Map();
  for (const s of salidas) {
    const key = String(s._id);
    if (!Number.isSafeInteger(s.cantidad) || s.cantidad < 0) throw new Error('Movimiento inválido');
    const suma=(demanda.get(key)||0)+s.cantidad;
    if(!Number.isSafeInteger(suma))throw new Error('Demanda acumulada fuera de rango');
    demanda.set(key,suma);
  }
  return productos.map(p => {
    const actual = stock.get(String(p._id)) || 0;
    const total = demanda.get(String(p._id)) || 0;
    const diaria = total / dias;
    const minimo = Number.isSafeInteger(p.stockMinimo) && p.stockMinimo >= 0 ? p.stockMinimo : 0;
    const plazoProducto=Number.isSafeInteger(p.diasEntrega) && p.diasEntrega>=1 && p.diasEntrega<=180 ? p.diasEntrega : plazo;
    const enCamino=entrantes.get(String(p._id))||0;
    const punto = Math.ceil(diaria * plazoProducto + minimo);
    if(!Number.isSafeInteger(punto))throw new Error('Punto de pedido fuera de rango');
    const atrasado=atrasados.get(String(p._id))||0;
    const sinFechaProducto=sinFecha.get(String(p._id))||0;
    const fueraPlazoProducto=fueraPlazo.get(String(p._id))||0;
    const deficit=punto-actual-enCamino;
    if(!Number.isSafeInteger(deficit))throw new Error('Reposición sugerida fuera de rango');
    const cantidadSugerida=Math.max(0,deficit);
    // Sin demanda histórica no hay evidencia para afirmar que la recomendación sea confiable.
    const calidadEstimacion=total===0?'sin_demanda_historica':(atrasado>0||sinFechaProducto>0||fueraPlazoProducto>0)?'requiere_revision':'basada_en_ventas';
    return {producto:p._id, sku:p.sku, nombre:p.nombre, stockSucursal:actual,
      salidasPeriodo:total, demandaDiaria:Number(diaria.toFixed(4)), diasEntrega:plazoProducto,
      enCamino, enCaminoVencido:atrasado, enCaminoSinFecha:sinFechaProducto, enCaminoFueraPlazo:fueraPlazoProducto, puntoPedido:punto, cantidadSugerida, calidadEstimacion};
  }).filter(p=>p.cantidadSugerida>0).sort((a,b)=>b.cantidadSugerida-a.cantidadSugerida);
}
module.exports={enteroLimitado,proyectarReposicion,clasificarPendientes,resumirComprasPendientes};
