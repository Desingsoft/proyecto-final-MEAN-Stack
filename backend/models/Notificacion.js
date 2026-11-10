/**
 * Archivo: Notificacion.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose=require('mongoose');
// Avisos internos persistentes para alertas de inventario y gestión.
const schema=new mongoose.Schema({clave:{type:String,unique:true,sparse:true},activa:{type:Boolean,default:true},titulo:{type:String,required:true},mensaje:String,tipo:{type:String,default:'info'},leida:{type:Boolean,default:false},usuario:{type:mongoose.Schema.Types.ObjectId,ref:'Usuario'},createdAt:{type:Date,default:Date.now}});
module.exports=mongoose.model('Notificacion',schema);
