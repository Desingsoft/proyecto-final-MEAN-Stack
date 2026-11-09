/** Integración REAL opcional. Ejecutar con MONGO_TEST_URI apuntando a base exclusiva de pruebas.
 * Ejemplo: MONGO_TEST_URI=mongodb://localhost:27017/inventario_fase39_test npm test
 * Nunca ejecutar contra una base de producción: esta prueba crea y elimina datos.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const uri = process.env.MONGO_TEST_URI;
const { validarBasePruebas } = require('../utils/validarBasePruebas');
const enabled = validarBasePruebas(uri);

test('MongoDB real: transferencias concurrentes preservan el saldo y registran un solo traslado',
  { skip: !enabled ? 'Se requiere MONGO_TEST_URI con nombre de base que contenga test/prueba' : false },
  async () => {
    const mongoose = require('mongoose');
    const Producto = require('../models/Producto');
    const Bodega = require('../models/Bodega');
    const Sucursal = require('../models/Sucursal');
    const Existencia = require('../models/Existencia');
    const Transferencia = require('../models/TransferenciaInventario');
    const Movimiento = require('../models/MovimientoInventario');
    const crypto = require('node:crypto');
    const { conTransaccion } = require('../utils/transaccion');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const ids = [];
    try {
      const suf = crypto.randomBytes(5).toString('hex');
      const sede = await Sucursal.create({ nombre: `Prueba fase39 ${suf}`, codigo: `T${suf}` });
      const b1 = await Bodega.create({ nombre: `Origen ${suf}`, codigo: `O${suf}`, sucursal: sede._id, activa: true });
      const b2 = await Bodega.create({ nombre: `Destino ${suf}`, codigo: `D${suf}`, sucursal: sede._id, activa: true });
      const prod = await Producto.create({ nombre: `Producto ${suf}`, sku: `TEST39${suf}`, precio: 100, costo: 20, stock: 10, activo: true });
      ids.push(['sede', sede._id], ['b1', b1._id], ['b2', b2._id], ['prod', prod._id]);
      await Existencia.create({ producto: prod._id, bodega: b1._id, cantidad: 10 });
      await Existencia.create({ producto: prod._id, bodega: b2._id, cantidad: 0 });
      const usuario = new mongoose.Types.ObjectId();
      const mover = async key => conTransaccion(async session => {
        const [t] = await Transferencia.create([{ claveIdempotencia: key, huellaSolicitud: 'a'.repeat(64), producto: prod._id, origen: b1._id, destino: b2._id, cantidad: 8, motivo: 'prueba', registradoPor: usuario }], { session });
        const decremento = await Existencia.updateOne({ producto: prod._id, bodega: b1._id, cantidad: { $gte: 8 } }, { $inc: { cantidad: -8 } }, { session });
        if (decremento.modifiedCount !== 1) throw Error('Existencia insuficiente');
        await Existencia.updateOne({ producto: prod._id, bodega: b2._id }, { $inc: { cantidad: 8 } }, { session });
        await Movimiento.create([{ producto: prod._id, tipo: 'salida', cantidad: 8, motivo: 'prueba', bodega: b1._id, sucursal: sede._id, transferenciaId: t._id, registradoPor: usuario }, { producto: prod._id, tipo: 'entrada', cantidad: 8, motivo: 'prueba', bodega: b2._id, sucursal: sede._id, transferenciaId: t._id, registradoPor: usuario }], { session });
      });
      const results = await Promise.allSettled([mover(`fase39_${suf}_aaaaaaaa`), mover(`fase39_${suf}_bbbbbbbb`)]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      const [a, b] = await Promise.all([Existencia.findOne({ producto: prod._id, bodega: b1._id }), Existencia.findOne({ producto: prod._id, bodega: b2._id })]);
      assert.equal(a.cantidad, 2); assert.equal(b.cantidad, 8);
      assert.equal(await Movimiento.countDocuments({ producto: prod._id, transferenciaId: { $exists: true } }), 2);
    } finally {
      const sede = ids.find(x => x[0] === 'sede')?.[1];
      const prod = ids.find(x => x[0] === 'prod')?.[1];
      const bodegas = ids.filter(x => x[0] === 'b1' || x[0] === 'b2').map(x => x[1]);
      if (prod) { await Movimiento.deleteMany({ producto: prod }); await Transferencia.deleteMany({ producto: prod }); await Existencia.deleteMany({ producto: prod }); await Producto.deleteOne({ _id: prod }); }
      if (bodegas.length) await Bodega.deleteMany({ _id: { $in: bodegas } });
      if (sede) await Sucursal.deleteOne({ _id: sede });
      await mongoose.disconnect();
    }
  });
