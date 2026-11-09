const mongoose=require('mongoose');
/** Cola de preparación; NO envía documentos a DIAN ni genera CUFE. */
const schema=new mongoose.Schema({documento:{type:mongoose.Schema.Types.ObjectId,ref:'Documento',required:true,unique:true},estado:{type:String,enum:['pendiente_configuracion','listo_para_integrar'],default:'pendiente_configuracion'},proveedor:{type:String,default:''},observaciones:{type:String,default:''},creadoPor:{type:mongoose.Schema.Types.ObjectId,ref:'Usuario'}},{timestamps:true});
module.exports=mongoose.model('EnvioElectronico',schema);
