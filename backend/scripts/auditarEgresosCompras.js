/** Auditoría de pagos a proveedores. Lee órdenes por cursor y egresos en lotes acotados. */
require('dotenv').config();
const mongoose=require('mongoose');
const OrdenCompra=require('../models/OrdenCompra');
const Pago=require('../models/Pago');
const {configurarAuditoria}=require('../utils/configAuditoriaCompras');
const {auditarEgresosOrden}=require('../utils/auditoriaEgresosCompras');
const {auditarVinculosEgresos}=require('../utils/auditoriaEgresosHuerfanos');
const {filtroOrdenesConciliadas,idsConciliadosEnLote}=require('../utils/alcanceConciliacionEgresos');
const {crearAcumulador,agregarResultado}=require('../utils/resumenAuditoriaCompras');
async function main(){
  if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI es obligatorio');
  const {limite,filtro,filtros}=configurarAuditoria(process.env,mongoose.isValidObjectId);
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
  const resumen=crearAcumulador(limite);
  const totales={ordenes:0,egresos:0,totalVigente:0,totalAnulado:0};
    const cursor=OrdenCompra.find(filtro).select('_id numero proveedor sucursal estado total pagado createdAt').lean().cursor();
  async function procesar(lote){
    const pagos=await Pago.find({tipo:'egreso',orden:{$in:lote.map(o=>o._id)}}).select('_id orden tipo numero claveIdempotencia monto estado sucursal proveedor').lean();
    const porOrden=new Map();
    for(const pago of pagos){const k=String(pago.orden);if(!porOrden.has(k))porOrden.set(k,[]);porOrden.get(k).push(pago);}
    for(const orden of lote){
      const resultado=auditarEgresosOrden(orden,porOrden.get(String(orden._id))||[]);
      for(const [k,v] of Object.entries(resultado.resumen)){
        if(!Number.isSafeInteger(totales[k]+v))throw new RangeError(`Total fuera de rango: ${k}`);
        totales[k]+=v;
      }
      agregarResultado(resumen,{resumen:{ordenes:0,lineas:0,recepciones:0,unidadesSolicitadas:0,unidadesRecibidas:0},hallazgos:resultado.hallazgos});
    }
  }
  let lote=[];
  for await(const orden of cursor){lote.push(orden);if(lote.length===100){await procesar(lote);lote=[];}}
  if(lote.length)await procesar(lote);
  // Segunda pasada independiente: también encuentra egresos sin orden o con orden eliminada.
  // Los filtros se aplican a los egresos (fecha de creación/sucursal del pago),
  // no a las órdenes, para evitar falsos positivos por órdenes fuera del período.
  const filtroPagos={tipo:'egreso'};
  if(filtro.sucursal)filtroPagos.sucursal=filtro.sucursal;
  if(filtro.createdAt)filtroPagos.createdAt=filtro.createdAt;
  const cursorPagos=Pago.find(filtroPagos).select('_id orden numero sucursal proveedor monto estado').lean().cursor();
  let lotePagos=[];
  let pagosRevisados=0;
  async function revisarVinculos(lote){
    const ids=[...new Set(lote.map(p=>p.orden).filter(Boolean).map(String))];
    const ordenes=ids.length?await OrdenCompra.find({_id:{$in:ids}}).select('_id sucursal proveedor').lean():[];
    // La pertenencia al filtro se resuelve por lote: no se retienen todos los IDs históricos en memoria.
    const conciliadas=ids.length?await OrdenCompra.find(filtroOrdenesConciliadas(filtro,ids)).select('_id').lean():[];
    const resultado=auditarVinculosEgresos(lote,ordenes,{ordenesConciliadas:idsConciliadosEnLote(conciliadas)});
    if(!Number.isSafeInteger(pagosRevisados+resultado.resumen.pagosRevisados))throw new RangeError('Demasiados pagos revisados');
    pagosRevisados+=resultado.resumen.pagosRevisados;
    agregarResultado(resumen,{resumen:{ordenes:0,lineas:0,recepciones:0,unidadesSolicitadas:0,unidadesRecibidas:0},hallazgos:resultado.hallazgos});
  }
  for await(const pago of cursorPagos){lotePagos.push(pago);if(lotePagos.length===100){await revisarVinculos(lotePagos);lotePagos=[];}}
  if(lotePagos.length)await revisarVinculos(lotePagos);
  process.stdout.write(JSON.stringify({generadoEn:new Date().toISOString(),soloLectura:true,filtros,resumenEgresos:totales,pagosVinculosRevisados:pagosRevisados,totalHallazgos:resumen.totalHallazgos,hallazgosOmitidos:resumen.hallazgosOmitidos,codigos:resumen.codigos,hallazgos:resumen.hallazgos},null,2)+'\n');
  if(resumen.totalHallazgos)process.exitCode=2;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>mongoose.disconnect());
