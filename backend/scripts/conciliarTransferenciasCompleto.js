/** Auditoría de lectura. No cambia existencias, movimientos ni transferencias. */
require('dotenv').config();
const mongoose = require('mongoose');
const Transferencia = require('../models/TransferenciaInventario');
const Movimiento = require('../models/MovimientoInventario');
const Existencia = require('../models/Existencia');
const { conciliarTransferencias } = require('../utils/conciliacionMovimientos');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI es obligatorio');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  // Se carga en lotes de lectura desde el cursor, evitando traer documentos completos.
  const [transferencias, movimientos, existencias] = await Promise.all([
    Transferencia.find().select('_id producto origen destino cantidad').lean(),
    Movimiento.find({ transferenciaId: { $exists: true, $ne: null } }).select('_id transferenciaId producto bodega tipo cantidad').lean(),
    Existencia.find().select('producto bodega cantidad').lean()
  ]);
  const resultado = conciliarTransferencias(transferencias, movimientos, existencias);
  process.stdout.write(JSON.stringify({ generadoEn: new Date().toISOString(), soloLectura: true, ...resultado }, null, 2) + '\n');
  if (resultado.hallazgos.length) process.exitCode = 2;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
