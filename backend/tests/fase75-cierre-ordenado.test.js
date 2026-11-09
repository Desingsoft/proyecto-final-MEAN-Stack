const test = require('node:test');
const assert = require('node:assert/strict');
const { crearCierreOrdenado } = require('../utils/cierreOrdenado');

test('cierra HTTP antes de desconectar MongoDB', async () => {
  const pasos = [];
  const cerrar = crearCierreOrdenado({
    servidor: { close: cb => { pasos.push('http'); cb(); } },
    detenerMonitor: () => pasos.push('monitor'),
    desconectar: async () => pasos.push('mongo'),
    registrar: () => pasos.push('log')
  });
  await cerrar();
  assert.deepEqual(pasos, ['log', 'monitor', 'http', 'mongo']);
});
test('señales repetidas no ejecutan cierre duplicado', async () => {
  let veces = 0;
  const cerrar = crearCierreOrdenado({ servidor: { close: cb => { veces++; cb(); } }, desconectar: async () => { veces++; } });
  await Promise.all([cerrar('SIGTERM'), cerrar('SIGINT'), cerrar('SIGTERM')]);
  assert.equal(veces, 2);
});
test('desconecta MongoDB incluso cuando falla cierre HTTP', async () => {
  let desconectado = false;
  const cerrar = crearCierreOrdenado({ servidor: { close: cb => cb(new Error('http error')) }, desconectar: async () => { desconectado = true; } });
  await assert.rejects(cerrar(), /http error/);
  assert.equal(desconectado, true);
});
test('desconecta MongoDB si el servidor tarda demasiado', async () => {
  let desconectado = false;
  const cerrar = crearCierreOrdenado({ servidor: { close: () => {} }, desconectar: async () => { desconectado = true; }, tiempoMaximoMs: 5 });
  await assert.rejects(cerrar(), /Tiempo máximo/);
  assert.equal(desconectado, true);
});
test('reporta errores de desconexión', async () => {
  const cerrar = crearCierreOrdenado({ servidor: { close: cb => cb() }, desconectar: async () => { throw new Error('mongo error'); } });
  await assert.rejects(cerrar(), /mongo error/);
});
