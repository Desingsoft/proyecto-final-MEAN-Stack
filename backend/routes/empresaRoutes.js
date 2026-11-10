/** API empresarial incremental: ocho capacidades con permisos explícitos y límites documentados. */
const express=require('express');
const mongoose=require('mongoose');
const crypto=require('node:crypto');
const {body,validationResult}=require('express-validator');
const verifyToken=require('../middlewares/verifyToken');
const permiso=require('../middlewares/permiso');
const Pago=require('../models/Pago');
const Cierre=require('../models/CierreCaja');
const Orden=require('../models/OrdenCompra');
const Aprobacion=require('../models/AprobacionCompra');
const Auditoria=require('../models/Auditoria');
const Sucursal=require('../models/Sucursal');
const Envio=require('../models/EnvioElectronico');
const Documento=require('../models/Documento');
const Producto=require('../models/Producto');
const Existencia=require('../models/Existencia');
const Movimiento=require('../models/MovimientoInventario');
const router=express.Router();
router.use(verifyToken);
const admin=(req,res,next)=>req.usuario?.role==='admin'?next():res.status(403).json({mensaje:'Solo administradores'});
const valido=(req,res,next)=>{const errores=validationResult(req);return errores.isEmpty()?next():res.status(422).json({mensaje:'Datos inválidos',errores:errores.array().map(x=>({campo:x.path,mensaje:x.msg}))});};
const id=(valor)=>mongoose.isValidObjectId(valor);
const error=(next,e)=>next(e);
const huellaOrden=(o)=>crypto.createHash('sha256').update(JSON.stringify({proveedor:String(o.proveedor),items:o.items.map(i=>({producto:String(i.producto),cantidad:i.cantidad,costoUnitario:i.costoUnitario})),total:o.total})).digest('hex');
const cent=(n)=>Math.round((n+Number.EPSILON)*100)/100;
const fechaValida=(s)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));


/** Autorización por sede: nunca confiar en el rol o las sedes enviadas por el cliente. */
const UsuarioSucursal=require('../models/Usuario');
const BodegaSucursal=require('../models/Bodega');
async function accesoSucursal(req,res,next){
 try{
  if(!id(req.params.id))return res.status(422).json({mensaje:'Sucursal inválida'});
  const sede=await Sucursal.findOne({_id:req.params.id,activa:true}).select('_id').lean();
  if(!sede)return res.status(404).json({mensaje:'Sucursal no encontrada'});
  const usuario=await UsuarioSucursal.findById(req.usuario.id).select('role sucursales sucursal activo').lean();
  if(!usuario?.activo)return res.status(401).json({mensaje:'Sesión inválida'});
  const asignadas=[...(usuario.sucursales||[]),usuario.sucursal].filter(Boolean).map(String);
  if(usuario.role!=='admin'&&!asignadas.includes(String(sede._id)))return res.status(403).json({mensaje:'Sin acceso a esta sucursal'});
  req.sucursalAutorizada=sede._id;
  next();
 }catch(e){next(e);}
}

// 1. Cierre de caja. Solo considera cobros y reembolsos vigentes registrados
// durante la fecha UTC indicada; no altera pagos ni sustituye conciliación bancaria.
router.get('/caja/cierres',admin,async(req,res,next)=>{try{res.json(await Cierre.find().sort({createdAt:-1}).limit(100).lean());}catch(e){error(next,e);}});
router.post('/caja/cierres',admin,
 body('fecha').custom(fechaValida),body('efectivoDeclarado').isFloat({min:0}),body('observacion').optional().isString().isLength({max:1000}),valido,
 async(req,res,next)=>{try{
  const {fecha,observacion=''}=req.body; const inicio=new Date(fecha+'T00:00:00Z');const fin=new Date(inicio.getTime()+86400000);
  const pagos=await Pago.find({fecha:{$gte:inicio,$lt:fin},tipo:{$in:['cobro','reembolso']},estado:'vigente'}).select('_id monto tipo metodo').lean();
  const totales={efectivo:0,transferencia:0,tarjeta:0,otros:0};
  for(const p of pagos){const clave=['efectivo','transferencia','tarjeta'].includes(p.metodo)?p.metodo:'otros';totales[clave]+=p.monto*(p.tipo==='reembolso'?-1:1);}
  const declarado=Number(req.body.efectivoDeclarado);
  const cierre=await Cierre.create({fecha,responsable:req.usuario.id,efectivoDeclarado:declarado,efectivoSistema:cent(totales.efectivo),transferenciasSistema:cent(totales.transferencia),tarjetasSistema:cent(totales.tarjeta),otrosSistema:cent(totales.otros),diferencia:cent(declarado-totales.efectivo),observacion,pagos:pagos.map(p=>p._id)});
  res.status(201).json(cierre);
 }catch(e){error(next,e);}});

