/** Puerto abstracto para un proveedor tecnológico habilitado por la DIAN.
 * No firma, no calcula CUFE ni emite documentos por sí mismo.
 * Un adaptador concreto debe verificar credenciales, certificado, ambiente y homologación.
 */
class IntegracionNoConfigurada extends Error {
 constructor(){super('Proveedor tecnológico no configurado; no se ha emitido factura electrónica');this.code='PROVEEDOR_NO_CONFIGURADO';}
}
class AdaptadorFacturacion {
 async emitir(_documento){throw new IntegracionNoConfigurada();}
 async consultarEstado(_identificador){throw new IntegracionNoConfigurada();}
 async descargarXml(_identificador){throw new IntegracionNoConfigurada();}
}
/** Normaliza respuestas del proveedor sin aceptar estados falsos de validación. */
function validarRespuestaProveedor(respuesta){
 if(!respuesta||typeof respuesta!=='object'||!['aceptada','rechazada','pendiente'].includes(respuesta.estado))throw new TypeError('Respuesta de proveedor inválida');
 if(respuesta.estado==='aceptada'&&(!respuesta.cufe||!respuesta.identificador))throw new TypeError('Aceptación sin CUFE o identificador');
 if (respuesta.cufe != null && (typeof respuesta.cufe !== 'string' || !/^[a-fA-F0-9]{96}$/.test(respuesta.cufe))) throw new TypeError('CUFE inválido: se esperan 96 caracteres hexadecimales');
 if (respuesta.identificador != null && (typeof respuesta.identificador !== 'string' || !/^[a-zA-Z0-9_.:-]{1,150}$/.test(respuesta.identificador))) throw new TypeError('Identificador del proveedor inválido');
 if (respuesta.observacion != null && typeof respuesta.observacion !== 'string') throw new TypeError('Observación inválida');
 return {estado:respuesta.estado,cufe:respuesta.cufe||null,identificador:respuesta.identificador||null,observacion:String(respuesta.observacion||'').slice(0,500)};
}
module.exports={AdaptadorFacturacion,IntegracionNoConfigurada,validarRespuestaProveedor};
