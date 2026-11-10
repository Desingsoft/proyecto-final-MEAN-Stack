/**
 * Archivo: Cotizacion.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose=require('mongoose');
// Cotización independiente; su aprobación no descuenta inventario automáticamente.
const schema=new mongoose.Schema({cliente:{type:String,required:true},items:[{producto:{type:mongoose.Schema.Types.ObjectId,ref:'Producto',required:true},cantidad:{type:Number,required:true,min:1},precioUnitario:{type:Number,required:true,min:0}}],descuentoPorcentaje:{type:Number,default:0,min:0,max:100},subtotal:Number,total:Number,estado:{type:String,enum:['borrador','enviada','aceptada','rechazada','vencida','procesando'],default:'borrador'},vigenciaHasta:Date,pedidoRef:{type:mongoose.Schema.Types.ObjectId,ref:'Pedido',default:null},creadoPor:{type:mongoose.Schema.Types.ObjectId,ref:'Usuario'}},{timestamps:true});
module.exports=mongoose.model('Cotizacion',schema);
