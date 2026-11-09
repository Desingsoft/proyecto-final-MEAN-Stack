const test=require('node:test');
const assert=require('node:assert/strict');
const {clasificarPendientes,proyectarReposicion}=require('../utils/pronosticoSucursal');
const corte=new Date('2026-11-07T12:00:00Z');
const orden=(fecha,items=[{producto:'p',cantidad:10,cantidadRecibida:3}])=>({_id:'orden',fechaEsperada:fecha,items});
test('clasifica las órdenes vencidas y las vigentes',()=>{
 const r=clasificarPendientes([orden('2026-11-01'),orden('2026-11-12')],corte);
 assert.equal(r.vencidos[0].cantidad,7);assert.equal(r.pendientes[0].cantidad,7);
});
test('órdenes sin fecha se clasifican como inciertas',()=>{
 const r=clasificarPendientes([orden(null)],corte);assert.equal(r.inciertos.length,1);
});
test('no descuenta compras vencidas de la reposición sugerida',()=>{
 const base={existencias:[{producto:'p',cantidad:2}],salidas:[{_id:'p',cantidad:30}],productos:[{_id:'p',sku:'P',nombre:'Prueba',stockMinimo:2}],dias:30,plazo:7};
 const {pendientes,vencidos}=clasificarPendientes([orden('2026-11-01')],corte);
 const [r]=proyectarReposicion({...base,pendientes,vencidos});
 assert.equal(r.cantidadSugerida,7);assert.equal(r.enCamino,0);assert.equal(r.enCaminoVencido,7);
});
test('compras vigentes sí se descuentan',()=>{
 const base={existencias:[{producto:'p',cantidad:2}],salidas:[{_id:'p',cantidad:30}],productos:[{_id:'p',stockMinimo:2}],dias:30,plazo:7};
 const {pendientes,vencidos}=clasificarPendientes([orden('2026-11-12')],corte);
 assert.equal(proyectarReposicion({...base,pendientes,vencidos}).length,0);
});
test('rechaza recibidos superiores a comprados y cantidades fraccionarias',()=>{
 assert.throws(()=>clasificarPendientes([orden(null,[{producto:'p',cantidad:2,cantidadRecibida:3}])],corte));
 assert.throws(()=>clasificarPendientes([orden(null,[{producto:'p',cantidad:2.5,cantidadRecibida:0}])],corte));
});
test('rechaza fecha de corte inválida',()=>assert.throws(()=>clasificarPendientes([], 'incorrecta')));
