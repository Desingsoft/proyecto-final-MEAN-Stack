const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {resumirComprasPendientes}=require('../utils/pronosticoSucursal');
const fecha=new Date('2026-11-07T12:00:00Z');
const ordenes=[{_id:'o1',fechaEsperada:'2026-11-09',items:[
 {producto:'a',cantidad:10,cantidadRecibida:3,diasEntrega:5},
 {producto:'b',cantidad:4,cantidadRecibida:0,diasEntrega:1}]},
 {_id:'o2',fechaEsperada:'2026-11-05',items:[{producto:'a',cantidad:6,cantidadRecibida:1}]},
 {_id:'o3',items:[{producto:'c',cantidad:2}]},
 {_id:'o4',fechaEsperada:'2026-11-08',items:[{producto:'d',cantidad:3,cantidadRecibida:3}]}];
test('clasifica cada producto con su plazo individual',()=>{
 const {filas,totales}=resumirComprasPendientes(ordenes,fecha,7);
 assert.equal(filas.length,4);
 assert.deepEqual(totales.pendientes,{lineas:1,unidades:7});
 assert.deepEqual(totales.posteriores,{lineas:1,unidades:4});
 assert.deepEqual(totales.vencidos,{lineas:1,unidades:5});
 assert.deepEqual(totales.inciertos,{lineas:1,unidades:2});
});
test('identifica orden y producto de cada línea sin mutar origen',()=>{
 const copia=JSON.stringify(ordenes);
 const {filas}=resumirComprasPendientes(ordenes,fecha,7);
 assert.ok(filas.some(f=>f.orden==='o1'&&f.producto==='a'&&f.cantidad===7));
 assert.equal(JSON.stringify(ordenes),copia);
});
test('excluye líneas totalmente recibidas',()=>{
 const {filas}=resumirComprasPendientes(ordenes,fecha,7);
 assert.ok(!filas.some(f=>f.producto==='d'));
});
test('rechaza cantidades de compra inválidas',()=>{
 assert.throws(()=>resumirComprasPendientes([{items:[{producto:'x',cantidad:1,cantidadRecibida:2}]}],fecha),/inválida/);
});
test('rechaza totales fuera de entero seguro',()=>{
 assert.throws(()=>resumirComprasPendientes([{items:[{producto:'x',cantidad:Number.MAX_SAFE_INTEGER},{producto:'y',cantidad:1}]}],fecha),/fuera de rango/);
});
test('rechaza fecha de corte inválida',()=>{
 assert.throws(()=>resumirComprasPendientes([],new Date('invalid')), /Fecha de corte/);
});
test('endpoint aplica autorización de sucursal, paginación y filtro de órdenes abiertas',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../routes/empresaRoutes.js'),'utf8');
 const endpoint=s.slice(s.indexOf("router.get('/sucursales/:id/compras-pendientes'"),s.indexOf('// 8. Exportación CSV segura'));
 assert.match(endpoint,/permiso\('inventario\.leer'\),accesoSucursal/);
 assert.match(endpoint,/sucursal:req\.sucursalAutorizada/);
 assert.match(endpoint,/estado:\{\$in:\['enviada','parcial'\]\}/);
 assert.match(endpoint,/\.skip\(desplazamiento\)\.limit\(limite\)/);
 assert.match(endpoint,/totales corresponden a la página/);
});
