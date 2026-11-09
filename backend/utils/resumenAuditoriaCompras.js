/** Acumulación acotada de auditoría. Conserva totales incluso al truncar detalles. */
const campos=['ordenes','lineas','recepciones','unidadesSolicitadas','unidadesRecibidas'];
function crearAcumulador(maxHallazgos=1000){
  if(!Number.isSafeInteger(maxHallazgos)||maxHallazgos<0||maxHallazgos>100000)throw new RangeError('Límite de hallazgos inválido');
  return {resumen:Object.fromEntries(campos.map(c=>[c,0])),totalHallazgos:0,hallazgosOmitidos:0,limiteHallazgos:maxHallazgos,hallazgos:[],codigos:{}};
}
function agregarResultado(acumulado,resultado){
  for(const campo of campos){
    const valor=resultado.resumen[campo];
    if(!Number.isSafeInteger(valor)||valor<0||!Number.isSafeInteger(acumulado.resumen[campo]+valor))throw new RangeError(`Total de auditoría fuera de rango: ${campo}`);
    acumulado.resumen[campo]+=valor;
  }
  for(const hallazgo of resultado.hallazgos){
    if(!Number.isSafeInteger(acumulado.totalHallazgos+1))throw new RangeError('Demasiados hallazgos');
    acumulado.totalHallazgos++;
    const codigo=hallazgo.codigo||'SIN_CODIGO';
    const siguienteCodigo=(acumulado.codigos[codigo]||0)+1;
    if(!Number.isSafeInteger(siguienteCodigo))throw new RangeError(`Conteo de hallazgos fuera de rango: ${codigo}`);
    acumulado.codigos[codigo]=siguienteCodigo;
    if(acumulado.hallazgos.length<acumulado.limiteHallazgos)acumulado.hallazgos.push(hallazgo);
    else acumulado.hallazgosOmitidos++;
  }
  return acumulado;
}
module.exports={crearAcumulador,agregarResultado};
