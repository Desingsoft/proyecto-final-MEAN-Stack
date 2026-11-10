/** Pruebas del contrato transaccional con una sesión simulada, sin MongoDB real. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function cargar({ permitir = false, entorno = 'production', errorTransaccion = null } = {}) {
  const estado = { sesiones: 0, ejecuciones: 0, cierres: 0 };
  const session = {
    async withTransaction(fn) { estado.ejecuciones++; if (errorTransaccion) throw errorTransaccion; await fn(); },
    async endSession() { estado.cierres++; }
  };
  const mongoose = { async startSession() { estado.sesiones++; return session; } };
  const source = fs.readFileSync(path.join(__dirname, '../utils/transaccion.js'), 'utf8');
  const exports = { };
  const module = { exports };
  vm.runInNewContext(`(function(require,module,process){${source}\n})`, {})(name => {
    if (name === 'mongoose') return mongoose;
    throw Error('Dependencia inesperada');
  }, module, { env: { NODE_ENV: entorno, PERMITIR_SIN_TRANSACCION: permitir ? 'true' : 'false' } });
  return { conTransaccion: module.exports.conTransaccion, estado };
}
test('ejecuta una operación en sesión y devuelve su resultado', async () => {
  const { conTransaccion, estado } = cargar();
  assert.equal(await conTransaccion(async session => { assert.ok(session); return 27; }), 27);
  assert.deepEqual(estado, { sesiones: 1, ejecuciones: 1, cierres: 1 });
});
test('libera la sesión aunque la operación falle', async () => {
  const { conTransaccion, estado } = cargar();
  await assert.rejects(conTransaccion(async () => { throw Error('fallo simulado'); }), /fallo simulado/);
  assert.equal(estado.cierres, 1);
});
test('libera sesión si falla el inicio de la transacción', async () => {
  const { conTransaccion, estado } = cargar({ errorTransaccion: Error('transacción no disponible') });
  await assert.rejects(conTransaccion(async () => 1), /transacción no disponible/);
  assert.equal(estado.cierres, 1);
});
test('prohíbe desactivar transacciones en producción', async () => {
  const { conTransaccion, estado } = cargar({ permitir: true });
  await assert.rejects(conTransaccion(async () => 1), /Transacciones obligatorias/);
  assert.equal(estado.sesiones, 0);
});
test('permite el modo sin transacciones solo en pruebas', async () => {
  const { conTransaccion, estado } = cargar({ permitir: true, entorno: 'test' });
  assert.equal(await conTransaccion(async session => { assert.equal(session, null); return 'ok'; }), 'ok');
  assert.equal(estado.sesiones, 0);
});
