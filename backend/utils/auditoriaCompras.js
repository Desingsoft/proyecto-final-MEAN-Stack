/** Auditoría de órdenes de compra y sus recepciones. Solo lectura, sin dependencias externas. */
const id = valor => valor == null ? '' : String(valor);
function fechaValida(valor) {
  if (valor == null || valor === '') return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isFinite(fecha.getTime()) ? fecha.getTime() : NaN;
}
function auditarRecepciones(ordenes) {
  const hallazgos=[];
  const resumen={ordenes:0,lineas:0,recepciones:0,unidadesSolicitadas:0,unidadesRecibidas:0};
  function agregar(orden,codigo,detalle){hallazgos.push({orden:id(orden._id),numero:orden.numero||'',codigo,detalle});}
  function sumarSeguro(orden,campo,cantidad){
    const nuevo=resumen[campo]+cantidad;
    if(!Number.isSafeInteger(nuevo)){agregar(orden,'TOTAL_FUERA_RANGO',campo);return;}
    resumen[campo]=nuevo;
  }
  for(const orden of ordenes){
    sumarSeguro(orden,'ordenes',1);
    const solicitadas=new Map(), recibidasDeclaradas=new Map(), recibidasRegistradas=new Map();
    let totalCalculado=0, costoVerificable=true;
    if(!orden.proveedor)agregar(orden,'PROVEEDOR_FALTANTE','Orden sin proveedor');
    if(!Array.isArray(orden.items)||orden.items.length===0)agregar(orden,'ORDEN_SIN_ITEMS','Orden sin productos');
    if(!Array.isArray(orden.recepciones))agregar(orden,'HISTORIAL_RECEPCIONES_INVALIDO','El historial de recepciones no es una lista');
    if(orden.fechaEsperada!=null && (!Number.isFinite(new Date(orden.fechaEsperada).getTime())))agregar(orden,'FECHA_ESPERADA_INVALIDA','Fecha esperada no válida');
    if(!['borrador','enviada','parcial','recibida','cancelada'].includes(orden.estado))agregar(orden,'ESTADO_DESCONOCIDO',`Estado ${String(orden.estado)}`);
    for(const linea of Array.isArray(orden.items)?orden.items:[]){
      sumarSeguro(orden,'lineas',1);
      const producto=id(linea.producto),cantidad=linea.cantidad,recibida=linea.cantidadRecibida??0;
      if(!producto){agregar(orden,'PRODUCTO_FALTANTE','Línea sin producto');costoVerificable=false;continue;}
      if(!Number.isSafeInteger(cantidad)||cantidad<=0||!Number.isSafeInteger(recibida)||recibida<0||recibida>cantidad){
        agregar(orden,'CANTIDAD_INVALIDA',`Producto ${producto}`);costoVerificable=false;continue;
      }
      // La creación de órdenes redondea al peso la suma de cantidad × costoUnitario.
      // Comprobar el total almacenado permite detectar ediciones o importaciones corruptas.
      if(!Number.isFinite(linea.costoUnitario)||linea.costoUnitario<0 || !Number.isFinite(cantidad*linea.costoUnitario) || !Number.isSafeInteger(Math.round(cantidad*linea.costoUnitario))){
        agregar(orden,'COSTO_UNITARIO_INVALIDO',`Producto ${producto}`);costoVerificable=false;
      } else {
        totalCalculado+=cantidad*linea.costoUnitario;
        if(!Number.isFinite(totalCalculado)||!Number.isSafeInteger(Math.round(totalCalculado))){agregar(orden,'TOTAL_MONETARIO_FUERA_RANGO',`Producto ${producto}`);costoVerificable=false;}
      }
      if(solicitadas.has(producto))agregar(orden,'LINEA_DUPLICADA',`Producto ${producto} repetido`);
      const acumulado=(solicitadas.get(producto)||0)+cantidad;
      const acumuladoRecibido=(recibidasDeclaradas.get(producto)||0)+recibida;
      if(!Number.isSafeInteger(acumulado)||!Number.isSafeInteger(acumuladoRecibido)){agregar(orden,'CANTIDAD_FUERA_RANGO',`Producto ${producto}`);continue;}
      solicitadas.set(producto,acumulado);
      recibidasDeclaradas.set(producto,acumuladoRecibido);
      sumarSeguro(orden,'unidadesSolicitadas',cantidad);
      sumarSeguro(orden,'unidadesRecibidas',recibida);
    }
    const identificadoresRecepcion=new Set();
    const fechaCreacion=fechaValida(orden.createdAt);
    for(const recepcion of Array.isArray(orden.recepciones)?orden.recepciones:[]){
      // Los identificadores de recepciones permiten detectar registros repetidos
      // tras importaciones o restauraciones. No exigir _id en datos heredados.
      const identificador=id(recepcion._id);
      if(identificador){
        if(identificadoresRecepcion.has(identificador))agregar(orden,'RECEPCION_ID_DUPLICADO',`Recepción ${identificador} repetida`);
        identificadoresRecepcion.add(identificador);
      }
      const fechaRecepcion=fechaValida(recepcion.fecha);
      if(fechaRecepcion===null || Number.isNaN(fechaRecepcion)){
        agregar(orden,'RECEPCION_FECHA_INVALIDA',`Recepción ${identificador||'sin identificador'} sin fecha válida`);
      }else if(fechaCreacion!==null && !Number.isNaN(fechaCreacion) && fechaRecepcion<fechaCreacion-60000){
        agregar(orden,'RECEPCION_ANTERIOR_ORDEN',`Recepción ${identificador||'sin identificador'} anterior a la creación de la orden`);
      }
      sumarSeguro(orden,'recepciones',1);
      if(!recepcion.bodega)agregar(orden,'BODEGA_FALTANTE','Recepción sin bodega');
      const vistos=new Set();
      if(!Array.isArray(recepcion.items)||recepcion.items.length===0)agregar(orden,'RECEPCION_SIN_ITEMS','Recepción sin líneas');
      for(const linea of Array.isArray(recepcion.items)?recepcion.items:[]){
        const producto=id(linea.producto),cantidad=linea.cantidad;
        if(!producto||!Number.isSafeInteger(cantidad)||cantidad<=0){agregar(orden,'RECEPCION_INVALIDA',`Producto ${producto}`);continue;}
        if(vistos.has(producto))agregar(orden,'RECEPCION_DUPLICADA',`Producto ${producto} repetido en una recepción`);
        vistos.add(producto);
        if(!solicitadas.has(producto)){agregar(orden,'PRODUCTO_NO_SOLICITADO',`Producto ${producto}`);continue;}
        const nuevo=(recibidasRegistradas.get(producto)||0)+cantidad;
        if(!Number.isSafeInteger(nuevo)){agregar(orden,'RECEPCION_FUERA_RANGO',`Producto ${producto}`);continue;}
        recibidasRegistradas.set(producto,nuevo);
      }
    }
    if(!Number.isFinite(orden.total)||orden.total<0||!Number.isSafeInteger(Math.round(orden.total))){
      agregar(orden,'TOTAL_MONETARIO_INVALIDO','Total de orden inválido');
    }else if(costoVerificable && Math.abs(Math.round(totalCalculado)-orden.total)>0.01){
      agregar(orden,'TOTAL_MONETARIO_DESCUADRADO',`Total registrado ${orden.total}, calculado ${Math.round(totalCalculado)}`);
    }
    let totalSolicitado=0,totalRecibido=0;
    for(const [producto,cantidad] of solicitadas){
      const declarada=recibidasDeclaradas.get(producto)||0,registrada=recibidasRegistradas.get(producto)||0;
      if(declarada!==registrada)agregar(orden,'RECEPCION_DESCUADRADA',`Producto ${producto}: declarada ${declarada}, historial ${registrada}`);
      if(registrada>cantidad)agregar(orden,'SOBRERRECEPCION',`Producto ${producto}: ${registrada} de ${cantidad}`);
      if(!Number.isSafeInteger(totalSolicitado+cantidad)||!Number.isSafeInteger(totalRecibido+declarada)){agregar(orden,'TOTAL_ORDEN_FUERA_RANGO',`Producto ${producto}`);continue;}
      totalSolicitado+=cantidad;totalRecibido+=declarada;
    }
    const estado=orden.estado;
    if(estado==='recibida'&&totalRecibido!==totalSolicitado)agregar(orden,'ESTADO_INCONSISTENTE','Recibida sin todas las unidades');
    if((estado==='borrador'||estado==='enviada'||estado==='cancelada')&&totalRecibido>0)agregar(orden,'ESTADO_INCONSISTENTE',`${estado} con unidades recibidas`);
    if(estado==='parcial'&&(totalRecibido===0||totalRecibido===totalSolicitado))agregar(orden,'ESTADO_INCONSISTENTE','Parcial sin recepción parcial efectiva');
    if(estado==='cancelada'&&(orden.recepciones||[]).length>0)agregar(orden,'CANCELADA_CON_RECEPCIONES','Orden cancelada con historial de recepciones');
    if(estado==='recibida'&&totalSolicitado===0)agregar(orden,'RECIBIDA_SIN_PRODUCTOS','Orden recibida sin productos solicitados');
    if(!orden.sucursal)agregar(orden,'SUCURSAL_FALTANTE','Orden sin sucursal');
  }
  return {resumen,hallazgos};
}
module.exports={auditarRecepciones};
