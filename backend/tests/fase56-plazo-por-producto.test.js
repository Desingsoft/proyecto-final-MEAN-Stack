const test=require('node:test');
const assert=require('node:assert/strict');
const {clasificarPendientes,proyectarReposicion}=require('../utils/pronosticoSucursal');
const hoy=new Date('2026-11-07T12:00:00Z');
const orden={_id:'oc1',fechaEsperada:'2026-11-17',items:[{producto:'rapido',cantidad:5,cantidadRecibida:1,diasEntrega:7},{producto:'lento',cantidad:8,cantidadRecibida:2,diasEntrega:15}]};
test('una misma orden se clasifica por el plazo de cada producto',()=>{
 const r=clasificarPendientes([orden],hoy,7);
 assert.deepEqual(r.pendientes.map(x=>x.producto),['lento']);
 assert.deepEqual(r.posteriores.map(x=>x.producto),['rapido']);
 assert.equal(r.pendientes[0].cantidad,6);
});
test('el plazo general se usa cuando el proveedor no tiene plazo válido',()=>{
 const r=clasificarPendientes([{...orden,items:[{producto:'p',cantidad:3,diasEntrega:999}]}],hoy,7);
 assert.equal(r.posteriores.length,1);
});
test('una entrega en la fecha límite específica se considera oportuna',()=>{
 const r=clasificarPendientes([{...orden,fechaEsperada:'2026-11-22'}],hoy,7);
 assert.equal(r.pendientes.length,1);assert.equal(r.posteriores.length,1);
});
test('las líneas recibidas completamente no aparecen en el informe',()=>{
 const r=clasificarPendientes([{...orden,items:[{producto:'p',cantidad:3,cantidadRecibida:3}]}],hoy,7);
 assert.equal(Object.values(r).flat().length,0);
});
test('los pendientes de productos con distintos plazos afectan su propia sugerencia',()=>{
 const r=clasificarPendientes([orden],hoy,7);
 const filas=proyectarReposicion({existencias:[],salidas:[{_id:'rapido',cantidad:30},{_id:'lento',cantidad:30}],productos:[{_id:'rapido',stockMinimo:0,diasEntrega:7},{_id:'lento',stockMinimo:0,diasEntrega:15}],dias:30,plazo:7,...r});
 assert.equal(filas.find(x=>x.producto==='rapido').cantidadSugerida,7);
 assert.equal(filas.find(x=>x.producto==='lento').cantidadSugerida,9);
});
test('rechaza existencias y movimientos fraccionarios para productos por unidades',()=>{
 const args={existencias:[{producto:'p',cantidad:1.5}],salidas:[],productos:[{_id:'p'}],dias:30,plazo:7};
 assert.throws(()=>proyectarReposicion(args));
 assert.throws(()=>proyectarReposicion({...args,existencias:[],salidas:[{_id:'p',cantidad:NaN}]}));
});
