const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {proyectarReposicion}=require('../utils/pronosticoSucursal');
const base={existencias:[],salidas:[],productos:[{_id:'p',sku:'P',stockMinimo:1}],dias:30,plazo:7};
test('suma varias salidas comerciales de un mismo producto',()=>{
 const [r]=proyectarReposicion({...base,salidas:[{_id:'p',cantidad:10},{_id:'p',cantidad:20}]});
 assert.equal(r.salidasPeriodo,30);assert.equal(r.cantidadSugerida,8);
});
test('rechaza acumulación de demanda fuera del entero seguro',()=>{
 assert.throws(()=>proyectarReposicion({...base,salidas:[{_id:'p',cantidad:Number.MAX_SAFE_INTEGER},{_id:'p',cantidad:1}]}),/fuera de rango/);
});
test('rechaza acumulación de existencias fuera del entero seguro',()=>{
 assert.throws(()=>proyectarReposicion({...base,existencias:[{producto:'p',cantidad:Number.MAX_SAFE_INTEGER},{producto:'p',cantidad:1}]}),/fuera de rango/);
});
test('rechaza acumulación de compras fuera del entero seguro',()=>{
 assert.throws(()=>proyectarReposicion({...base,pendientes:[{producto:'p',cantidad:Number.MAX_SAFE_INTEGER},{producto:'p',cantidad:1}]}),/fuera de rango/);
});
test('rechaza punto de pedido fuera del rango seguro',()=>{
 assert.throws(()=>proyectarReposicion({...base,salidas:[{_id:'p',cantidad:Number.MAX_SAFE_INTEGER}],plazo:180}),/fuera de rango/);
});
test('ignora stock mínimo fraccionario inválido',()=>{
 assert.equal(proyectarReposicion({...base,productos:[{_id:'p',sku:'P',stockMinimo:1.5}]}).length,0);
});
test('frontend ignora respuestas atrasadas y no exporta una sucursal diferente',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../../frontend/src/app/features/empresa/empresa.component.ts'),'utf8');
 assert.match(s,/solicitud===this\.solicitudReposicion&&sedeConsultada===this\.sedeReposicion/);
 assert.match(s,/this\.sedeResultadoReposicion!==this\.sedeReposicion/);
 assert.match(s,/sedeResultadoReposicion === sedeReposicion/);
});
