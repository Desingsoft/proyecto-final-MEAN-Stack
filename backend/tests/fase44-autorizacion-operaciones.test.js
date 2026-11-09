/** Pruebas de comportamiento de autorización de escritura por sede, sin MongoDB real. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const oid = n => String(n).padStart(24, '0');
const sedeA = oid(1), sedeB = oid(2), bodega = oid(3), pedido = oid(4), documento = oid(5);
function preparar({ asignadas = [sedeA], sedeRegistro = sedeA, activo = true, existe = true, admin = false } = {}) {
  let lecturas = 0;
  const cadena = valor => ({ select: () => ({ lean: async () => valor }) });
  const modulos = {
    mongoose: { isValidObjectId: id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id) },
    './alcanceSucursal': { cargar: (req, _res, next) => { req.alcanceSucursales = admin ? null : asignadas; next(); } },
    '../models/Bodega': { findById: () => { lecturas++; return cadena(existe ? { sucursal: sedeRegistro, activa: activo } : null); } },
    '../models/Pedido': { findById: () => { lecturas++; return cadena(existe ? { sucursal: sedeRegistro } : null); } },
    '../models/Documento': { findById: () => { lecturas++; return cadena(existe ? { pedido } : null); } }
  };
  const source = fs.readFileSync(path.join(__dirname, '../middlewares/sucursalOperaciones.js'), 'utf8');
  const exp = {};
  vm.runInNewContext('(function(require,module){' + source + '\n})', { console })(name => {
    if (!(name in modulos)) throw Error('Dependencia no prevista: ' + name);
    return modulos[name];
  }, { exports: exp });
  // module.exports reasigna, por eso se carga en un módulo explícito.
  const modulo = { exports: {} };
  vm.runInNewContext('(function(require,module){' + source + '\n})', { console })(name => modulos[name], modulo);
  async function ejecutar(cadenaMiddleware, req) {
    const res = { codigo: 200, data: null, status(n) { this.codigo = n; return this; }, json(d) { this.data = d; return this; } };
    let alcanzado = false;
    for (const mw of cadenaMiddleware) {
      let next = false;
      await mw(req, res, err => { if (err) throw err; next = true; });
      if (!next) return { res, alcanzado: false };
    }
    alcanzado = true;
    return { res, alcanzado };
  }
  return { ...modulo.exports, ejecutar, get lecturas() { return lecturas; } };
}
const req = (body = {}, params = {}) => ({ body, params, usuario: { id: oid(8) } });
test('bodega autorizada permite continuar', async () => {
  const e = preparar(); const r = await e.ejecutar(e.porBodega('bodega'), req({ bodega }));
  assert.equal(r.alcanzado, true); assert.equal(e.lecturas, 1);
});
test('bodega de otra sucursal se oculta con 404', async () => {
  const e = preparar({ sedeRegistro: sedeB }); const r = await e.ejecutar(e.porBodega('bodega'), req({ bodega }));
  assert.equal(r.res.codigo, 404); assert.equal(r.alcanzado, false);
});
test('bodega inactiva se oculta con 404', async () => {
  const e = preparar({ activo: false }); const r = await e.ejecutar(e.porBodega('bodega'), req({ bodega }));
  assert.equal(r.res.codigo, 404);
});
test('bodega sin ID válido se rechaza antes de consultar', async () => {
  const e = preparar(); const r = await e.ejecutar(e.porBodega('bodega'), req({ bodega: 'incorrecta' }));
  assert.equal(r.res.codigo, 422); assert.equal(e.lecturas, 0);
});
test('pedido de sede ajena no permite modificación', async () => {
  const e = preparar({ sedeRegistro: sedeB }); const r = await e.ejecutar(e.porPedido('id', 'params'), req({}, { id: pedido }));
  assert.equal(r.res.codigo, 404);
});
test('pedido de sede asignada permite continuar', async () => {
  const e = preparar(); const r = await e.ejecutar(e.porPedido('id', 'params'), req({}, { id: pedido }));
  assert.equal(r.alcanzado, true);
});
test('documento vinculado a pedido de otra sede se oculta', async () => {
  const e = preparar({ sedeRegistro: sedeB }); const r = await e.ejecutar(e.porDocumento('id', 'params'), req({}, { id: documento }));
  assert.equal(r.res.codigo, 404); assert.equal(e.lecturas, 2);
});
test('documento vinculado a pedido autorizado permite continuar', async () => {
  const e = preparar(); const r = await e.ejecutar(e.porDocumento('id', 'params'), req({}, { id: documento }));
  assert.equal(r.alcanzado, true);
});
test('registro inexistente no se revela', async () => {
  const e = preparar({ existe: false }); const r = await e.ejecutar(e.porPedido('id', 'params'), req({}, { id: pedido }));
  assert.equal(r.res.codigo, 404);
});
test('administrador conserva paso sin consulta de sede en middleware', async () => {
  const e = preparar({ admin: true }); const r = await e.ejecutar(e.porPedido('id', 'params'), req({}, { id: pedido }));
  assert.equal(r.alcanzado, true); assert.equal(e.lecturas, 0);
});
