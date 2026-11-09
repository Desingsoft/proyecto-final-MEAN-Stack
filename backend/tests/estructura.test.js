/**
 * Archivo: estructura.test.js
 * Propósito: Prueba automatizada: verifica un comportamiento esperado.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
/** Pruebas de humo sin MongoDB: comprueban sintaxis y estructura de la aplicación. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const raiz = path.resolve(__dirname, '..');
/** Recorre directorios recursivamente sin incluir dependencias instaladas. */
function archivosJs(directorio) {
  return fs.readdirSync(directorio, { withFileTypes: true }).flatMap(entrada => {
    if (entrada.name === 'node_modules') return [];
    const ruta = path.join(directorio, entrada.name);
    return entrada.isDirectory() ? archivosJs(ruta) : ruta.endsWith('.js') ? [ruta] : [];
  });
}
test('todos los archivos JavaScript del backend tienen sintaxis válida', () => {
  for (const archivo of archivosJs(raiz)) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', archivo]), archivo);
  }
});
test('existen rutas, controladores y modelos esenciales', () => {
  for (const archivo of ['server.js', 'routes/authRoutes.js', 'controllers/pedidoController.js', 'models/Producto.js', 'middlewares/verifyToken.js']) {
    assert.ok(fs.existsSync(path.join(raiz, archivo)), `Falta ${archivo}`);
  }
});
