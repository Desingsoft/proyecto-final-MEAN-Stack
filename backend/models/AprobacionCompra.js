const mongoose=require('mongoose');
/** Una aprobación por orden; la autorización no puede hacerla el solicitante. */
const schema=new mongoose.Schema({
 orden:{type:mongoose.Schema.Types.ObjectId,ref:'OrdenCompra',required:true,unique:true},
 solicitante:{type:mongoose.Schema.Types.ObjectId,ref:'Usuario',required:true},
 monto:{type:Number,required:true,min:0},
 huellaOrden:{type:String,required:true,match:/^[a-f0-9]{64}$/},
 estado:{type:String,enum:['pendiente','aprobada','rechazada'],default:'pendiente'},
 aprobador:{type:mongoose.Schema.Types.ObjectId,ref:'Usuario'},
 motivo:{type:String,default:'',maxlength:1000},fechaDecision:Date
},{timestamps:true});
module.exports=mongoose.model('AprobacionCompra',schema);
