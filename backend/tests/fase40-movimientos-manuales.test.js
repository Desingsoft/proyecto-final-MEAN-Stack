/** Pruebas de controlador con dobles de MongoDB; no son pruebas de integración. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const oid = n => String(n).padStart(24, '0');
const producto = oid(1), bodega = oid(2), sucursal = oid(3);
function entorno({ existencia = 12, global = 12, autorizadas = [sucursal], previo = null, falloGlobal = false, falloLocal = false } = {}) {
  const estado = { existencia, global, movimientos: [], commits: 0, abortos: 0 };
  const modelo = {
    '../models/Bodega': { findById: () => ({ session: async () => ({ activa: true, sucursal }) }) },
    '../models/Producto': {
      findById: () => ({ session: async () => ({ activo: true }) }),
      updateOne: async (f, u) => {
        if (falloGlobal || (f.stock && estado.global < f.stock.$gte)) return { modifiedCount: 0 };
        estado.global += u.$inc.stock; return { modifiedCount: 1 };
      }
    },
    '../models/Existencia': { updateOne: async (f, u) => {
      if (falloLocal || (f.cantidad && estado.existencia < f.cantidad.$gte)) return { modifiedCount: 0 };
      estado.existencia += u.$inc.cantidad; return { modifiedCount: 1 };
    } },
    '../models/MovimientoInventario': {
      findOne: () => ({ session: async () => previo }),
      create: async docs => { const m = { ...docs[0], _id: oid(4) }; estado.movimientos.push(m); return [m]; }
    },
    '../models/TransferenciaInventario': {},
    '../utils/transaccion': { conTransaccion: async fn => {
      const before = { existencia: estado.existencia, global: estado.global, movimientos: [...estado.movimientos] };
      try { const result = await fn({}); estado.commits++; return result; }
      catch (e) { Object.assign(estado, before); estado.abortos++; throw e; }
    } }
  };
  const code = fs.readFileSync(path.join(__dirname, '../controllers/inventarioController.js'), 'utf8');
  const exports = {};
  vm.runInNewContext(`(function(require, exports){${code}\n})`, { console })(name => {
    if (name === 'mongoose') return { isValidObjectId: v => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v) };
    if (name === 'crypto') return crypto;
    if (modelo[name]) return modelo[name];
    throw new Error('Dependencia inesperada ' + name);
  }, exports);
  const peticion = (body = {}, clave = 'movimiento_manual_2026_001') => ({
    body: { producto, bodega, tipo: 'salida', cantidad: 4, motivo: 'ajuste', ...body },
    get: () => clave, alcanceSucursales: autorizadas, usuario: { id: oid(8) }
  });
  const invocar = async req => {
    const res = { statusCode: 200, data: null, status(n) { this.statusCode = n; return this; }, json(d) { this.data = d; return this; } };
    await exports.registrar(req, res); return res;
  };
  return { estado, peticion, invocar };
}
test('salida manual reduce ambos saldos y genera un movimiento', async () => {
  const e = entorno(); const r = await e.invocar(e.peticion());
  assert.equal(r.statusCode, 201); assert.equal(e.estado.existencia, 8);
  assert.equal(e.estado.global, 8); assert.equal(e.estado.movimientos.length, 1);
});
test('rechaza existencia insuficiente y revierte', async () => {
  const e = entorno({ existencia: 2 }); const r = await e.invocar(e.peticion());
  assert.equal(r.statusCode, 409); assert.equal(e.estado.global, 12);
  assert.equal(e.estado.movimientos.length, 0); assert.equal(e.estado.abortos, 1);
});
test('revierte cambio local cuando falla stock global', async () => {
  const e = entorno({ falloGlobal: true }); const r = await e.invocar(e.peticion());
  assert.equal(r.statusCode, 409); assert.equal(e.estado.existencia, 12);
});
test('rechaza sede no autorizada antes de modificar inventario', async () => {
  const e = entorno({ autorizadas: [] }); const r = await e.invocar(e.peticion());
  assert.equal(r.statusCode, 404); assert.equal(e.estado.movimientos.length, 0);
});
test('reintento idéntico no registra movimiento nuevo', async () => {
  const e = entorno(); const first = await e.invocar(e.peticion());
  const previo = { ...first.data, huellaSolicitud: e.estado.movimientos[0].huellaSolicitud };
  const e2 = entorno({ previo }); const r = await e2.invocar(e2.peticion());
  assert.equal(r.statusCode, 200); assert.equal(r.data.repetida, true);
  assert.equal(e2.estado.movimientos.length, 0);
});
test('reutilización de clave con otra carga produce conflicto', async () => {
  const e = entorno({ previo: { huellaSolicitud: 'a'.repeat(64) } });
  const r = await e.invocar(e.peticion()); assert.equal(r.statusCode, 409);
});
test('rechaza clave corta y cantidad fraccionaria', async () => {
  const e = entorno();
  assert.equal((await e.invocar(e.peticion({}, 'corta'))).statusCode, 400);
  assert.equal((await e.invocar(e.peticion({ cantidad: 1.5 }))).statusCode, 422);
});
test('entrada actualiza inventario y evita registrar cuando no cambia la bodega', async () => {
  const e = entorno(); const r = await e.invocar(e.peticion({ tipo: 'entrada', cantidad: 3 }));
  assert.equal(r.statusCode, 201); assert.equal(e.estado.existencia, 15); assert.equal(e.estado.global, 15);
  const f = entorno({ falloLocal: true }); const bad = await f.invocar(f.peticion({ tipo: 'entrada' }));
  assert.equal(bad.statusCode, 409); assert.equal(f.estado.global, 12);
});

test('rechaza movimiento sin clave idempotente antes de tocar inventario', async () => {
  const e = entorno(); const r = await e.invocar(e.peticion({}, undefined));
  // El helper asigna clave predeterminada si se omite: pasar null explícito.
  const sinClave = await e.invocar(e.peticion({}, null));
  assert.equal(r.statusCode, 201); assert.equal(sinClave.statusCode, 400);
  assert.equal(e.estado.movimientos.length, 1);
});
