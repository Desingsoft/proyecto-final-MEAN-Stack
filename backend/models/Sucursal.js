const mongoose=require('mongoose');
/** Catálogo de sedes; la segregación de datos existentes requiere migración supervisada. */
const schema=new mongoose.Schema({codigo:{type:String,required:true,unique:true,uppercase:true,trim:true},nombre:{type:String,required:true,trim:true},direccion:{type:String,default:''},activa:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Sucursal',schema);
