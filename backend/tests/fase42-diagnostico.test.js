const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluarExistencias } = require('../utils/diagnosticoInventario');
const p = [{ _id: 'p1', stock: 4 }], b = [{ _id: 'b1', sucursal: 's1' }];
test('inventario sin diferencias tiene cero hallazgos', () => {
  assert.deepEqual(evaluarExistencias(p, [{ producto:'p1', bodega:'b1', cantidad:4 }], b).hallazgos, []);
});
test('duplicado no se contabiliza dos veces en total localizado', () => {
  const x = evaluarExistencias(p, [{ producto:'p1', bodega:'b1', cantidad:4 }, { producto:'p1', bodega:'b1', cantidad:4 }], b);
  assert.equal(x.hallazgos.filter(h => h.codigo === 'EXISTENCIA_DUPLICADA').length, 1);
  assert.equal(x.hallazgos.filter(h => h.codigo === 'DIFERENCIA_GLOBAL_BODEGAS').length, 0);
});
test('existencia de producto inexistente no infla stock de productos válidos', () => {
  const x = evaluarExistencias(p, [{ producto:'p2', bodega:'b1', cantidad:50 }], b);
  assert.ok(x.hallazgos.some(h => h.codigo === 'PRODUCTO_INEXISTENTE'));
  assert.ok(x.hallazgos.some(h => h.codigo === 'DIFERENCIA_GLOBAL_BODEGAS' && h.diferencia === 4));
});
test('existencias negativas e inválidas se reportan', () => {
  for (const cantidad of [-1, 1.5, NaN]) {
    const x = evaluarExistencias(p, [{ producto:'p1', bodega:'b1', cantidad }], b);
    assert.ok(x.hallazgos.some(h => h.codigo === 'CANTIDAD_INVALIDA'));
  }
});
test('bodega sin sucursal se señala para migración', () => {
  const x = evaluarExistencias(p, [{ producto:'p1', bodega:'b1', cantidad:4 }], [{_id:'b1'}]);
  assert.ok(x.hallazgos.some(h => h.codigo === 'BODEGA_SIN_SUCURSAL'));
});
