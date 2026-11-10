const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {proyectarReposicion}=require('../utils/pronosticoSucursal');
const frontend=fs.readFileSync(path.join(__dirname,'../../frontend/src/app/features/empresa/empresa.component.ts'),'utf8');
const rutas=fs.readFileSync(path.join(__dirname,'../routes/empresaRoutes.js'),'utf8');
test('compras CSV usa únicamente la página autorizada en memoria',()=>{
 const fragmento=frontend.split('exportarComprasCSV():void{')[1].split(' cargarReposicion():void{')[0];
 assert.match(fragmento,/this\.compras\.filas\.map/);
 assert.match(fragmento,/this\.sedeResultadoCompras!==this\.sedeReposicion/);
 assert.match(fragmento,/this\.parametrosCompras!==String\(this\.plazoReposicion\)/);
 assert.match(fragmento,/this\.compras\.pagina/);
});
test('CSV neutraliza fórmulas y comillas de campos externos',()=>{
 const fragmento=frontend.split('exportarComprasCSV():void{')[1].split(' cargarReposicion():void{')[0];
 assert.match(fragmento,/\[=\+@-\]/);
 assert.match(fragmento,/replace\(\/"\/g/);
});
test('exportación de compras aparece solo si hay página y filas',()=>{
 assert.match(frontend,/exportarComprasCSV\(\)/);
 assert.match(frontend,/\[disabled\]="!compras\.filas\.length"/);
});
test('rechaza sugerencias con resta fuera de entero seguro',()=>{
 assert.throws(()=>proyectarReposicion({dias:1,plazo:1,productos:[{_id:'a',stockMinimo:0}],existencias:[{producto:'a',cantidad:Number.MAX_SAFE_INTEGER}],salidas:[],pendientes:[{producto:'a',cantidad:1}]}),/fuera de rango/);
});
test('total agregado de reposición se valida antes de enviar respuesta',()=>{
 assert.match(rutas,/const unidadesSugeridas=filas\.reduce/);
 assert.match(rutas,/Total de reposición fuera de rango/);
});
