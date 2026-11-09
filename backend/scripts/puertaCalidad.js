/** Puerta de calidad reproducible. No conecta a la base ni altera datos de negocio. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const backend = path.join(root, 'backend'), frontend = path.join(root, 'frontend');
const resultados = [];
const maxOutput = 2500;
function ejecutar(nombre, comando, args, cwd, obligatorio = true, timeout = 180000, analizar = null) {
  const r = spawnSync(comando, args, { cwd, encoding: 'utf8', timeout, env: process.env, maxBuffer: 12 * 1024 * 1024 });
  const salida = (r.stdout || '') + (r.stderr || '');
  const estado = r.error?.code === 'ENOENT' ? 'no_disponible' : r.status === 0 ? 'correcto' : 'fallo';
  const analisis = analizar ? analizar(salida, r.status) : {};
  resultados.push({ nombre, estado, obligatorio, codigo: r.status, ...analisis, detalle: r.error?.message || salida.slice(-maxOutput) });
  process.stdout.write(`[${estado.toUpperCase()}] ${nombre}\n`);
  if (estado !== 'correcto' && salida) process.stdout.write(salida.slice(-maxOutput) + '\n');
}
function archivosJs(directorio) {
  if (!fs.existsSync(directorio)) return [];
  return fs.readdirSync(directorio, { withFileTypes: true }).flatMap(e => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
    const ruta = path.join(directorio, e.name);
    return e.isDirectory() ? archivosJs(ruta) : e.isFile() && e.name.endsWith('.js') ? [ruta] : [];
  });
}
const js = archivosJs(backend);
let fallosSintaxis = [];
for (const archivo of js) {
  const r = spawnSync(process.execPath, ['--check', archivo], { cwd: backend, encoding: 'utf8', timeout: 10000 });
  if (r.status !== 0) fallosSintaxis.push({ archivo: path.relative(root, archivo), error: (r.stderr || r.error?.message || '').slice(0, 400) });
}
resultados.push({ nombre: 'Sintaxis de todos los JavaScript del backend', estado: fallosSintaxis.length ? 'fallo' : 'correcto', obligatorio: true, archivos: js.length, errores: fallosSintaxis });
process.stdout.write(`[${fallosSintaxis.length ? 'FALLO' : 'CORRECTO'}] Sintaxis backend (${js.length} archivos)\n`);
const pruebas = fs.readdirSync(path.join(backend, 'tests')).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(backend, 'tests', f));
ejecutar('Pruebas automatizadas backend', process.execPath, ['--test', ...pruebas], backend, true, 180000, require('../utils/resumenPruebasNode').resumirPruebasNode);
// Comprobación complementaria disponible incluso sin node_modules de Angular.
ejecutar('Referencias locales de Angular', process.execPath, [path.join(backend, 'scripts/verificarReferenciasAngular.js')], backend);
const ng = path.join(frontend, 'node_modules', '.bin', process.platform === 'win32' ? 'ng.cmd' : 'ng');
if (fs.existsSync(ng)) ejecutar('Compilación Angular', ng, ['build', '--configuration', 'production'], frontend, true, 240000);
else {
  resultados.push({ nombre: 'Compilación Angular', estado: 'no_disponible', obligatorio: true, detalle: 'Dependencias no instaladas. Ejecutar npm ci en frontend y repetir.' });
  process.stdout.write('[NO_DISPONIBLE] Compilación Angular (npm ci pendiente)\n');
}
const { evaluarPuertaCalidad } = require('../utils/evaluarPuertaCalidad');
const evaluacion = evaluarPuertaCalidad(resultados);
const reporte = { fecha: new Date().toISOString(), resultados, ...evaluacion };
process.stdout.write(`[${reporte.aprobado ? 'APROBADO' : 'NO_APROBADO'}] Puerta de calidad: ${reporte.bloqueos.length} bloqueos, ${reporte.advertencias.length} advertencias\n`);
const salida = process.env.QUALITY_REPORT || path.join(root, 'docs', 'resultado-puerta-calidad.json');
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, JSON.stringify(reporte, null, 2) + '\n');
process.stdout.write(`Informe: ${salida}\n`);
if (!reporte.aprobado) process.exitCode = 2;
