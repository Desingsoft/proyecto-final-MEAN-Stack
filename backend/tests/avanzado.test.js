/**
 * Archivo: avanzado.test.js
 * Propósito: Prueba automatizada: verifica un comportamiento esperado.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Pruebas sin conexión a MongoDB para validar contratos de seguridad y módulos.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const leer=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('la recuperación almacena solo hash del token y limita su duración',()=>{
 const s=leer('controllers/authController.js');
 assert.match(s,/sha256/);assert.match(s,/15 \* 60 \* 1000/);assert.match(s,/versionToken/);
});
test('el conteo físico utiliza una transacción',()=>{
 const s=leer('routes/avanzadoRoutes.js');assert.match(s,/withTransaction/);assert.match(s,/cantidadContada/);
});
test('los permisos específicos se validan en backend',()=>{
 const s=leer('middlewares/permiso.js');assert.match(s,/403/);assert.match(s,/permisos/);
});
