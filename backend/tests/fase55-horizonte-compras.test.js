const test=require('node:test');
const assert=require('node:assert/strict');
const {clasificarPendientes,proyectarReposicion}=require('../utils/pronosticoSucursal');
const corte=new Date('2026-11-07T12:00:00Z');
const orden=(fecha)=>({_id:'oc',fechaEsperada:fecha,items:[{producto:'p',cantidad:10,cantidadRecibida:2}]});
const base={existencias:[{producto:'p',cantidad:2}],salidas:[{_id:'p',cantidad:30}],productos:[{_id:'p',stockMinimo:2}],dias:30,plazo:7};
test('las entregas posteriores al plazo no descuentan el pedido sugerido',()=>{
 const clasificacion=clasificarPendientes([orden('2026-12-01')],corte,7);
 assert.equal(clasificacion.posteriores.length,1);
 const [fila]=proyectarReposicion({...base,...clasificacion});
 assert.equal(fila.enCaminoFueraPlazo,8);assert.equal(fila.enCamino,0);assert.equal(fila.cantidadSugerida,7);
});
test('órdenes sin fecha no reducen la sugerencia',()=>{
 const clasificacion=clasificarPendientes([orden(null)],corte,7);
 const [fila]=proyectarReposicion({...base,...clasificacion});
 assert.equal(fila.enCaminoSinFecha,8);assert.equal(fila.cantidadSugerida,7);
});
test('entrega en el último día del horizonte sí cuenta',()=>{
 const r=clasificarPendientes([orden('2026-11-14')],corte,7);
 assert.equal(r.pendientes.length,1);assert.equal(r.posteriores.length,0);
});
test('entrega en el mismo día no se considera atrasada por la hora',()=>{
 const r=clasificarPendientes([orden('2026-11-07T00:00:00Z')],corte,7);
 assert.equal(r.pendientes.length,1);assert.equal(r.vencidos.length,0);
});
test('rechaza fechas de compra inválidas y horizontes fuera de rango',()=>{
 assert.throws(()=>clasificarPendientes([orden('fecha-invalida')],corte,7));
 assert.throws(()=>clasificarPendientes([],corte,181));
});
test('las órdenes de categorías distintas se separan sin duplicarse',()=>{
 const r=clasificarPendientes([orden('2026-11-01'),orden(null),orden('2026-11-10'),orden('2026-11-20')],corte,7);
 assert.deepEqual([r.vencidos.length,r.inciertos.length,r.pendientes.length,r.posteriores.length],[1,1,1,1]);
});