/** Conciliación preliminar: cruza referencias y montos, sin marcar movimientos bancarios como contabilizados. */
router.post('/caja/conciliar',admin,
 body('fecha').custom(fechaValida),
 body('movimientos').isArray({min:1,max:1000}),
 body('movimientos.*.referencia').isString().trim().isLength({min:1,max:120}),
 body('movimientos.*.monto').isFloat({min:0.01}),valido,
 async(req,res,next)=>{try{
  const inicio=new Date(req.body.fecha+'T00:00:00Z');const fin=new Date(inicio.getTime()+86400000);
  const pagos=await Pago.find({fecha:{$gte:inicio,$lt:fin},estado:'vigente',tipo:'cobro',metodo:{$in:['transferencia','tarjeta']}}).select('numero referencia monto').lean();
  const indices=new Map();for(const p of pagos){const k=String(p.referencia||'').trim();if(k){const lista=indices.get(k)||[];lista.push(p);indices.set(k,lista);}}
  const usados=new Set();const resultados=req.body.movimientos.map(m=>{
   const lista=(indices.get(m.referencia.trim())||[]).filter(p=>!usados.has(String(p._id)));
   const p=lista.find(p=>Math.abs(p.monto-Number(m.monto))<0.005);
   if(p){usados.add(String(p._id));return {referencia:m.referencia,monto:Number(m.monto),estado:'conciliado',pago:p._id};}
   return {referencia:m.referencia,monto:Number(m.monto),estado:lista.length?'importe_diferente':'sin_coincidencia'};
  });
  res.json({fecha:req.body.fecha,resultados,pagosSinConciliar:pagos.filter(p=>!usados.has(String(p._id))).map(p=>({id:p._id,numero:p.numero,referencia:p.referencia,monto:p.monto})),nota:'Conciliación de consulta, no registra asientos ni confirma abonos bancarios.'});
 }catch(e){next(e);}});
router.get('/caja/cierres/:id/pagos-posteriores',admin,async(req,res,next)=>{try{
 if(!id(req.params.id))return res.status(422).json({mensaje:'ID inválido'});
 const cierre=await Cierre.findById(req.params.id).lean();if(!cierre)return res.status(404).json({mensaje:'Cierre inexistente'});
 const inicio=new Date(cierre.fecha+'T00:00:00Z');const fin=new Date(inicio.getTime()+86400000);
 const pagos=await Pago.find({fecha:{$gte:inicio,$lt:fin},createdAt:{$gt:cierre.createdAt},estado:'vigente'}).select('numero tipo monto metodo fecha createdAt').lean();
 res.json({cierre:cierre._id,total:pagos.length,pagos,nota:'Pagos registrados después del cierre; revisar antes de ajustar conciliación.'});
}catch(e){next(e);}});

