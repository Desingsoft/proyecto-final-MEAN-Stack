/** Protege las pruebas que crean y eliminan documentos.
 * Solo acepta una base explícita de pruebas y rechaza nombres reservados.
 */
function validarBasePruebas(uri) {
  if (typeof uri !== 'string' || !uri.trim()) return false;
  try {
    const url = new URL(uri);
    if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol)) return false;
    const base = decodeURIComponent(url.pathname.slice(1));
    if (!/^[a-zA-Z0-9_-]+$/.test(base) || !/(?:^|[_-])(test|prueba)(?:$|[_-]|[0-9])|(?:test|prueba)$/i.test(base)) return false;
    if (/^(admin|local|config|production|produccion|inventario_pedidos)$/i.test(base)) return false;
    if (url.searchParams.has('authSource') && /^(admin|local)$/i.test(base)) return false;
    return true;
  } catch { return false; }
}
module.exports = { validarBasePruebas };
