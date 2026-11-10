const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { verificar } = require('../scripts/verificarReferenciasAngular');
test('todas las referencias relativas y recursos Angular existentes se resuelven', () => {
  const resultado = verificar();
  assert.ok(resultado.archivos > 50);
  assert.ok(resultado.referencias > 200);
  assert.deepEqual(resultado.errores, []);
});
test('puerta de calidad ejecuta verificación de referencias aun sin Angular CLI', () => {
  const codigo = fs.readFileSync(path.join(__dirname, '../scripts/puertaCalidad.js'), 'utf8');
  assert.ok(codigo.indexOf("'Referencias locales de Angular'") < codigo.indexOf('const ng ='));
});
