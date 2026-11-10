/**
 * Archivo: conversion-integridad.test.js
 * Propósito: Prueba automatizada: verifica un comportamiento esperado.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Comprobaciones de regresión: protegen la atomicidad de conversión y stock.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const leer = ruta => fs.readFileSync(path.join(__dirname,'..',ruta),'utf8');
test('la ruta delega la conversión al controlador sin interceptar res.json', () => {
 const codigo = leer('routes/avanzadoRoutes.js');
 assert.match(codigo,/cotizacionRef:cot\._id/);
 assert.doesNotMatch(codigo,/res\.json=function/);
 assert.match(codigo,/pedidoController\.crear\(req,res\)/);
});
test('pedido vincula la cotización en una transacción y descuenta stock condicionalmente', () => {
 const codigo = leer('controllers/pedidoController.js');
 assert.match(codigo,/conTransaccion\(async \(session\)/);
 assert.match(codigo,/stock: \{ \$gte: item\.cantidad \}/);
 assert.match(codigo,/pedidoRef: pedido\._id/);
});
