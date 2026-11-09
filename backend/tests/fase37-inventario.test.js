const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const controller = fs.readFileSync(path.join(__dirname, '../controllers/inventarioController.js'), 'utf8');
const transaccion = fs.readFileSync(path.join(__dirname, '../utils/transaccion.js'), 'utf8');

test('salida manual usa decrementos condicionales por bodega y producto', () => {
  assert.match(controller, /cantidad: \{ \$gte: cantidad \}/);
  assert.match(controller, /stock: \{ \$gte: cantidad \}/);
  assert.match(controller, /modifiedCount !== 1/);
});
test('entrada manual usa incremento atómico con upsert de existencia', () => {
  assert.match(controller, /\$inc: \{ cantidad \}, \$setOnInsert:/);
  assert.match(controller, /\$inc: \{ stock: cantidad \}/);
});
test('movimiento exige transacción y revierte si hay error', () => {
  assert.match(controller, /conTransaccion\(async session =>/);
  assert.match(transaccion, /session\.withTransaction/);
  assert.match(transaccion, /session\.endSession/);
});
test('listado valida paginación y filtros', () => {
  assert.match(controller, /lim > 100/);
  assert.match(controller, /Producto inválido/);
});
test('transferencias requieren transacciones fuera de pruebas', () => {
  assert.match(transaccion, /NODE_ENV !== 'test'/);
  assert.match(transaccion, /session\.withTransaction/);
});
