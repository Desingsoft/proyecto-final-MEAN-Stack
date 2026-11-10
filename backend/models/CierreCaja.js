const mongoose = require('mongoose');
/** Cierre único por fecha y responsable; conserva los totales calculados al cerrarlo. */
const schema = new mongoose.Schema({
 fecha: {type:String,required:true,match:/^\d{4}-\d{2}-\d{2}$/},
 responsable: {type:mongoose.Schema.Types.ObjectId,ref:'Usuario',required:true},
 efectivoDeclarado:{type:Number,required:true,min:0},
 efectivoSistema:{type:Number,required:true,min:0},
 transferenciasSistema:{type:Number,required:true,min:0},
 tarjetasSistema:{type:Number,required:true,min:0},
 otrosSistema:{type:Number,required:true,min:0},
 diferencia:{type:Number,required:true},
 observacion:{type:String,default:'',maxlength:1000},
 pagos:[{type:mongoose.Schema.Types.ObjectId,ref:'Pago'}]
},{timestamps:true});
schema.index({fecha:1,responsable:1},{unique:true});
module.exports=mongoose.model('CierreCaja',schema);
