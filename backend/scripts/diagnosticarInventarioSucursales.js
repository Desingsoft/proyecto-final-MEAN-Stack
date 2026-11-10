/** Diagnóstico SOLO LECTURA: no corrige datos ni crea sucursales. */
require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const Existencia = require('../models/Existencia');
const Bodega = require('../models/Bodega');
const { evaluarExistencias } = require('../utils/diagnosticoInventario');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  const [productos, existencias, bodegas] = await Promise.all([
    Producto.find().select('_id stock').lean(),
    Existencia.find().select('producto bodega cantidad').lean(),
    Bodega.find().select('_id sucursal').lean()
  ]);
  const resultado = evaluarExistencias(productos, existencias, bodegas);
  process.stdout.write(JSON.stringify({ generadoEn: new Date().toISOString(), soloLectura: true, ...resultado }, null, 2) + '\n');
  if (resultado.hallazgos.length) process.exitCode = 2;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
