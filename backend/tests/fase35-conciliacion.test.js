const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluarTransferencia } = require('../utils/conciliacionTransferencias');
const t = { _id: 't1', producto: 'p1', origen: 'b1', destino: 'b2', cantidad: 8 };
const movimientos = [
  { transferenciaId: 't1', producto: 'p1', bodega: 'b1', cantidad: 8, tipo: 'salida' },
  { transferenciaId: 't1', producto: 'p1', bodega: 'b2', cantidad: 8, tipo: 'entrada' }
];
test('transferencia completa tiene salida y entrada coherentes', () => assert.equal(evaluarTransferencia(t, movimientos).correcto, true));
test('detecta falta de entrada', () => assert.deepEqual(evaluarTransferencia(t, movimientos.slice(0, 1)).errores, ['PAR_MOVIMIENTOS_INCOMPLETO']));
test('detecta cantidades alteradas', () => assert.ok(evaluarTransferencia(t, [{ ...movimientos[0], cantidad: 7 }, movimientos[1]]).errores.includes('MOVIMIENTO_SALIDA_INCONSISTENTE')));
test('detecta duplicación de salidas', () => assert.ok(evaluarTransferencia(t, [movimientos[0], movimientos[0], movimientos[1]]).errores.includes('PAR_MOVIMIENTOS_INCOMPLETO')));
test('ignora movimientos de otra transferencia', () => assert.equal(evaluarTransferencia(t, [...movimientos, { ...movimientos[0], transferenciaId: 't2' }]).correcto, true));
