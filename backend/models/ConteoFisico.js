/**
 * Archivo: ConteoFisico.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose=require('mongoose');
// Evidencia del conteo, diferencia y responsable antes de ajustar existencias.
const schema=new mongoose.Schema({producto:{type:mongoose.Schema.Types.ObjectId,ref:'Producto',required:true},bodega:{type:mongoose.Schema.Types.ObjectId,ref:'Bodega',required:true},cantidadSistema:Number,cantidadContada:{type:Number,required:true,min:0},diferencia:Number,registradoPor:{type:mongoose.Schema.Types.ObjectId,ref:'Usuario'},observacion:String},{timestamps:true});
module.exports=mongoose.model('ConteoFisico',schema);