// 2. Aprobaciones: monto y solicitante son instantáneas de la orden.
router.post('/compras/:id/solicitar-aprobacion',admin,async(req,res,next)=>{try{
 if(!id(req.params.id))return res.status(422).json({mensaje:'ID inválido'});
 const orden=await Orden.findById(req.params.id).lean();if(!orden)return res.status(404).json({mensaje:'Orden inexistente'});
 if(orden.estado!=='borrador')return res.status(409).json({mensaje:'Solo se aprueban borradores'});
 const aprobacion=await Aprobacion.create({orden:orden._id,solicitante:orden.creadoPor||req.usuario.id,monto:orden.total,huellaOrden:huellaOrden(orden)});res.status(201).json(aprobacion);
}catch(e){error(next,e);}});
router.get('/compras/aprobaciones',admin,async(req,res,next)=>{try{res.json(await Aprobacion.find().sort({createdAt:-1}).limit(100).lean());}catch(e){error(next,e);}});
router.patch('/compras/aprobaciones/:id',admin,body('estado').isIn(['aprobada','rechazada']),body('motivo').optional().isString().isLength({max:1000}),valido,async(req,res,next)=>{try{
 if(!id(req.params.id))return res.status(422).json({mensaje:'ID inválido'});
 const a=await Aprobacion.findById(req.params.id).lean();if(!a)return res.status(404).json({mensaje:'Aprobación inexistente'});
 if(a.estado!=='pendiente')return res.status(409).json({mensaje:'Ya fue decidida'});
 if(String(a.solicitante)===String(req.usuario.id))return res.status(403).json({mensaje:'El solicitante no puede decidir su orden'});
 const o=await Orden.findById(a.orden).lean();
 if(!o||o.estado!=='borrador'||o.total!==a.monto||huellaOrden(o)!==a.huellaOrden)return res.status(409).json({mensaje:'La orden cambió; requiere nueva revisión'});
 // Compare-and-set: solo un aprobador puede pasar de pendiente a un estado final.
 const decidido=await Aprobacion.findOneAndUpdate({_id:a._id,estado:'pendiente'},{$set:{estado:req.body.estado,aprobador:req.usuario.id,motivo:req.body.motivo||'',fechaDecision:new Date()}},{new:true,runValidators:true});
 if(!decidido)return res.status(409).json({mensaje:'Otra persona ya decidió esta aprobación'});
 res.json(decidido);
}catch(e){error(next,e);}});

// 3. Auditoría: acceso restringido, paginado y sin cuerpos de solicitud.
router.get('/auditoria',admin,async(req,res,next)=>{try{
 const limite=Math.min(Math.max(Number(req.query.limite)||30,1),100);const pagina=Math.min(Math.max(Number(req.query.pagina)||1,1),1000);
 const filtro={};if(req.query.usuario){if(!id(req.query.usuario))return res.status(422).json({mensaje:'Usuario inválido'});filtro.usuario=req.query.usuario;}
 res.json({pagina,limite,registros:await Auditoria.find(filtro).sort({fecha:-1}).skip((pagina-1)*limite).limit(limite).select('-ip').lean()});
}catch(e){error(next,e);}});

// 4. Sucursales: catálogo seguro. No se afirma segregación completa sin migrar datos.
router.get('/sucursales',permiso('productos.leer'),async(req,res,next)=>{try{
 const usuario=await UsuarioSucursal.findById(req.usuario.id).select('role sucursales sucursal activo').lean();
 if(!usuario?.activo)return res.status(401).json({mensaje:'Sesión inválida'});
 const filtro={activa:true};
 if(usuario.role!=='admin')filtro._id={$in:[...(usuario.sucursales||[]),usuario.sucursal].filter(Boolean)};
 res.json(await Sucursal.find(filtro).sort({nombre:1}).lean());
}catch(e){error(next,e);}});
router.post('/sucursales',admin,body('codigo').isString().matches(/^[A-Za-z0-9_-]{2,20}$/),body('nombre').isString().trim().isLength({min:2,max:100}),body('direccion').optional().isString().isLength({max:200}),valido,async(req,res,next)=>{try{
 const {codigo,nombre,direccion=''}=req.body;res.status(201).json(await Sucursal.create({codigo,nombre,direccion}));
}catch(e){error(next,e);}});

// 5. Preparación de facturación electrónica. No crea XML UBL ni envía a DIAN.
router.post('/facturacion-electronica/preparar/:id',admin,async(req,res,next)=>{try{
 if(!id(req.params.id))return res.status(422).json({mensaje:'ID inválido'});
 const doc=await Documento.findById(req.params.id).lean();if(!doc||doc.tipo!=='factura'||doc.estado!=='emitida')return res.status(409).json({mensaje:'Se requiere una factura emitida'});
 if(!doc.empresa?.nit||!doc.cliente?.documento||!Array.isArray(doc.items)||!doc.items.length)return res.status(422).json({mensaje:'Faltan datos fiscales para preparar el envío'});
 const envio=await Envio.create({documento:doc._id,creadoPor:req.usuario.id,observaciones:'Pendiente de proveedor tecnológico, resolución, firma y validación DIAN'});
 res.status(201).json(envio);
}catch(e){error(next,e);}});
router.get('/facturacion-electronica/pendientes',admin,async(req,res,next)=>{try{res.json(await Envio.find().sort({createdAt:-1}).limit(100).lean());}catch(e){error(next,e);}});

