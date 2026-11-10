const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '..');
const leer = p => fs.readFileSync(path.join(base, p), 'utf8');
test('las consultas de pago por documento validan sede', () => {
  assert.match(leer('routes/pagoRoutes.js'), /porDocumento\('id', 'params'\)/);
});
test('cartera por pagar carga el alcance de sucursales', () => {
  assert.match(leer('routes/carteraRoutes.js'), /pagar\/resumen', cargar/);
  assert.match(leer('controllers/carteraController.js'), /alcancePagos/);
});
test('el resumen de sucursal no usa el stock global de producto', () => {
  const contenido = leer('controllers/reporteSucursalController.js');
  assert.match(contenido, /Existencia.aggregate/);
  assert.doesNotMatch(contenido, /Producto.find/);
});
