const test = require('node:test');
const assert = require('node:assert/strict');
const { comprobar } = require('../scripts/verificarDependencias');
test('el diagnóstico distingue dependencias de backend y frontend', () => {
  const r = comprobar();
  assert.equal(r.length, 6);
  assert.ok(r.some(x => x.proyecto === 'backend' && x.paquete === 'mongoose'));
  assert.ok(r.some(x => x.proyecto === 'frontend' && x.paquete === '@angular/cli'));
  assert.ok(r.every(x => typeof x.instalado === 'boolean'));
});
