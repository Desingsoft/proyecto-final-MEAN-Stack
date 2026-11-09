/** Diagnóstico de asignación por sede; solo lectura, no inventa sucursales históricas. */
require('dotenv').config();
const mongoose=require('mongoose');
const modelos=['Usuario','Bodega','Pedido','Pago','MovimientoInventario'];
async function main(){
 if(!process.env.MONGODB_URI)throw new Error('Falta MONGODB_URI');
 await mongoose.connect(process.env.MONGODB_URI);
 const resultado={generadoEn:new Date().toISOString(),colecciones:[]};
 for(const nombre of modelos){
  const Modelo=require('../models/'+nombre);
  const [total,sinSucursal]=await Promise.all([Modelo.countDocuments({}),Modelo.countDocuments({$or:[{sucursal:{$exists:false}},{sucursal:null}]})]);
  resultado.colecciones.push({modelo:nombre,total,sinSucursal,conSucursal:total-sinSucursal});
 }
 process.stdout.write(JSON.stringify(resultado,null,2)+'\n');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>mongoose.disconnect());
