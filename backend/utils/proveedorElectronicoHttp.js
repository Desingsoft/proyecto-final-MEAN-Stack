/**
 * Adaptador HTTP configurable para un proveedor tecnológico seleccionado.
 * No supone endpoints, formatos XML ni credenciales de un proveedor específico.
 * El cliente HTTP se inyecta para permitir pruebas sin conexión y evitar
 * exponer tokens en logs. Solo se aceptan destinos HTTPS configurados.
 */
const { validarRespuestaProveedor } = require('./adaptadorFacturacion');
const { exigirConfiguracion } = require('./contratoProveedorElectronico');

function crearProveedorElectronico({ configuracion, transporte }) {
  exigirConfiguracion(configuracion);
  if (typeof transporte !== 'function') throw new TypeError('Se requiere un transporte HTTP autenticado');
  const base = configuracion.urlBase;
  if (typeof base !== 'string' || !/^https:\/\/[^\s]+$/i.test(base)) {
    throw new Error('La URL del proveedor debe ser HTTPS');
  }
  const operaciones = configuracion.operaciones;
  for (const operacion of ['emitir', 'consultarEstado', 'descargarXml']) {
    if (!operaciones || typeof operaciones[operacion] !== 'string' ||
        !/^\/[a-zA-Z0-9/_-]+$/.test(operaciones[operacion])) {
      throw new Error(`Ruta no configurada para ${operacion}`);
    }
  }
  async function ejecutar(operacion, datos) {
    // El transporte debe aplicar autenticación, timeout y TLS, sin redirecciones a otros hosts.
    const respuesta = await transporte({
      url: new URL(operaciones[operacion], base).toString(),
      operacion,
      datos,
      ambiente: configuracion.ambiente
    });
    if (operacion === 'descargarXml') {
      if (!respuesta || typeof respuesta.xml !== 'string' || !respuesta.xml.trim()) {
        throw new TypeError('El proveedor no entregó XML válido');
      }
      return respuesta.xml;
    }
    return validarRespuestaProveedor(respuesta);
  }
  return Object.freeze({
    emitir: documento => ejecutar('emitir', documento),
    consultarEstado: identificador => ejecutar('consultarEstado', { identificador }),
    descargarXml: identificador => ejecutar('descargarXml', { identificador })
  });
}
module.exports = { crearProveedorElectronico };