// 6. Indicadores: agregados de facturas emitidas, pagos vigentes y existencias.
router.get('/indicadores',admin,async(req,res,next)=>{try{
 const [ventas,cartera,productos]=await Promise.all([
  Documento.aggregate([{$match:{tipo:'factura',estado:'emitida'}},{$group:{_id:null,total:{$sum:'$total'},facturas:{$sum:1}}}]),
  Documento.aggregate([{$match:{tipo:'factura',estado:'emitida'}},{$group:{_id:null,pendiente:{$sum:{$max:[0,{$subtract:['$total',{$add:[{$ifNull:['$pagado',0]},{$ifNull:['$acreditado',0]}]}]}]}}}}]),
  Producto.countDocuments({activo:true})
 ]);
 res.json({ventasEmitidas:cent(ventas[0]?.total||0),cantidadFacturas:ventas[0]?.facturas||0,carteraEstimada:cent(cartera[0]?.pendiente||0),productosActivos:productos,nota:'Cartera estimada; no sustituye conciliación contable ni calcula rentabilidad neta'});
}catch(e){error(next,e);}});

// 7. Reposición: mínimos por catálogo; proyección basada en demanda requiere datos históricos fiables.
router.get('/reposicion',admin,async(req,res,next)=>{try{
 const productos=await Producto.find({activo:true}).select('nombre sku stock stockMinimo proveedor').lean();
 res.json(productos.filter(p=>p.stock<=p.stockMinimo).map(p=>({...p,faltante:Math.max(0,p.stockMinimo-p.stock)})));
}catch(e){error(next,e);}});

/** Reposición segregada por sucursal. No usa el stock global del producto.
 * Las transferencias entre bodegas no se consideran demanda comercial.
 * Solo se contabilizan salidas vinculadas a pedidos; se excluyen ajustes manuales y transferencias.
 */
const {enteroLimitado,proyectarReposicion,clasificarPendientes}=require('../utils/pronosticoSucursal');
router.get('/sucursales/:id/reposicion',permiso('inventario.leer'),accesoSucursal,async(req,res,next)=>{
 try{
  const dias=enteroLimitado(req.query.dias,90,7,365);
  const plazo=enteroLimitado(req.query.plazo,7,1,180);
  if(dias===null||plazo===null)return res.status(422).json({mensaje:'Parámetros dias o plazo inválidos'});
  const bodegas=await BodegaSucursal.find({sucursal:req.sucursalAutorizada,activa:true}).select('_id').lean();
  const ids=bodegas.map(b=>b._id);
  const desde=new Date(Date.now()-dias*86400000);
  const [existencias,salidas,productos,ordenesAbiertas]=await Promise.all([
   Existencia.find({bodega:{$in:ids}}).select('producto cantidad').lean(),
   Movimiento.aggregate([{$match:{tipo:'salida',bodega:{$in:ids},createdAt:{$gte:desde},transferenciaId:{$exists:false},pedido:{$exists:true,$ne:null}}},{$group:{_id:'$producto',cantidad:{$sum:'$cantidad'}}}]),
   Producto.find({activo:true}).select('_id sku nombre stockMinimo proveedor').populate('proveedor','diasEntrega').lean(),
   Orden.find({sucursal:req.sucursalAutorizada,estado:{$in:['enviada','parcial']}}).select('items fechaEsperada').lean()
  ]);
  // Las órdenes vencidas se informan, pero no se descuentan como suministro confiable.
  const productosConPlazo=productos.map(p=>({...p,diasEntrega:p.proveedor?.diasEntrega}));
  const plazosProducto=new Map(productosConPlazo.map(p=>[String(p._id),p.diasEntrega]));
  const ordenesConPlazo=ordenesAbiertas.map(o=>({...o,items:(o.items||[]).map(i=>({...i,diasEntrega:plazosProducto.get(String(i.producto))}))}));
  const {pendientes,vencidos,inciertos,posteriores}=clasificarPendientes(ordenesConPlazo,new Date(),plazo);
  const filas=proyectarReposicion({existencias,salidas,productos:productosConPlazo,dias,plazo,pendientes,vencidos,inciertos,posteriores});
  const unidadesSugeridas=filas.reduce((n,f)=>{const suma=n+f.cantidadSugerida;if(!Number.isSafeInteger(suma))throw new Error('Total de reposición fuera de rango');return suma;},0);
  res.json({sucursal:req.sucursalAutorizada,dias,plazo,bodegasConsideradas:ids.length,filas,
   resumen:{productosPorReponer:filas.length,unidadesSugeridas,productosSinDemanda:filas.filter(f=>f.calidadEstimacion==='sin_demanda_historica').length,productosPorRevisar:filas.filter(f=>f.calidadEstimacion==='requiere_revision').length},
   pendientesVencidos:vencidos.length, pendientesSinFecha:inciertos.length, pendientesFueraPlazo:posteriores.length, nota:'Estimación orientativa por sede. Solo considera salidas vinculadas a pedidos como demanda. No descuenta órdenes con fecha esperada vencida; deben revisarse con el proveedor. Las órdenes sin fecha esperada o con entrega posterior al plazo de cada proveedor (o plazo general cuando no existe) se informan pero no se descuentan. No modela estacionalidad ni devoluciones.'});
 }catch(e){next(e);}
});

