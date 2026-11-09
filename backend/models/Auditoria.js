/**
 * Archivo: Auditoria.js
 * Propósito: Modelo de MongoDB/Mongoose: define la estructura y las restricciones de los documentos.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
// Bitácora persistente de modificaciones. No se registran contraseñas ni tokens.
const schema = new mongoose.Schema({ usuario: {type:mongoose.Schema.Types.ObjectId,ref:'Usuario'}, metodo:String, ruta:String, estado:Number, ip:String, entidad:String, registroId:mongoose.Schema.Types.ObjectId, motivo:{type:String,maxlength:500}, antes:mongoose.Schema.Types.Mixed, despues:mongoose.Schema.Types.Mixed, fecha:{type:Date,default:Date.now} });
schema.index({fecha:-1});
module.exports = mongoose.model('Auditoria',schema);
