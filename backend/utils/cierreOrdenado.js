/** Cierre controlado para despliegues Docker y reinicios de servicio. */
function crearCierreOrdenado({ servidor, desconectar, detenerMonitor = () => {}, registrar = () => {}, tiempoMaximoMs = 10000 }) {
  let cierre = null;
  return function cerrar(senal = 'SIGTERM') {
    if (cierre) return cierre;
    cierre = (async () => {
      registrar(`Cerrando servidor por ${senal}`);
      detenerMonitor();
      let temporizador;
      try {
        await Promise.race([
          new Promise((resolve, reject) => servidor.close(error => error ? reject(error) : resolve())),
          new Promise((_, reject) => { temporizador = setTimeout(() => reject(new Error('Tiempo máximo de cierre agotado')), tiempoMaximoMs); })
        ]);
      } finally {
        clearTimeout(temporizador);
        await desconectar();
      }
    })();
    return cierre;
  };
}
module.exports = { crearCierreOrdenado };
