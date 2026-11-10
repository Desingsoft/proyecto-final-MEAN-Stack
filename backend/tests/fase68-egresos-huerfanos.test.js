const test=require('node:test');
const assert=require('node:assert/strict');
const {auditarVinculosEgresos}=require('../utils/auditoriaEgresosHuerfanos');
const pago=(id,orden)=>({_id:id,orden,numero:`CE-${id}`,monto:100,estado:'vigente'});
test('identifica egresos sin orden',()=>{
 const r=auditarVinculosEgresos([pago('a',null)],[]);
 assert.equal(r.hallazgos[0].codigo,'EGRESO_SIN_ORDEN');
 assert.equal(r.resumen.pagosRevisados,1);
});
test('identifica egresos que apuntan a órdenes eliminadas',()=>{
 const r=auditarVinculosEgresos([pago('a','o1')],[]);
 assert.equal(r.hallazgos[0].codigo,'EGRESO_ORDEN_INEXISTENTE');
});
test('no marca órdenes existentes',()=>{
 const r=auditarVinculosEgresos([pago('a','o1')],[{_id:'o1'}]);
 assert.deepEqual(r.hallazgos,[]);
});
test('varios egresos y órdenes se correlacionan sin depender del orden de respuesta',()=>{
 const r=auditarVinculosEgresos([pago('a','o2'),pago('b','o1'),pago('c','o3')],[{_id:'o1'},{_id:'o2'}]);
 assert.equal(r.hallazgos.length,1);
 assert.equal(r.hallazgos[0].pago,'c');
});
test('no duplica hallazgos de sucursal/proveedor ya cubiertos en conciliación por orden',()=>{
 const r=auditarVinculosEgresos([{...pago('a','o1'),sucursal:'s2',proveedor:'p2'}],[{_id:'o1',sucursal:'s1',proveedor:'p1'}],{ordenesConciliadas:new Set(['o1'])});
 assert.deepEqual(r.hallazgos,[]);
});
