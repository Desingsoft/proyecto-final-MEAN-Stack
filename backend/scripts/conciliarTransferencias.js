/** Auditoría de solo lectura: detecta transferencias sin su par entrada/salida. */
require('dotenv').config();
const mongoose = require('mongoose');
const Transferencia = require('../models/TransferenciaInventario');
const Movimiento = require('../models/MovimientoInventario');
const { evaluarTransferencia } = require('../utils/conciliacionTransferencias');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  const lote = 200;
  let revisadas = 0, inconsistentes = 0;
  const ejemplos = [];
  const cursor = Transferencia.find({}).lean().cursor();
  for await (const transferencia of cursor) {
    const movimientos = await Movimiento.find({ transferenciaId: transferencia._id }).lean();
    const resultado = evaluarTransferencia(transferencia, movimientos);
    revisadas++;
    if (!resultado.correcto) {
      inconsistentes++;
      if (ejemplos.length < lote) ejemplos.push(resultado);
    }
  }
  process.stdout.write(JSON.stringify({ generadoEn: new Date().toISOString(), soloLectura: true, revisadas, inconsistentes, ejemplos, ejemplosLimitados: inconsistentes > lote }, null, 2) + '\n');
  if (inconsistentes) process.exitCode = 2;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
