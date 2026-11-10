/** Inspección de solo lectura de MongoDB y configuración para piloto multisucursal.
 * No crea índices, no migra datos y no cambia existencias.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { INDICES, evaluarPreparacion } = require('../utils/evaluarPreparacion');
const { evaluarExistencias } = require('../utils/diagnosticoInventario');
const Producto = require('../models/Producto');
const Existencia = require('../models/Existencia');
const Bodega = require('../models/Bodega');
const Usuario = require('../models/Usuario');
const Pedido = require('../models/Pedido');
const Pago = require('../models/Pago');
const MovimientoInventario = require('../models/MovimientoInventario');
const TransferenciaInventario = require('../models/TransferenciaInventario');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI no configurada');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 6000 });
  const admin = mongoose.connection.db.admin();
  let replicaSet = false;
  try { const hello = await admin.command({ hello: 1 }); replicaSet = Boolean(hello.setName); } catch { replicaSet = false; }
  const modelos = { existencias: Existencia, transferenciainventarios: TransferenciaInventario, movimientoinventarios: MovimientoInventario };
  const indices = {};
  for (const requisito of INDICES) {
    const modelo = modelos[requisito.coleccion];
    try { indices[requisito.coleccion] = await modelo.collection.indexes(); }
    catch (e) { indices[requisito.coleccion] = []; }
  }
  const registrosSinSucursal = {
    usuarios: await Usuario.countDocuments({ rol: { $ne: 'admin' }, $or: [{ sucursales: { $exists: false } }, { sucursales: { $size: 0 } }] }),
    bodegas: await Bodega.countDocuments({ $or: [{ sucursal: null }, { sucursal: { $exists: false } }] }),
    pedidos: await Pedido.countDocuments({ $or: [{ sucursal: null }, { sucursal: { $exists: false } }] }),
    pagos: await Pago.countDocuments({ $or: [{ sucursal: null }, { sucursal: { $exists: false } }] }),
    movimientos: await MovimientoInventario.countDocuments({ $or: [{ sucursal: null }, { sucursal: { $exists: false } }] })
  };
  const [productos, existencias, bodegas] = await Promise.all([
    Producto.find().select('_id stock').lean(), Existencia.find().select('producto bodega cantidad').lean(), Bodega.find().select('_id sucursal').lean()
  ]);
  const inventario = evaluarExistencias(productos, existencias, bodegas);
  const secreto = process.env.JWT_SECRET || '';
  const resultado = evaluarPreparacion({ replicaSet, indices, registrosSinSucursal, diferencias: inventario.hallazgos.length,
    configuracion: { jwtSeguro: secreto.length >= 32 && !secreto.startsWith('cambia_esto'),
      corsRestringido: Boolean((process.env.CORS_ORIGINS || '').trim()),
      permitirSinTransaccion: process.env.PERMITIR_SIN_TRANSACCION === 'true' } });
  process.stdout.write(JSON.stringify({ generadoEn: new Date().toISOString(), soloLectura: true,
    ...resultado, registrosSinSucursal, hallazgosInventario: inventario.hallazgos.length }, null, 2) + '\n');
  if (!resultado.aptoParaPiloto) process.exitCode = 2;
}
main().catch(e => { console.error('Verificación fallida:', e.message); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
