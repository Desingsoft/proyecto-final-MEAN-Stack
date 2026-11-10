const test=require('node:test');
const assert=require('node:assert/strict');
const {proyectarReposicion}=require('../utils/pronosticoSucursal');
const base={existencias:[{producto:'a',cantidad:2}],salidas:[{_id:'a',cantidad:30}],productos:[{_id:'a',sku:'A',stockMinimo:2}],dias:30,plazo:7};
test('resta mercancía en camino del sugerido',()=>{
 const filas=proyectarReposicion({...base,pendientes:[{producto:'a',cantidad:3}]});
 assert.equal(filas[0].puntoPedido,9);assert.equal(filas[0].enCamino,3);assert.equal(filas[0].cantidadSugerida,4);
});
test('plazo individual del proveedor prevalece sobre valor predeterminado',()=>{
 const filas=proyectarReposicion({...base,productos:[{...base.productos[0],diasEntrega:14}]});
 assert.equal(filas[0].diasEntrega,14);assert.equal(filas[0].puntoPedido,16);
});
test('plazo inválido del proveedor usa plazo predeterminado',()=>{
 const filas=proyectarReposicion({...base,productos:[{...base.productos[0],diasEntrega:0}]});
 assert.equal(filas[0].diasEntrega,7);
});
test('si las órdenes en camino cubren la demanda, no se sugiere comprar',()=>{
 const filas=proyectarReposicion({...base,pendientes:[{producto:'a',cantidad:20}]});assert.equal(filas.length,0);
});
test('rechaza pendientes negativos y no finitos',()=>{
 for(const cantidad of [-1,NaN,Infinity])assert.throws(()=>proyectarReposicion({...base,pendientes:[{producto:'a',cantidad}]}));
});
test('rechaza períodos inválidos',()=>{
 assert.throws(()=>proyectarReposicion({...base,dias:0}));assert.throws(()=>proyectarReposicion({...base,plazo:0}));
});
