const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const leer = file => fs.readFileSync(path.join(root, file), 'utf8');
test('historial protegido por autenticación, permisos y alcance', () => {
  const rutas = leer('backend/routes/inventarioRoutes.js');
  assert.match(rutas, /router\.get\('\/transferencias', verifyToken, checkRole\(\['admin', 'bodeguero'\]\), permiso\('inventario\.leer'\), cargar/);
  assert.match(rutas, /router\.get\('\/transferencias\/:id', verifyToken/);
});
test('historial exige origen y destino dentro de las bodegas autorizadas', () => {
  const codigo = leer('backend/controllers/inventarioController.js');
  assert.match(codigo, /origen: \{ \$in: ids \}, destino: \{ \$in: ids \}/);
  assert.match(codigo, /bodegas\.every\(b => \(req\.alcanceSucursales \|\| \[\]\)\.includes/);
});
test('el cliente conserva la clave en reintentos del mismo formulario', () => {
  const codigo = leer('frontend/src/app/features/inventario/transferencias.component.ts');
  assert.match(codigo, /this\.huellaPendiente !== huella/);
  assert.match(codigo, /this\.inventario\.transferir\(datos, this\.clavePendiente\)/);
  assert.match(codigo, /this\.clavePendiente = ''/);
});
