const test=require('node:test');const assert=require('node:assert/strict');
const {enteroLimitado,proyectarReposicion}=require('../utils/pronosticoSucursal');
test('parámetros estrictos, sin fracciones ni desbordamientos',()=>{
 assert.equal(enteroLimitado(undefined,90,7,365),90);
 for(const v of ['3.5','Infinity','abc',-1,0,366])assert.equal(enteroLimitado(v,90,7,365),null);
 assert.equal(enteroLimitado('30',90,7,365),30);
});
test('la reposición se calcula con existencias locales, no stock global',()=>{
 const filas=proyectarReposicion({existencias:[{producto:'a',cantidad:2},{producto:'a',cantidad:3}],salidas:[{_id:'a',cantidad:30}],productos:[{_id:'a',sku:'A',nombre:'A',stockMinimo:2,stock:999}],dias:30,plazo:7});
 assert.equal(filas[0].stockSucursal,5);assert.equal(filas[0].puntoPedido,9);assert.equal(filas[0].cantidadSugerida,4);
});
test('sin salidas se usa stock mínimo como punto de pedido',()=>{
 const filas=proyectarReposicion({existencias:[],salidas:[],productos:[{_id:'b',sku:'B',nombre:'B',stockMinimo:5}],dias:30,plazo:7});
 assert.equal(filas[0].cantidadSugerida,5);
});
test('no muestra productos con existencias suficientes',()=>{
 const filas=proyectarReposicion({existencias:[{producto:'a',cantidad:100}],salidas:[],productos:[{_id:'a',stockMinimo:5}],dias:30,plazo:7});
 assert.equal(filas.length,0);
});
test('rechaza saldos y movimientos inválidos',()=>{
 const base={existencias:[],salidas:[],productos:[],dias:30,plazo:7};
 assert.throws(()=>proyectarReposicion({...base,existencias:[{producto:'a',cantidad:-1}]}));
 assert.throws(()=>proyectarReposicion({...base,salidas:[{_id:'a',cantidad:NaN}]}));
});
