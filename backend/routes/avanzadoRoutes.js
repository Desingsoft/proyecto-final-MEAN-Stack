const { identificador, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: avanzadoRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const express=require('express');
const mongoose=require('mongoose');
const verify=require('../middlewares/verifyToken');
const permiso=require('../middlewares/permiso');
const Bodega=require('../models/Bodega');
const Existencia=require('../models/Existencia');
const Conteo=require('../models/ConteoFisico');
const Producto=require('../models/Producto');
const Movimiento=require('../models/MovimientoInventario');
const Auditoria=require('../models/Auditoria');
const Notificacion=require('../models/Notificacion');
const Cotizacion=require('../models/Cotizacion');
const Pedido=require('../models/Pedido');
const pedidoController=require('../controllers/pedidoController');
const router=express.Router();
router.use(verify);
// Captura uniforme de errores de validación y de base de datos.
const ejecutar=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const id=valor=>mongoose.isValidObjectId(valor);
router.get('/bodegas',permiso('inventario.leer'),ejecutar(async(req,res)=>res.json(await Bodega.find().sort({nombre:1}))));
router.post('/bodegas',permiso('inventario.bodegas'),ejecutar(async(req,res)=>{
 const nombre=String(req.body.nombre||'').trim();
 if(!nombre||nombre.length>100)return res.status(400).json({mensaje:'Nombre inválido'});
 res.status(201).json(await Bodega.create({nombre,direccion:String(req.body.direccion||'').slice(0,200)}));
}));
router.get('/existencias',permiso('inventario.leer'),ejecutar(async(req,res)=>res.json(await Existencia.find().populate('producto','nombre sku codigoBarras').populate('bodega','nombre').limit(1000))));
router.get('/auditoria',permiso('auditoria.leer'),ejecutar(async(req,res)=>res.json(await Auditoria.find().populate('usuario','nombre email').sort({fecha:-1}).limit(200))));
router.get('/alertas',permiso('inventario.leer'),ejecutar(async(req,res)=>{
 const productos=await Producto.find({activo:true,$expr:{$lte:['$stock','$stockMinimo']}}).select('nombre sku stock stockMinimo');
 res.json({total:productos.length,productos});
}));
router.get('/notificaciones',ejecutar(async(req,res)=>res.json(await Notificacion.find({$or:[{usuario:req.usuario.id},{usuario:null}]}).sort({createdAt:-1}).limit(100))));
router.patch('/notificaciones/:id/leida',...aplicar(identificador('id')),ejecutar(async(req,res)=>{
 const aviso=await Notificacion.findOneAndUpdate({_id:req.params.id,$or:[{usuario:req.usuario.id},{usuario:null}]},{leida:true},{new:true});
 if(!aviso)return res.status(404).json({mensaje:'Aviso no encontrado'});
 res.json(aviso);
}));
// Conteo físico transaccional: actualiza stock global y stock de bodega en conjunto.
router.post('/conteos',permiso('inventario.conteos'),ejecutar(async(req,res)=>{
 const {producto,bodega,cantidadContada,observacion}=req.body;
 if(!id(producto)||!id(bodega)||!Number.isInteger(cantidadContada)||cantidadContada<0)return res.status(400).json({mensaje:'Datos del conteo inválidos'});
 const sesion=await mongoose.startSession();let resultado;
 try{await sesion.withTransaction(async()=>{
  const [p,ubicacion]=await Promise.all([Producto.findById(producto).session(sesion),Bodega.findById(bodega).session(sesion)]);
  if(!p||!ubicacion)throw Object.assign(new Error('Producto o bodega inexistente'),{status:404});
  const actual=await Existencia.findOne({producto,bodega}).session(sesion);
  const anterior=actual?.cantidad||0;const diferencia=cantidadContada-anterior;
  if(p.stock+diferencia<0)throw Object.assign(new Error('El ajuste dejaría stock global negativo'),{status:409});
  await Existencia.updateOne({producto,bodega},{$set:{cantidad:cantidadContada}},{upsert:true,session:sesion});
  await Producto.updateOne({_id:producto},{$inc:{stock:diferencia}},{session:sesion});
  resultado=await Conteo.create([{producto,bodega,cantidadSistema:anterior,cantidadContada,diferencia,observacion:String(observacion||'').slice(0,500),registradoPor:req.usuario.id}],{session:sesion});
  if(diferencia)await Movimiento.create([{producto,tipo:diferencia>0?'entrada':'salida',cantidad:Math.abs(diferencia),motivo:'conteo físico',registradoPor:req.usuario.id}],{session:sesion});
 });res.status(201).json(resultado[0]);}finally{await sesion.endSession();}
}));
router.get('/conteos',permiso('inventario.conteos'),ejecutar(async(req,res)=>res.json(await Conteo.find().populate('producto','nombre sku').populate('bodega','nombre').sort({createdAt:-1}).limit(200))));
router.get('/cotizaciones',permiso('ventas.cotizaciones'),ejecutar(async(req,res)=>res.json(await Cotizacion.find().sort({createdAt:-1}).limit(200))));
router.post('/cotizaciones',permiso('ventas.cotizaciones'),ejecutar(async(req,res)=>{
 const {cliente,items,descuentoPorcentaje=0,vigenciaHasta}=req.body;
 if(typeof cliente!=='string'||!cliente.trim()||!Array.isArray(items)||!items.length||items.length>100||!Number.isFinite(descuentoPorcentaje)||descuentoPorcentaje<0||descuentoPorcentaje>100)return res.status(400).json({mensaje:'Cotización inválida'});
 if(!items.every(i=>id(i.producto)&&Number.isInteger(i.cantidad)&&i.cantidad>0&&Number.isFinite(i.precioUnitario)&&i.precioUnitario>=0))return res.status(400).json({mensaje:'Ítems inválidos'});
 // Precio de referencia se obtiene del catálogo para impedir importes manipulados.
 const productos=await Producto.find({_id:{$in:items.map(i=>i.producto)},activo:true}).select('_id precio').lean();
 const precios=new Map(productos.map(p=>[String(p._id),p.precio]));
 if(precios.size!==items.length||new Set(items.map(i=>String(i.producto))).size!==items.length)return res.status(400).json({mensaje:'Productos inexistentes o repetidos'});
 const lineas=items.map(i=>({producto:i.producto,cantidad:i.cantidad,precioUnitario:precios.get(String(i.producto))}));
 const subtotal=lineas.reduce((a,i)=>a+i.cantidad*i.precioUnitario,0);
 const total=Math.round(subtotal*(1-descuentoPorcentaje/100)*100)/100;
 res.status(201).json(await Cotizacion.create({cliente:cliente.trim(),items:lineas,descuentoPorcentaje,subtotal,total,vigenciaHasta,creadoPor:req.usuario.id}));
}));
router.patch('/cotizaciones/:id/estado',permiso('ventas.cotizaciones'),ejecutar(async(req,res)=>{
 if(!['borrador','enviada','aceptada','rechazada','vencida'].includes(req.body.estado))return res.status(400).json({mensaje:'Estado inválido'});
 const cot=await Cotizacion.findByIdAndUpdate(req.params.id,{estado:req.body.estado},{new:true,runValidators:true});
 if(!cot)return res.status(404).json({mensaje:'Cotización inexistente'});
 res.json(cot);
}));
router.get('/indicadores',permiso('reportes.leer'),ejecutar(async(req,res)=>{
 const [productos,pedidos,ventas,stockBajo]=await Promise.all([Producto.countDocuments({activo:true}),Pedido.countDocuments(),Pedido.aggregate([{$match:{estado:{$ne:'cancelado'}}},{$group:{_id:null,total:{$sum:'$total'}}}]),Producto.countDocuments({activo:true,$expr:{$lte:['$stock','$stockMinimo']}})]);
 res.json({productos,pedidos,ventas:ventas[0]?.total||0,stockBajo});
}));

// Buscar un producto mediante escáner USB/Bluetooth (se comporta como teclado).
// Se exige una coincidencia exacta para evitar seleccionar el producto equivocado.
router.get('/codigo-barras/:codigo',permiso('inventario.leer'),ejecutar(async(req,res)=>{
 const codigo=String(req.params.codigo||'').trim();
 if(!codigo||codigo.length>80)return res.status(400).json({mensaje:'Código inválido'});
 const producto=await Producto.findOne({codigoBarras:codigo,activo:true}).select('nombre sku codigoBarras stock precio');
 if(!producto)return res.status(404).json({mensaje:'No existe un producto con ese código'});
 res.json(producto);
}));
// Delegar la conversión al controlador transaccional de pedidos.
// Nunca interceptar res.json ni realizar enlaces asíncronos fuera de la transacción:
// una falla entre ambas operaciones produciría pedidos huérfanos o duplicados.
router.post('/cotizaciones/:id/convertir',permiso('ventas.cotizaciones'),ejecutar(async(req,res)=>{
 if(!id(req.params.id))return res.status(400).json({mensaje:'Identificador inválido'});
 const cot=await Cotizacion.findById(req.params.id).lean();
 if(!cot)return res.status(404).json({mensaje:'Cotización no encontrada'});
 if(cot.pedidoRef)return res.status(409).json({mensaje:'Cotización ya convertida',pedido:cot.pedidoRef});
 if(cot.estado!=='aceptada')return res.status(409).json({mensaje:'La cotización debe estar aceptada'});
 if(cot.vigenciaHasta&&cot.vigenciaHasta<new Date())return res.status(409).json({mensaje:'Cotización vencida'});
 // Se conservan cantidades, descuentos y la referencia de origen.
 req.body={cliente:cot.cliente,items:cot.items.map(i=>({producto:i.producto,cantidad:i.cantidad})),descuentoPorcentaje:cot.descuentoPorcentaje,cotizacionRef:cot._id};
 return pedidoController.crear(req,res);
}));

module.exports=router;
