/**
 * Archivo: Existencia.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose=require('mongoose');
// Existencia específica por producto y bodega; combinación única.
const schema=new mongoose.Schema({producto:{type:mongoose.Schema.Types.ObjectId,ref:'Producto',required:true},bodega:{type:mongoose.Schema.Types.ObjectId,ref:'Bodega',required:true},cantidad:{type:Number,default:0,min:0}},{timestamps:true});
schema.index({producto:1,bodega:1},{unique:true});
module.exports=mongoose.model('Existencia',schema);
