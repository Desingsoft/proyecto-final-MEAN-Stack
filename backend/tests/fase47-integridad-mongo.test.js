/** Pruebas reales de transacciones e índices. Solo se activan con base TEST explícita. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { validarBasePruebas } = require('../utils/validarBasePruebas');
const uri = process.env.MONGO_TEST_URI;
const habilitado = validarBasePruebas(uri);

test('MongoDB: rollback conserva saldo cuando falla la segunda actualización', {
  skip: !habilitado ? 'MONGO_TEST_URI no configurado' : false
}, async () => {
  const mongoose = require('mongoose');
  const Producto = require('../models/Producto');
  const Bodega = require('../models/Bodega');
  const Sucursal = require('../models/Sucursal');
  const Existencia = require('../models/Existencia');
  const { conTransaccion } = require('../utils/transaccion');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 7000 });
  const suf = crypto.randomBytes(6).toString('hex');
  let sede, origen, destino, producto;
  try {
    sede = await Sucursal.create({ nombre: `Rollback ${suf}`, codigo: `R${suf}` });
    origen = await Bodega.create({ nombre: `Origen ${suf}`, codigo: `RO${suf}`, sucursal: sede._id, activa: true });
    destino = await Bodega.create({ nombre: `Destino ${suf}`, codigo: `RD${suf}`, sucursal: sede._id, activa: true });
    producto = await Producto.create({ nombre: `Producto ${suf}`, sku: `ROLL${suf}`, precio: 100, costo: 50, stock: 12, activo: true });
    await Existencia.create([{ producto: producto._id, bodega: origen._id, cantidad: 12 }, { producto: producto._id, bodega: destino._id, cantidad: 0 }]);
    await assert.rejects(conTransaccion(async session => {
      const salida = await Existencia.updateOne({ producto: producto._id, bodega: origen._id, cantidad: { $gte: 7 } }, { $inc: { cantidad: -7 } }, { session });
      assert.equal(salida.modifiedCount, 1);
      throw new Error('Fallo simulado antes de acreditar destino');
    }), /Fallo simulado/);
    const [a, d] = await Promise.all([Existencia.findOne({ producto: producto._id, bodega: origen._id }), Existencia.findOne({ producto: producto._id, bodega: destino._id })]);
    assert.equal(a.cantidad, 12);
    assert.equal(d.cantidad, 0);
  } finally {
    if (producto) { await Existencia.deleteMany({ producto: producto._id }); await Producto.deleteOne({ _id: producto._id }); }
    if (origen || destino) await Bodega.deleteMany({ _id: { $in: [origen?._id, destino?._id].filter(Boolean) } });
    if (sede) await Sucursal.deleteOne({ _id: sede._id });
    await mongoose.disconnect();
  }
});

test('MongoDB: índice único rechaza dos transferencias con la misma clave', {
  skip: !habilitado ? 'MONGO_TEST_URI no configurado' : false
}, async () => {
  const mongoose = require('mongoose');
  const Transferencia = require('../models/TransferenciaInventario');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 7000 });
  const clave = `fase47_${crypto.randomBytes(12).toString('hex')}`;
  const id = () => new mongoose.Types.ObjectId();
  const datos = { claveIdempotencia: clave, huellaSolicitud: 'a'.repeat(64), producto: id(), origen: id(), destino: id(), cantidad: 1, motivo: 'Prueba índice', registradoPor: id() };
  try {
    await Transferencia.init();
    await Transferencia.create(datos);
    await assert.rejects(Transferencia.create({ ...datos, huellaSolicitud: 'b'.repeat(64) }), err => err.code === 11000);
    assert.equal(await Transferencia.countDocuments({ claveIdempotencia: clave }), 1);
  } finally {
    await Transferencia.deleteMany({ claveIdempotencia: clave });
    await mongoose.disconnect();
  }
});
