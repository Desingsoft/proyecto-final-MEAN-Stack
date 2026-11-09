/** Pruebas de autorización con modelos simulados: sin datos de producción. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sedeA = 'aaaaaaaaaaaaaaaaaaaaaaaa', sedeB = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const usuarioId = '111111111111111111111111', pedidoId = '222222222222222222222222';
function entorno({ rol = 'ventas', activo = true, asignadas = [sedeA], sedePedido = sedeA, pedidoExiste = true } = {}) {
  const datos = {
    '../models/Usuario': { findById: () => ({ select: () => ({ lean: async () => ({ activo, sucursales: asignadas }) }) }) },
    '../models/Pedido': { exists: async f => pedidoExiste && String(f._id) === pedidoId && (!f.sucursal || f.sucursal.$in.includes(sedePedido)),
      findById: () => ({ select: () => ({ lean: async () => pedidoExiste ? { sucursal: sedePedido } : null }) }) },
    '../models/Documento': { findById: () => ({ select: () => ({ lean: async () => ({ pedido: pedidoId }) }) }) }
  };
  const source = fs.readFileSync(path.join(__dirname, '../middlewares/alcanceSucursal.js'), 'utf8');
  const modulo = { exports: {} };
  vm.runInNewContext(`(function(require, exports, module){${source}\n})`, {}, { filename: 'alcanceSucursal.js' })(n => {
    if (n === 'mongoose') return { isValidObjectId: x => typeof x === 'string' && /^[a-f0-9]{24}$/.test(x) };
    if (datos[n]) return datos[n];
    throw Error('Dependencia no prevista: ' + n);
  }, modulo.exports, modulo);
  const req = { usuario: { id: usuarioId, role: rol }, query: {}, body: {}, params: { id: pedidoId } };
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; } };
  let nextCalls = 0;
  const next = () => { nextCalls++; };
  return { middleware: modulo.exports, req, res, next, get nextCalls() { return nextCalls; } };
}
test('administrador conserva acceso global', async () => {
  const e = entorno({ rol: 'admin', asignadas: [] }); await e.middleware.cargar(e.req, e.res, e.next);
  assert.equal(e.req.alcanceSucursales, null); assert.equal(e.nextCalls, 1);
});
test('usuario sin sede asignada queda bloqueado', async () => {
  const e = entorno({ asignadas: [] }); await e.middleware.cargar(e.req, e.res, e.next);
  assert.equal(e.res.statusCode, 403); assert.equal(e.nextCalls, 0);
});
test('usuario inactivo no puede consultar sedes', async () => {
  const e = entorno({ activo: false }); await e.middleware.cargar(e.req, e.res, e.next);
  assert.equal(e.res.statusCode, 401);
});
test('filtro por sede solicitada fuera de alcance se rechaza', async () => {
  const e = entorno(); e.req.query.sucursal = sedeB;
  await e.middleware.cargar(e.req, e.res, e.next); assert.equal(e.res.statusCode, 403);
});
test('pedido de otra sede no se revela', async () => {
  const e = entorno({ sedePedido: sedeB }); await e.middleware.cargar(e.req, e.res, e.next);
  await e.middleware.pedido()(e.req, e.res, e.next);
  assert.equal(e.res.statusCode, 404); assert.equal(e.nextCalls, 1);
});
test('pedido de sede asignada sí se consulta', async () => {
  const e = entorno(); await e.middleware.cargar(e.req, e.res, e.next);
  await e.middleware.pedido()(e.req, e.res, e.next);
  assert.equal(e.nextCalls, 2);
});
test('pedido histórico sin sede no queda accesible', async () => {
  const e = entorno({ sedePedido: null }); await e.middleware.cargar(e.req, e.res, e.next);
  await e.middleware.pedido()(e.req, e.res, e.next);
  assert.equal(e.res.statusCode, 404);
});
