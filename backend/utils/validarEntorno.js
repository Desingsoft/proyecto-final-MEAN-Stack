/** Validación previa sin exponer secretos en mensajes ni reportes. */
function validarEntorno(env = process.env) {
  const errores = [], advertencias = [];
  const produccion = env.NODE_ENV === 'production';
  if (!String(env.MONGODB_URI || '').trim()) errores.push('MONGODB_URI no configurada');
  const secreto = String(env.JWT_SECRET || '');
  if (!secreto) errores.push('JWT_SECRET no configurado');
  else if (secreto.length < 32 || secreto.startsWith('cambia_esto')) {
    (produccion ? errores : advertencias).push('JWT_SECRET debe tener al menos 32 caracteres y no ser el valor de ejemplo');
  }
  const origenes = String(env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (produccion && !origenes.length) errores.push('CORS_ORIGINS obligatorio en producción');
  for (const origen of origenes) {
    let url;
    try { url = new URL(origen); } catch { errores.push('CORS_ORIGINS contiene un origen inválido'); continue; }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origen || url.username || url.password) {
      errores.push('CORS_ORIGINS debe contener orígenes HTTP(S) sin rutas ni credenciales');
    } else if (produccion && url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      advertencias.push('CORS_ORIGINS contiene un origen HTTP sin TLS');
    }
  }
  if (produccion && env.PERMITIR_SIN_TRANSACCION === 'true') errores.push('PERMITIR_SIN_TRANSACCION no debe habilitarse en producción');
  return { valido: errores.length === 0, errores: [...new Set(errores)], advertencias: [...new Set(advertencias)], origenes };
}
module.exports = { validarEntorno };
