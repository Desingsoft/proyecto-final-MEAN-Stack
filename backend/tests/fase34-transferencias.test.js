const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const leer = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
test('transferencia exige clave de idempotencia y usa índice único', () => {
  assert.match(leer('controllers/inventarioController.js'), /Idempotency-Key/);
  assert.match(leer('models/TransferenciaInventario.js'), /unique: true/);
});
test('traslado registra dos movimientos en una transacción', () => {
  const s = leer('controllers/inventarioController.js');
  assert.match(s, /conTransaccion\(async session/);
  assert.match(s, /tipo: 'salida'/);
  assert.match(s, /tipo: 'entrada'/);
  assert.match(s, /cantidad: \{ \$gte: cantidad \}/);
});
test('frontend suministra una clave por operación', () => {
  assert.match(leer('../frontend/src/app/core/services/inventario.service.ts'), /crypto.randomUUID\(\)/);
});
