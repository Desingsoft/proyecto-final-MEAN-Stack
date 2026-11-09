const test=require('node:test');
const assert=require('node:assert/strict');
const {filtroOrdenesConciliadas,idsConciliadosEnLote}=require('../utils/alcanceConciliacionEgresos');
const {auditarVinculosEgresos}=require('../utils/auditoriaEgresosHuerfanos');
test('preserva el filtro por sucursal y periodo',()=>{
 const filtro={sucursal:'s1',createdAt:{$gte:new Date('2026-01-01')}};
 const q=filtroOrdenesConciliadas(filtro,['o1','o2']);
 assert.equal(q.sucursal,'s1');assert.equal(q.createdAt,filtro.createdAt);assert.deepEqual(q._id.$in,['o1','o2']);
 assert.equal(filtro._id,undefined);
});
test('elimina referencias repetidas y vacías del lote',()=>{
 assert.deepEqual(filtroOrdenesConciliadas({},['o1','o1',null,'','o2'])._id.$in,['o1','o2']);
});
test('rechaza un lote inválido',()=>{
 assert.throws(()=>filtroOrdenesConciliadas({},null),TypeError);
});
test('la membresía se limita a las órdenes recibidas en el lote',()=>{
 const ids=idsConciliadosEnLote([{_id:'o1'}]);
 assert.equal(ids.has('o1'),true);assert.equal(ids.has('o2'),false);
});
test('evita alertas duplicadas solo para órdenes del filtro original',()=>{
 const ordenes=[{_id:'o1',sucursal:'s1',proveedor:'p1'},{_id:'o2',sucursal:'s2',proveedor:'p2'}];
 const pagos=[{_id:'e1',orden:'o1',monto:100,estado:'vigente',sucursal:'s9',proveedor:'p9'},{_id:'e2',orden:'o2',monto:100,estado:'vigente',sucursal:'s9',proveedor:'p9'}];
 const resultado=auditarVinculosEgresos(pagos,ordenes,{ordenesConciliadas:idsConciliadosEnLote([ordenes[0]])});
 assert.equal(resultado.hallazgos.length,2);
 assert.ok(resultado.hallazgos.every(h=>h.orden==='o2'));
});
