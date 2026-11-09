/**
 * Contrato para implementar un proveedor tecnológico autorizado.
 * NO construye XML UBL, NO firma, NO calcula CUFE y NO envía a DIAN.
 * Las credenciales deben permanecer en el servidor y los callbacks deben verificarse
 * con la firma/secret del proveedor antes de procesar una respuesta.
 */
const { validarRespuestaProveedor } = require('./adaptadorFacturacion');
function interpretarRespuesta(datos) {
  const resultado = validarRespuestaProveedor(datos);
  if (resultado.estado === 'aceptada' && !resultado.cufe) throw new TypeError('Aceptación sin CUFE');
  return Object.freeze(resultado);
}
function exigirConfiguracion(config) {
  if (!config || !config.proveedor || !config.ambiente || !['habilitacion','produccion'].includes(config.ambiente))
    throw new Error('Proveedor electrónico y ambiente no configurados');
  if (!config.credencialesConfiguradas || !config.certificadoConfigurado)
    throw new Error('Faltan credenciales o certificado del proveedor');
  return true;
}
module.exports = { interpretarRespuesta, exigirConfiguracion };
