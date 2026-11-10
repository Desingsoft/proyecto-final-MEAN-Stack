/** Auditoría de compras: salida JSON resumida y hallazgos acotados, sin mutaciones. */
require('dotenv').config();
const mongoose=require('mongoose');
const OrdenCompra=require('../models/OrdenCompra');
const {auditarRecepciones}=require('../utils/auditoriaCompras');
const {crearAcumulador,agregarResultado}=require('../utils/resumenAuditoriaCompras');
const {configurarAuditoria}=require('../utils/configAuditoriaCompras');

async function main(){
  if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI es obligatorio');
  // Validar todos los parámetros antes de abrir una conexión a MongoDB.
  const {limite,filtro,filtros}=configurarAuditoria(process.env, mongoose.isValidObjectId);
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
  const acumulado=crearAcumulador(limite);
  const cursor=OrdenCompra.find(filtro).select('_id createdAt numero proveedor sucursal estado fechaEsperada items.producto items.cantidad items.cantidadRecibida items.costoUnitario total recepciones._id recepciones.fecha recepciones.bodega recepciones.items.producto recepciones.items.cantidad').lean().cursor();
  for await(const orden of cursor)agregarResultado(acumulado,auditarRecepciones([orden]));
  process.stdout.write(JSON.stringify({generadoEn:new Date().toISOString(),soloLectura:true,filtros,...acumulado},null,2)+'\n');
  if(acumulado.totalHallazgos>0)process.exitCode=2;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>mongoose.disconnect());
