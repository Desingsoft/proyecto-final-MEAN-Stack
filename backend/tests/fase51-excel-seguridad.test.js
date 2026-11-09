const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const raiz=path.join(__dirname,'../../');
const ui=fs.readFileSync(path.join(raiz,'frontend/src/app/features/empresa/empresa.component.ts'),'utf8');
const rutas=fs.readFileSync(path.join(raiz,'backend/routes/empresaRoutes.js'),'utf8');
test('Excel se procesa localmente y no se envía el archivo original',()=>{
 assert.match(ui,/archivo\.arrayBuffer\(\)/);assert.match(ui,/XLSX\.read\(/);
 assert.match(ui,/sheet_to_json/);assert.doesNotMatch(ui,/FormData\(/);
});
test('Importación exige revisión y confirmación separadas',()=>{
 assert.match(ui,/previsualizarImportacion\(\)/);assert.match(ui,/confirmarImportacion\(\)/);
 assert.match(ui,/resultadoImportacion\?\.puedeConfirmar/);
 assert.match(ui,/importar\/productos\/previsualizar/);assert.match(ui,/importar\/productos\/confirmar/);
});
test('Excel tiene límites de archivo y filas',()=>{
 assert.match(ui,/2\*1024\*1024/);assert.match(ui,/filas\.length>200/);
 assert.match(ui,/cabeceras\.some/);assert.match(ui,/columnas\.includes/);
});
test('No se aceptan conversiones numéricas silenciosas de separadores de miles',()=>{
 assert.match(ui,/Number\.isFinite/);assert.match(ui,/separadores de miles/);
});
test('Pronóstico global se limita a administradores hasta implementar segregación',()=>{
 assert.match(rutas,/router\.get\('\/reposicion',admin/);
 assert.match(rutas,/router\.get\('\/reposicion\/pronostico',admin/);
});
test('Confirmación en servidor usa transacción y no carga inventario inicial',()=>{
 assert.match(rutas,/router\.post\('\/importar\/productos\/confirmar'/);
 assert.match(rutas,/session\.withTransaction/);assert.match(rutas,/stock:0/);
});
