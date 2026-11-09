const test = require('node:test');
const assert = require('node:assert/strict');
const { validarBasePruebas } = require('../utils/validarBasePruebas');
for (const uri of [
  'mongodb://localhost:27017/inventario_test',
  'mongodb://localhost:27017/prueba',
  'mongodb://localhost:27017/inventario_fase39_test?replicaSet=rs0',
  'mongodb+srv://usuario:clave@cluster.example/inventario_prueba?retryWrites=true'
]) test(`acepta base de pruebas: ${uri.split('@').pop()}`, () => assert.equal(validarBasePruebas(uri), true));
for (const uri of [
  undefined, '', 'mongodb://localhost:27017/', 'mongodb://localhost:27017/inventario_pedidos',
  'mongodb://test.local:27017/production', 'mongodb://test:password@localhost:27017/admin',
  'mongodb://localhost:27017/production?replicaSet=test', 'http://localhost:27017/inventario_test',
  'mongodb://localhost:27017/inventario_test/otra', 'mongodb://localhost:27017/inventario%2Ftest'
]) test(`rechaza base no segura: ${String(uri)}`, () => assert.equal(validarBasePruebas(uri), false));
