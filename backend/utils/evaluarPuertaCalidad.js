/** Política explícita: pruebas omitidas son advertencia, no pruebas aprobadas. */
function evaluarPuertaCalidad(resultados) {
  const bloqueos = [], advertencias = [];
  for (const r of resultados) {
    if (r.obligatorio && r.estado !== 'correcto') bloqueos.push(`${r.nombre}: ${r.estado}`);
    if (r.nombre === 'Pruebas automatizadas backend') {
      if (!r.resumenPruebas?.valido) bloqueos.push('Resumen de pruebas ausente o inconsistente');
      if ((r.resumenPruebas?.omitidas || 0) > 0) advertencias.push(`${r.resumenPruebas.omitidas} pruebas omitidas: no equivalen a validación real`);
    }
  }
  return { aprobado: bloqueos.length === 0, listoParaProduccion: false, bloqueos, advertencias,
    nota: 'La puerta de calidad comprueba sintaxis, pruebas y compilación; no certifica integración con MongoDB ni seguridad productiva.' };
}
module.exports = { evaluarPuertaCalidad };