/** Seguimiento operativo de compras pendientes por sede. No modifica órdenes ni existencias. */
router.get('/sucursales/:id/compras-pendientes',permiso('inventario.leer'),accesoSucursal,async(req,res,next)=>{
 try{
  const plazo=enteroLimitado(req.query.plazo,7,1,180);
  const pagina=enteroLimitado(req.query.pagina,1,1,100000);
  const limite=enteroLimitado(req.query.limite,20,1,100);
  if(plazo===null||pagina===null||limite===null)return res.status(422).json({mensaje:'Parámetros de consulta inválidos'});
  const filtro={sucursal:req.sucursalAutorizada,estado:{$in:['enviada','parcial']}};
  const total=await Orden.countDocuments(filtro);
  // No se permite una página cuyo desplazamiento supere el entero seguro.
  const desplazamiento=(pagina-1)*limite;
  if(!Number.isSafeInteger(desplazamiento))return res.status(422).json({mensaje:'Página fuera de rango'});
  const ordenes=await Orden.find(filtro).select('_id numero proveedor items fechaEsperada estado createdAt')
    .sort({createdAt:-1,_id:-1}).skip(desplazamiento).limit(limite).lean();
  const ids=[...new Set(ordenes.flatMap(o=>(o.items||[]).map(i=>String(i.producto))))];
  const productos=await Producto.find({_id:{$in:ids}}).select('_id sku nombre proveedor').populate('proveedor','diasEntrega').lean();
  const mapa=new Map(productos.map(p=>[String(p._id),p]));
  const {resumirComprasPendientes}=require('../utils/pronosticoSucursal');
  const ordenesPlazo=ordenes.map(o=>({...o,items:(o.items||[]).map(i=>({...i,
    diasEntrega:mapa.get(String(i.producto))?.proveedor?.diasEntrega}))}));
  const {filas,totales}=resumirComprasPendientes(ordenesPlazo,new Date(),plazo);
  res.json({sucursal:req.sucursalAutorizada,pagina,limite,total,paginas:Math.ceil(total/limite),
    filas:filas.map(f=>({...f,sku:mapa.get(String(f.producto))?.sku||null,
      nombre:mapa.get(String(f.producto))?.nombre||null})),totales,
    nota:'Solo órdenes abiertas de la sede autorizada. Los totales corresponden a la página consultada; no al conjunto completo.'});
 }catch(e){next(e);}
});

