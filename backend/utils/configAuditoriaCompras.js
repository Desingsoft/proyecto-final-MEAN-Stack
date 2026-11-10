/** Validación estricta de filtros de auditoría, independiente de MongoDB. */
function fechaCalendario(valor, campo) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new Error(`${campo} debe ser YYYY-MM-DD`);
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0,10) !== valor) throw new Error(`${campo} no es fecha calendario válida`);
  return fecha;
}
function configurarAuditoria(env, esObjectId) {
  const limite = env.AUDITORIA_MAX_HALLAZGOS === undefined ? 1000 : Number(env.AUDITORIA_MAX_HALLAZGOS);
  if (!Number.isSafeInteger(limite) || limite < 0 || limite > 100000) throw new Error('AUDITORIA_MAX_HALLAZGOS debe ser entero entre 0 y 100000');
  const filtro = {};
  if (env.AUDITORIA_SUCURSAL) {
    if (!esObjectId(env.AUDITORIA_SUCURSAL)) throw new Error('AUDITORIA_SUCURSAL debe ser ObjectId válido');
    filtro.sucursal = env.AUDITORIA_SUCURSAL;
  }
  const desde = env.AUDITORIA_DESDE ? fechaCalendario(env.AUDITORIA_DESDE, 'AUDITORIA_DESDE') : null;
  const hasta = env.AUDITORIA_HASTA ? fechaCalendario(env.AUDITORIA_HASTA, 'AUDITORIA_HASTA') : null;
  if (desde && hasta && desde > hasta) throw new Error('AUDITORIA_DESDE no puede superar AUDITORIA_HASTA');
  if (desde || hasta) {
    filtro.createdAt = {};
    if (desde) filtro.createdAt.$gte = desde;
    if (hasta) {
      const exclusivo = new Date(hasta.getTime() + 86400000);
      if (!Number.isFinite(exclusivo.getTime())) throw new Error('AUDITORIA_HASTA fuera de rango');
      filtro.createdAt.$lt = exclusivo;
    }
  }
  return { limite, filtro, filtros: {sucursal:env.AUDITORIA_SUCURSAL || null,desde:env.AUDITORIA_DESDE || null,hasta:env.AUDITORIA_HASTA || null} };
}
module.exports = {fechaCalendario, configurarAuditoria};
