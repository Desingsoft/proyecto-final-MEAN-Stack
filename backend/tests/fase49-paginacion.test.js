const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
test('paginación limita desplazamientos y tamaños', () => {
  const c = read('backend/controllers/inventarioController.js');
  assert.match(c, /pagina > 10000/);
  assert.match(c, /limite > 100/);
  assert.match(c, /pagina, limite, paginas:/);
});
test('historial de transferencias ofrece navegación paginada', () => {
  const c = read('frontend/src/app/features/inventario/transferencias.component.ts');
  assert.match(c, /getTransferencias\(pagina\)/);
  assert.match(c, /cargarHistorial\(pagina \+ 1\)/);
  assert.match(c, /cargarHistorial\(pagina - 1\)/);
});
test('contrato Angular declara metadatos de paginación', () => {
  const c = read('frontend/src/app/core/services/inventario.service.ts');
  assert.match(c, /pagina: number; limite: number; paginas: number/);
});
