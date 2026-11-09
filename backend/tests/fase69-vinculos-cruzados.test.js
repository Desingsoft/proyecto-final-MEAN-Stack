const test = require('node:test');
const assert = require('node:assert/strict');
const {auditarVinculosEgresos} = require('../utils/auditoriaEgresosHuerfanos');
const ordenes=[{_id:'o1',sucursal:'s1',proveedor:'p1'},{_id:'o2',sucursal:'s2',proveedor:'p2'}];
const pago=(orden,extra={})=>({_id:'e1',orden,numero:'CE1',monto:100,estado:'vigente',sucursal:'s1',proveedor:'p1',...extra});
test('detecta sucursal diferente de una orden fuera de alcance de conciliación',()=>{
 const r=auditarVinculosEgresos([pago('o2',{proveedor:'p2'})],ordenes);
 assert.deepEqual(r.hallazgos.map(x=>x.codigo),['EGRESO_SUCURSAL_DISTINTA']);
});
test('detecta proveedor diferente de una orden fuera de alcance',()=>{
 const r=auditarVinculosEgresos([pago('o2',{sucursal:'s2'})],ordenes);
 assert.deepEqual(r.hallazgos.map(x=>x.codigo),['EGRESO_PROVEEDOR_DISTINTO']);
});
test('detecta ambos vínculos incorrectos',()=>{
 const r=auditarVinculosEgresos([pago('o2')],ordenes);
 assert.deepEqual(r.hallazgos.map(x=>x.codigo),['EGRESO_SUCURSAL_DISTINTA','EGRESO_PROVEEDOR_DISTINTO']);
});
test('evita duplicar alertas de órdenes ya conciliadas',()=>{
 const r=auditarVinculosEgresos([pago('o2')],ordenes,{ordenesConciliadas:new Set(['o2'])});
 assert.equal(r.hallazgos.length,0);
});
test('mantiene detección de egreso huérfano incluso si se pasó un conjunto de órdenes conciliadas',()=>{
 const r=auditarVinculosEgresos([pago('inexistente')],ordenes,{ordenesConciliadas:new Set(['o1'])});
 assert.equal(r.hallazgos[0].codigo,'EGRESO_ORDEN_INEXISTENTE');
});
test('mantiene detección de pago sin orden',()=>{
 const r=auditarVinculosEgresos([pago(null)],ordenes,{ordenesConciliadas:new Set(['o1'])});
 assert.equal(r.hallazgos[0].codigo,'EGRESO_SIN_ORDEN');
});
test('no genera alertas para vínculos correctos',()=>{
 assert.deepEqual(auditarVinculosEgresos([pago('o1')],ordenes).hallazgos,[]);
});
test('detecta vínculos ausentes sin inventar referencias distintas',()=>{
 assert.deepEqual(auditarVinculosEgresos([pago('o1',{sucursal:null,proveedor:null})],ordenes).hallazgos.map(h=>h.codigo),['EGRESO_SIN_SUCURSAL','EGRESO_SIN_PROVEEDOR']);
});
test('audita varias órdenes de un mismo lote',()=>{
 const r=auditarVinculosEgresos([pago('o1'),pago('o2',{_id:'e2'})],ordenes);
 assert.equal(r.resumen.pagosRevisados,2);
 assert.equal(r.hallazgos.length,2);
});
