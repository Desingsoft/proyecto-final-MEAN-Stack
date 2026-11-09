/**
 * Archivo: Bodega.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose=require('mongoose');
// Catálogo de ubicaciones físicas para existencias por bodega.
const schema=new mongoose.Schema({nombre:{type:String,required:true,trim:true,unique:true},direccion:String,sucursal:{type:mongoose.Schema.Types.ObjectId,ref:'Sucursal',index:true},activa:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Bodega',schema);
