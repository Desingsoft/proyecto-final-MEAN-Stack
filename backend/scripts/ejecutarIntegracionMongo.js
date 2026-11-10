/** Ejecutor obligatorio de integración MongoDB: una prueba omitida NO cuenta como éxito.
 * Solo se ejecuta contra una base de pruebas explícita.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { validarBasePruebas } = require('../utils/validarBasePruebas');

function validarConfiguracion(uri) {
  if (!validarBasePruebas(uri)) {
    throw new Error('MONGO_TEST_URI debe apuntar a una base explícita de pruebas (test/prueba).');
  }
}

function evaluarResultado(resultado) {
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) throw new Error(`Las pruebas MongoDB fallaron (código ${resultado.status}).`);
  const salida = `${resultado.stdout || ''}\n${resultado.stderr || ''}`;
  const matches = Object.fromEntries([...salida.matchAll(/^# (tests|pass|fail|skipped) (\d+)$/gm)].map(m => [m[1], Number(m[2])]));
  if (!Number.isInteger(matches.tests) || matches.tests < 1 || matches.fail !== 0 || matches.skipped !== 0 || matches.pass !== matches.tests) {
    throw new Error(`Integración MongoDB incompleta: ${JSON.stringify(matches)}. No se aceptan pruebas omitidas.`);
  }
  return matches;
}

if (require.main === module) {
  try {
    validarConfiguracion(process.env.MONGO_TEST_URI);
    const resultado = spawnSync(process.execPath, ['--test', 'tests/fase39-integracion-mongo.test.js', 'tests/fase47-integridad-mongo.test.js'], {
      cwd: path.resolve(__dirname, '..'), encoding: 'utf8', env: process.env, timeout: 120000
    });
    process.stdout.write(resultado.stdout || '');
    process.stderr.write(resultado.stderr || '');
    const resumen = evaluarResultado(resultado);
    process.stdout.write(`Integración MongoDB aprobada: ${resumen.pass} pruebas ejecutadas, ninguna omitida.\n`);
  } catch (error) {
    process.stderr.write(`ERROR DE INTEGRACIÓN: ${error.message}\n`);
    process.exitCode = 1;
  }
}
module.exports = { validarConfiguracion, evaluarResultado };