// 8. Exportación CSV segura: solo catálogo; importación se deja en modo vista previa.
const csv=(v)=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,'\'$&').replace(/"/g,'""')+'"';
router.get('/exportar/productos.csv',admin,async(req,res,next)=>{try{
 const productos=await Producto.find().select('sku nombre categoria precio costo stock stockMinimo activo').lean();
 const columnas=['sku','nombre','categoria','precio','costo','stock','stockMinimo','activo'];
 const contenido='\uFEFF'+columnas.join(',')+'\r\n'+productos.map(p=>columnas.map(c=>csv(p[c])).join(',')).join('\r\n');
 res.set('Content-Type','text/csv; charset=utf-8');res.set('Content-Disposition','attachment; filename="productos.csv"');res.send(contenido);
}catch(e){error(next,e);}});
router.post('/importar/productos/previsualizar',admin,body('filas').isArray({min:1,max:200}),valido,async(req,res,next)=>{try{
 const vistos=new Set();const errores=[];const skus=[];
 for(const [i,f] of req.body.filas.entries()){
  const sku=typeof f?.sku==='string'?f.sku.trim().toUpperCase():'';
  const nombre=typeof f?.nombre==='string'?f.nombre.trim():'';
  const campos=['sku','nombre','precio','costo','categoria','stockMinimo'];
  if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!campos.includes(k))||!/^[A-Z0-9_-]{2,80}$/.test(sku)||!nombre||nombre.length>200||typeof f.precio!=='number'||!Number.isFinite(f.precio)||f.precio<0||typeof f.costo!=='number'||!Number.isFinite(f.costo)||f.costo<0||!Number.isInteger(f.stockMinimo??5)||(f.stockMinimo??5)<0||vistos.has(sku))errores.push({fila:i+1,motivo:'Datos inválidos, campos no autorizados o SKU repetido'});
  else{vistos.add(sku);skus.push(sku);}
 }
 const existentes=await Producto.find({sku:{$in:skus}}).select('sku').lean();
 for(const p of existentes)errores.push({sku:p.sku,motivo:'SKU existente en base de datos'});
 res.json({total:req.body.filas.length,errores,validas:req.body.filas.length-errores.length,puedeConfirmar:errores.length===0,nota:'Vista previa; no modifica datos. Confirmación vuelve a validar dentro de transacción.'});
}catch(e){next(e);}});
// Registro explícito de motivos de modificación. Nunca acepta contraseñas, tokens ni cuerpos completos.
router.post('/auditoria/eventos',admin,
 body('entidad').isIn(['producto','orden_compra','sucursal','configuracion']),
 body('registroId').isMongoId(),body('motivo').isString().trim().isLength({min:5,max:500}),
 body('antes').isObject(),body('despues').isObject(),valido,async(req,res,next)=>{try{
 const camposPermitidos=['estado','nombre','codigo','precio','stockMinimo','activa','notas'];
 const limpio=(obj)=>Object.fromEntries(Object.entries(obj).filter(([k,v])=>camposPermitidos.includes(k)&&['string','number','boolean'].includes(typeof v)));
 const antes=limpio(req.body.antes),despues=limpio(req.body.despues);
 if(!Object.keys(antes).length&&!Object.keys(despues).length)return res.status(422).json({mensaje:'No hay campos auditables'});
 const evento=await Auditoria.create({usuario:req.usuario.id,metodo:'CAMBIO',ruta:`${req.body.entidad}/${req.body.registroId}`,estado:200,fecha:new Date(),entidad:req.body.entidad,registroId:req.body.registroId,motivo:req.body.motivo,antes,despues});
 res.status(201).json({id:evento._id});
}catch(e){next(e);}});

/** Consulta segregada: los no administradores solo ven documentos de sus sedes asignadas.
 * Sin asignación explícita se deniega (fail closed). Los módulos heredados aún deben migrarse.
 */
