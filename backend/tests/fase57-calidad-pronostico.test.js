const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {proyectarReposicion}=require('../utils/pronosticoSucursal');
const base={existencias:[],salidas:[],productos:[{_id:'p',sku:'P',stockMinimo:5}],dias:30,plazo:7};
test('marca falta de historial cuando solo existe stock mínimo',()=>{
 const [fila]=proyectarReposicion(base);
 assert.equal(fila.calidadEstimacion,'sin_demanda_historica');assert.equal(fila.cantidadSugerida,5);
});
test('distingue estimación basada en ventas',()=>{
 const [fila]=proyectarReposicion({...base,salidas:[{_id:'p',cantidad:30}]});
 assert.equal(fila.calidadEstimacion,'basada_en_ventas');assert.equal(fila.cantidadSugerida,12);
});
test('alerta por compras inciertas o vencidas sin descontarlas',()=>{
 const [fila]=proyectarReposicion({...base,salidas:[{_id:'p',cantidad:30}],inciertos:[{producto:'p',cantidad:8}],vencidos:[{producto:'p',cantidad:3}]});
 assert.equal(fila.calidadEstimacion,'requiere_revision');assert.equal(fila.cantidadSugerida,12);
});
test('el resumen de API y la exportación CSV quedan vinculados a la respuesta autorizada',()=>{
 const route=fs.readFileSync(path.join(__dirname,'../routes/empresaRoutes.js'),'utf8');
 const front=fs.readFileSync(path.join(__dirname,'../../frontend/src/app/features/empresa/empresa.component.ts'),'utf8');
 assert.match(route,/resumen:\{productosPorReponer/);
 assert.match(front,/exportarReposicionCSV\(\)/);
 assert.match(front,/this\.reposicion\.filas\.map/);
 assert.match(front,/\[=\+@-\]/);
});
