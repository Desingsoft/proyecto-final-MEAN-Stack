/**
 * Conciliación de inventario global vs. existencias por bodega (solo lectura).
 * No crea bodegas ni ajusta stock. Revisar el reporte antes de cualquier migración.
 * Ejecución: desde backend, node scripts/conciliarBodegas.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Producto = require('../models/Producto');
const Existencia = require('../models/Existencia');
const MovimientoInventario = require('../models/MovimientoInventario');

/** Construye el informe con todos los productos y registros huérfanos. */
async function generarConciliacion() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  const productos = await Producto.find().select('_id sku nombre stock').lean();
  const existencias = await Existencia.aggregate([
    { $group: { _id: '$producto', ubicado: { $sum: '$cantidad' }, bodegas: { $sum: 1 } } }
  ]);
  // Movimientos por producto: saldo teórico de entradas menos salidas.
  // No sustituye el saldo inicial: sirve como pista para auditoría y rastreo.
  const movimientos = await MovimientoInventario.aggregate([
    { $group: { _id: '$producto', entradas: { $sum: { $cond: [{ $eq: ['$tipo', 'entrada'] }, '$cantidad', 0] } }, salidas: { $sum: { $cond: [{ $eq: ['$tipo', 'salida'] }, '$cantidad', 0] } }, total: { $sum: 1 } } }
  ]);
  const porMovimiento = new Map(movimientos.map(m => [String(m._id), m]));
  const porId = new Map(existencias.map(e => [String(e._id), e]));
  const filas = productos.map(producto => {
    const id = String(producto._id);
    const global = Number(producto.stock || 0);
    const ubicado = Number(porId.get(id)?.ubicado || 0);
    porId.delete(id);
    return {
      productoId: id, sku: producto.sku, nombre: producto.nombre,
      stockGlobal: global, stockBodegas: ubicado, diferencia: global - ubicado,
      movimientosRegistrados: porMovimiento.get(id)?.total || 0,
      entradasRegistradas: porMovimiento.get(id)?.entradas || 0,
      salidasRegistradas: porMovimiento.get(id)?.salidas || 0,
      // No se afirma igualdad con el stock: puede existir saldo inicial o migraciones previas.
      numeroBodegas: existencias.find(e => String(e._id) === id)?.bodegas || 0,
      requiereRevision: global !== ubicado || global < 0 || ubicado < 0
    };
  });
  // Las existencias cuyo producto ya no existe también requieren intervención.
  const huerfanos = [...porId].map(([productoId, registro]) => ({
    productoId, stockBodegas: registro.ubicado, numeroBodegas: registro.bodegas
  }));
  const reporte = {
    fecha: new Date().toISOString(), soloLectura: true,
    totalProductos: filas.length,
    productosConDiferencia: filas.filter(f => f.requiereRevision).length,
    existenciasHuerfanas: huerfanos.length, filas, huerfanos
  };
  const destino = path.resolve(process.cwd(), 'conciliacion-bodegas.json');
  fs.writeFileSync(destino, JSON.stringify(reporte, null, 2));
  console.log(`Informe: ${destino}. Diferencias: ${reporte.productosConDiferencia}; huérfanos: ${huerfanos.length}`);
  if (reporte.productosConDiferencia || huerfanos.length) process.exitCode = 2;
}

if (require.main === module) {
  generarConciliacion()
    .catch(error => { console.error('Conciliación fallida:', error); process.exitCode = 1; })
    .finally(async () => { await mongoose.disconnect(); });
}
module.exports = { generarConciliacion };
