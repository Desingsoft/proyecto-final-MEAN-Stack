/** Pruebas de comportamiento del filtro de movimientos sin base real. */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const sedeA = '000000000000000000000001', sedeB = '000000000000000000000002';
function invocar({ alcance = [sedeA], sucursal } = {}) {
  const consultas = [];
  const modelo = { find: filtro => {
    consultas.push(filtro);
    const cadena = { populate: () => cadena, sort: () => cadena, skip: () => cadena, limit: async () => [] };
    return cadena;
  }, countDocuments: async () => 0 };
  const dependencias = {
    mongoose: { isValidObjectId: id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id) },
    '../models/MovimientoInventario': modelo, '../models/Producto': {}, '../models/Bodega': {},
    '../models/Existencia': {}, '../models/TransferenciaInventario': {}, crypto: require('crypto')
  };
  const codigo = fs.readFileSync(path.join(__dirname, '../controllers/inventarioController.js'), 'utf8');
  const modulo = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + codigo + '\n})', { console })(nombre => dependencias[nombre], modulo, modulo.exports);
  const res = { statusCode: 200, data: null, status(n) { this.statusCode = n; return this; }, json(v) { this.data = v; return this; } };
  return modulo.exports.obtenerMovimientos({ query: { ...(sucursal ? { sucursal } : {}) }, alcanceSucursales: alcance }, res).then(() => ({ res, consultas }));
}
test('consulta local sin filtro solo ve sedes asignadas', async () => {
  const { res, consultas } = await invocar(); assert.equal(res.statusCode, 200);
  assert.deepEqual(Array.from(consultas[0].sucursal.$in), [sedeA]);
});
test('consulta local con sede permitida filtra a esa sede', async () => {
  const { consultas } = await invocar({ alcance: [sedeA, sedeB], sucursal: sedeB });
  assert.equal(consultas[0].sucursal, sedeB);
});
test('consulta local de otra sede se rechaza antes de consultar datos', async () => {
  const { res, consultas } = await invocar({ sucursal: sedeB });
  assert.equal(res.statusCode, 404); assert.equal(consultas.length, 0);
});
test('consulta con identificador inválido se rechaza', async () => {
  const { res } = await invocar({ sucursal: 'incorrecta' }); assert.equal(res.statusCode, 400);
});
test('administrador puede filtrar por sede', async () => {
  const { consultas } = await invocar({ alcance: null, sucursal: sedeB });
  assert.equal(consultas[0].sucursal, sedeB);
});
