/** Huella estable de una operación financiera. No incluir timestamps generados por el servidor. */
const { createHash } = require('node:crypto');
const huellaOperacion = (tipo, destino, datos) => createHash('sha256')
  .update(JSON.stringify({ tipo, destino: String(destino), monto: datos.monto,
    metodo: datos.metodo, fecha: datos.fechaSolicitada || null,
    referencia: datos.referencia, nota: datos.nota })).digest('hex');
module.exports = { huellaOperacion };
