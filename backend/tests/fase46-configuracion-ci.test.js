const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/calidad.yml'), 'utf8');

test('CI inicia MongoDB explícitamente con replica set', () => {
  assert.match(workflow, /mongod --replSet rs0 --bind_ip_all/);
  assert.match(workflow, /rs\.initiate/);
});
test('CI comprueba PRIMARY antes de ejecutar transacciones', () => {
  assert.match(workflow, /isWritablePrimary/);
  assert.match(workflow, /MongoDB no llegó a PRIMARY/);
});
test('CI ejecuta integración obligatoria, no el test opcional directo', () => {
  assert.match(workflow, /node scripts\/ejecutarIntegracionMongo\.js/);
  assert.match(workflow, /MONGO_TEST_URI: mongodb:\/\/127\.0\.0\.1:27017\/inventario_ci_test/);
});
test('CI exige compilación Angular con instalación limpia', () => {
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run build:prod/);
});