router.get('/sucursales/:id/pedidos',permiso('pedidos.leer'),accesoSucursal,async(req,res,next)=>{try{
 const Pedido=require('../models/Pedido');
 const pedidos=await Pedido.find({sucursal:req.sucursalAutorizada}).sort({createdAt:-1}).limit(100).lean();
 res.json({pedidos,nota:'Solo pedidos con sucursal asignada explícitamente'});
}catch(e){next(e);}});
/** Inventario de una sede: nunca incluye existencias de bodegas de otra sucursal. */
router.get('/sucursales/:id/existencias',permiso('inventario.leer'),accesoSucursal,async(req,res,next)=>{try{
 const bodegas=await BodegaSucursal.find({sucursal:req.sucursalAutorizada,activa:true}).select('_id nombre').lean();
 const existencias=await Existencia.find({bodega:{$in:bodegas.map(b=>b._id)}}).populate('producto','sku nombre').lean();
 res.json({sucursal:req.sucursalAutorizada,bodegas,existencias});
}catch(e){next(e);}});
/** Indicadores históricos agregados por mes. No se infiere utilidad neta sin costos completos. */
router.get('/indicadores/historicos',admin,async(req,res,next)=>{try{
 const meses=Math.min(Math.max(Number(req.query.meses)||6,1),24);
 const desde=new Date();desde.setUTCDate(1);desde.setUTCHours(0,0,0,0);desde.setUTCMonth(desde.getUTCMonth()-meses+1);
 const ventas=await Documento.aggregate([{$match:{tipo:'factura',estado:'emitida',createdAt:{$gte:desde}}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$createdAt'}},total:{$sum:'$total'},facturas:{$sum:1}}},{$sort:{_id:1}}]);
 res.json({ventas,nota:'Ingresos facturados; no representa utilidad neta ni recaudo bancario'});
}catch(e){next(e);}});
/** Pronóstico básico: promedio diario de salidas y días de abastecimiento configurados. */
router.get('/reposicion/pronostico',admin,async(req,res,next)=>{try{
 const dias=Math.min(Math.max(Number(req.query.dias)||90,7),365);
 const plazo=Math.min(Math.max(Number(req.query.plazo)||7,1),180);
 const desde=new Date(Date.now()-dias*86400000);
 const [productos,salidas]=await Promise.all([Producto.find({activo:true}).select('nombre sku stock stockMinimo').lean(),Movimiento.aggregate([{$match:{tipo:'salida',createdAt:{$gte:desde}}},{$group:{_id:'$producto',cantidad:{$sum:'$cantidad'}}}])]);
 const cantidades=new Map(salidas.map(x=>[String(x._id),x.cantidad]));
 res.json({dias,plazo,filas:productos.map(p=>{const promedio=(cantidades.get(String(p._id))||0)/dias;const punto=Math.ceil(promedio*plazo+p.stockMinimo);return {producto:p._id,sku:p.sku,nombre:p.nombre,stock:p.stock,demandaDiaria:cent(promedio),puntoPedido:punto,cantidadSugerida:Math.max(0,punto-p.stock)};}).filter(x=>x.cantidadSugerida>0),nota:'Estimación orientativa: movimientos históricos no equivalen necesariamente a demanda; validar tiempos de entrega'});
}catch(e){next(e);}});
/** Importación confirmada con control de duplicados; nunca modifica stock. */
/** Importación JSON atómica: todos los productos o ninguno (MongoDB replica set requerido). */
router.post('/importar/productos/confirmar',admin,body('filas').isArray({min:1,max:200}),valido,async(req,res,next)=>{
 const filas=req.body.filas;
 const vistos=new Set();const errores=[];const limpios=[];
 for(let i=0;i<filas.length;i++){
  const f=filas[i];const permitidos=['sku','nombre','precio','costo','categoria','stockMinimo'];
  if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!permitidos.includes(k))){errores.push({fila:i+1,motivo:'Campos no autorizados'});continue;}
  const sku=typeof f.sku==='string'?f.sku.trim().toUpperCase():'';
  const nombre=typeof f.nombre==='string'?f.nombre.trim():'';
  if(!/^[A-Z0-9_-]{2,80}$/.test(sku)||!nombre||nombre.length>200||typeof f.precio!=='number'||!Number.isFinite(f.precio)||f.precio<0||typeof f.costo!=='number'||!Number.isFinite(f.costo)||f.costo<0||!Number.isInteger(f.stockMinimo??5)||(f.stockMinimo??5)<0||vistos.has(sku)){
   errores.push({fila:i+1,motivo:'Datos inválidos o SKU duplicado en el lote'});continue;
  }
  vistos.add(sku);limpios.push({sku,nombre,precio:f.precio,costo:f.costo,categoria:typeof f.categoria==='string'?f.categoria.slice(0,100):'',stockMinimo:f.stockMinimo??5,stock:0});
 }
 if(errores.length)return res.status(422).json({mensaje:'No se importó ningún producto',errores});
 const session=await mongoose.startSession();
 try{
  let creados=[];
  await session.withTransaction(async()=>{
   const existentes=await Producto.find({sku:{$in:[...vistos]}}).select('sku').session(session).lean();
   if(existentes.length){const conflicto=new Error('SKU existente');conflicto.status=409;conflicto.skus=existentes.map(x=>x.sku);throw conflicto;}
   creados=await Producto.insertMany(limpios,{session,ordered:true});
  });
  return res.status(201).json({creados:creados.length,skus:creados.map(x=>x.sku),nota:'Importación atómica; stock inicial siempre cero'});
 }catch(e){
  if(e.status===409||e.code===11000)return res.status(409).json({mensaje:'SKU ya registrado; no se importó el lote',skus:e.skus||[]});
  return next(e);
 }finally{await session.endSession();}
});


/** Administración de asignaciones: solo admin. Nunca aceptar un rol o sucursal sin validarlos en BD. */
router.get('/sucursales/asignaciones/usuarios', admin, async (req,res,next)=>{try {
 const usuarios=await UsuarioSucursal.find({}).select('nombre email role activo sucursal sucursales').sort({nombre:1}).lean();
 res.json(usuarios);
} catch(e){next(e);} });
router.get('/sucursales/asignaciones/bodegas', admin, async(req,res,next)=>{try {
 res.json(await BodegaSucursal.find({}).select('nombre activa sucursal').sort({nombre:1}).lean());
} catch(e){next(e);} });
router.patch('/sucursales/asignaciones/usuarios/:id', admin, async(req,res,next)=>{try {
 const mongoose=require('mongoose');
 if(!mongoose.isValidObjectId(req.params.id) || !Array.isArray(req.body.sucursales) || req.body.sucursales.length>30 ||
    req.body.sucursales.some(id=>!mongoose.isValidObjectId(id)))
   return res.status(422).json({mensaje:'Lista de sucursales inválida'});
 const ids=[...new Set(req.body.sucursales.map(String))];
 if(await Sucursal.countDocuments({_id:{$in:ids},activa:true})!==ids.length)
   return res.status(422).json({mensaje:'Una o más sucursales no están activas'});
 const usuario=await UsuarioSucursal.findByIdAndUpdate(req.params.id,{$set:{sucursales:ids,sucursal:ids[0]||null}},{new:true,runValidators:true}).select('nombre email role sucursal sucursales');
 if(!usuario)return res.status(404).json({mensaje:'Usuario no encontrado'});
 res.json(usuario);
} catch(e){next(e);} });
router.patch('/sucursales/asignaciones/bodegas/:id',admin,async(req,res,next)=>{try {
 const mongoose=require('mongoose');
 if(!mongoose.isValidObjectId(req.params.id)||!mongoose.isValidObjectId(req.body.sucursal))return res.status(422).json({mensaje:'Identificadores inválidos'});
 if(!await Sucursal.exists({_id:req.body.sucursal,activa:true}))return res.status(422).json({mensaje:'Sucursal inactiva o inexistente'});
 const bodega=await BodegaSucursal.findById(req.params.id);
 if(!bodega)return res.status(404).json({mensaje:'Bodega no encontrada'});
 // No cambiar la sede de una bodega con existencias: requiere traslado formal de stock.
 if(bodega.sucursal && String(bodega.sucursal)!==String(req.body.sucursal) && await Existencia.exists({bodega:bodega._id,cantidad:{$gt:0}}))
   return res.status(409).json({mensaje:'Bodega con existencias: requiere traslado de inventario'});
 bodega.sucursal=req.body.sucursal;await bodega.save();res.json(bodega);
} catch(e){next(e);} });

module.exports=router;
