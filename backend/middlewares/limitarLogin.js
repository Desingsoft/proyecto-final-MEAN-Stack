/**
 * Limitación de intentos de autenticación por IP y por pareja IP/correo.
 * El límite por IP impide eludir el control variando el correo en cada intento.
 * Los contadores se mantienen en memoria; para varias instancias usar Redis.
 */
const crypto = require('node:crypto');
const registros = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_IP = 60;
const MAX_POR_CUENTA_IP = 15;
const MAX_REGISTROS = 10000;

function huella(valor) {
  return crypto.createHash('sha256').update(valor).digest('hex');
}
function limpiarVencidos(ahora) {
  for (const [clave, valor] of registros) {
    if (valor.hasta <= ahora) registros.delete(clave);
  }
}
function incrementar(clave, ahora) {
  const anterior = registros.get(clave);
  const actual = anterior && anterior.hasta > ahora
    ? anterior : { cuenta: 0, hasta: ahora + VENTANA_MS };
  actual.cuenta += 1;
  registros.set(clave, actual);
  return actual;
}
/** Responde 429 sin revelar si existe la cuenta de correo. */
module.exports = (req, res, next) => {
  const ahora = Date.now();
  if (registros.size >= MAX_REGISTROS) limpiarVencidos(ahora);
  if (registros.size >= MAX_REGISTROS) {
    // Política conservadora: evitar que una inundación desactive el control.
    res.set('Retry-After', '60');
    return res.status(429).json({ mensaje: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' });
  }
  const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const porIp = incrementar('ip:' + huella(ip), ahora);
  const porCuenta = incrementar('cuenta:' + huella(ip + '|' + email), ahora);
  if (porIp.cuenta > MAX_POR_IP || porCuenta.cuenta > MAX_POR_CUENTA_IP) {
    const hasta = Math.max(porIp.cuenta > MAX_POR_IP ? porIp.hasta : 0,
      porCuenta.cuenta > MAX_POR_CUENTA_IP ? porCuenta.hasta : 0);
    res.set('Retry-After', String(Math.max(1, Math.ceil((hasta - ahora) / 1000))));
    return res.status(429).json({ mensaje: 'Demasiados intentos. Intenta nuevamente más tarde.' });
  }
  next();
};
