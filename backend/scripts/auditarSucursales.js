/** Auditoría no destructiva de documentos sin sucursal; no asigna sedes automáticamente. */
require('dotenv').config();
const mongoose=require('mongoose');
const modelos=['Usuario','Bodega','Pedido','Pago','MovimientoInventario'];
(async()=>{try{
 await mongoose.connect(process.env.MONGO_URI||process.env.MONGODB_URI);
 const resultado={fecha:new Date().toISOString(),colecciones:{}};
 for(const nombre of modelos){const M=require('../models/'+nombre);resultado.colecciones[nombre]={sinSucursal:await M.countDocuments({sucursal:{$exists:false}}),sucursalNula:await M.countDocuments({sucursal:null})};}
 process.stdout.write(JSON.stringify(resultado,null,2)+'\n');
} catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;} finally{await mongoose.disconnect();}})();
