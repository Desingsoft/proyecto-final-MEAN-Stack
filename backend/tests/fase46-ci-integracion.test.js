const test = require('node:test');
const assert = require('node:assert/strict');
const { validarConfiguracion, evaluarResultado } = require('../scripts/ejecutarIntegracionMongo');

test('integración obligatoria rechaza URI ausente', () => assert.throws(() => validarConfiguracion(), /MONGO_TEST_URI/));
test('integración obligatoria rechaza base de producción', () => assert.throws(() => validarConfiguracion('mongodb://localhost:27017/inventario_pedidos'), /MONGO_TEST_URI/));
test('integración obligatoria acepta base test', () => assert.doesNotThrow(() => validarConfiguracion('mongodb://127.0.0.1:27017/inventario_ci_test')));
test('integración obligatoria rechaza prueba omitida', () => assert.throws(() => evaluarResultado({status:0,stdout:'# tests 1\n# pass 0\n# fail 0\n# skipped 1'}), /incompleta/));
test('integración obligatoria rechaza suite vacía', () => assert.throws(() => evaluarResultado({status:0,stdout:'# tests 0\n# pass 0\n# fail 0\n# skipped 0'}), /incompleta/));
test('integración obligatoria rechaza error del runner', () => assert.throws(() => evaluarResultado({status:1,stdout:'# tests 1\n# pass 0\n# fail 1\n# skipped 0'}), /fallaron/));
test('integración obligatoria acepta una prueba realmente aprobada', () => assert.equal(evaluarResultado({status:0,stdout:'# tests 1\n# pass 1\n# fail 0\n# skipped 0'}).pass, 1));
