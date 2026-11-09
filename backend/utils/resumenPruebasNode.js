/** Lee el resumen TAP de node --test sin confundir pruebas omitidas con aprobadas. */
function resumirPruebasNode(salida, codigo) {
  const campos = { tests: 'total', pass: 'aprobadas', fail: 'fallidas', skipped: 'omitidas', cancelled: 'canceladas', todo: 'pendientes' };
  const conteos = {};
  for (const [clave, destino] of Object.entries(campos)) {
    const coincidencias = [...String(salida).matchAll(new RegExp(`^# ${clave} (\\d+)\\s*$`, 'gm'))];
    if (coincidencias.length) conteos[destino] = Number(coincidencias.at(-1)[1]);
  }
  const completo = Object.keys(campos).every(c => conteos[campos[c]] !== undefined);
  return { resumenPruebas: { ...conteos, completo, valido: codigo === 0 && completo && conteos.fallidas === 0 && conteos.canceladas === 0 && conteos.aprobadas + conteos.fallidas + conteos.omitidas + conteos.canceladas + conteos.pendientes === conteos.total } };
}
module.exports = { resumirPruebasNode };
