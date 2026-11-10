/** Verificación estática SIN Angular CLI: detecta referencias locales faltantes.
 * No sustituye la compilación TypeScript ni valida los templates Angular.
 */
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '../../frontend/src');
function recorrer(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const ruta = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(ruta) : e.name.endsWith('.ts') ? [ruta] : [];
  });
}
function comprobar(ruta, destino, extensiones) {
  const base = path.resolve(path.dirname(ruta), destino);
  return extensiones.some(ext => fs.existsSync(base + ext));
}
function verificar() {
  const errores = [];
  const archivos = recorrer(raiz);
  let referencias = 0;
  for (const ruta of archivos) {
    const codigo = fs.readFileSync(ruta, 'utf8');
    // Importaciones estáticas, exportaciones y carga diferida import('./...').
    const importaciones = /(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)['"](\.[^'"]+)['"]/g;
    for (const m of codigo.matchAll(importaciones)) {
      referencias++;
      if (!comprobar(ruta, m[1], ['.ts', '.tsx', '.js', '/index.ts', '']))
        errores.push({ archivo: path.relative(raiz, ruta), referencia: m[1], tipo: 'import' });
    }
    for (const m of codigo.matchAll(/\b(?:templateUrl|styleUrl)\s*:\s*['"](\.[^'"]+)['"]/g)) {
      referencias++;
      if (!comprobar(ruta, m[1], ['']))
        errores.push({ archivo: path.relative(raiz, ruta), referencia: m[1], tipo: 'recurso' });
    }
    for (const m of codigo.matchAll(/\bstyleUrls\s*:\s*\[([^\]]+)\]/g)) {
      for (const sub of m[1].matchAll(/['"](\.[^'"]+)['"]/g)) {
        referencias++;
        if (!comprobar(ruta, sub[1], ['']))
          errores.push({ archivo: path.relative(raiz, ruta), referencia: sub[1], tipo: 'estilo' });
      }
    }
  }
  return { archivos: archivos.length, referencias, errores };
}
if (require.main === module) {
  const resultado = verificar();
  console.log(JSON.stringify(resultado, null, 2));
  if (resultado.errores.length) process.exitCode = 1;
}
module.exports = { verificar };
