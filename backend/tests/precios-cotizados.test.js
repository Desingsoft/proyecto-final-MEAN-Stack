/**
 * Archivo: precios-cotizados.test.js
 * Propósito: Prueba automatizada: verifica un comportamiento esperado.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Pruebas unitarias de la conservación de precios aprobados.
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarLineasCotizadas, calcularTotalCotizado } = require('../utils/preciosCotizados');
const aprobadas = [{producto:'a',cantidad:2,precioUnitario:85000}];
test('conserva cantidades aprobadas sin depender del precio actual',()=>{
 assert.equal(validarLineasCotizadas([{producto:'a',cantidad:2}],aprobadas),true);
});
test('rechaza cambios de cantidades',()=>{
 assert.equal(validarLineasCotizadas([{producto:'a',cantidad:3}],aprobadas),false);
});
test('rechaza productos duplicados',()=>{
 assert.equal(validarLineasCotizadas([{producto:'a',cantidad:1},{producto:'a',cantidad:1}],aprobadas),false);
});
test('respeta total con descuento aprobado',()=>{
 assert.equal(calcularTotalCotizado({subtotal:170000,descuentoPorcentaje:10,total:153000}),153000);
});
test('rechaza total inconsistente',()=>{
 assert.throws(()=>calcularTotalCotizado({subtotal:170000,descuentoPorcentaje:10,total:160000}));
});
