/** Diagnóstico sin modificar instalaciones. Útil antes de intentar compilar. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function comprobar() {
  const paquetes = [
    ['backend', 'mongoose'], ['backend', 'express'],
    ['frontend', '@angular/cli'], ['frontend', '@angular/compiler-cli'],
    ['frontend', '@angular/core'], ['frontend', 'typescript']
  ];
  return paquetes.map(([parte, paquete]) => {
    const ruta = path.join(root, parte, 'node_modules', ...paquete.split('/'), 'package.json');
    return { proyecto: parte, paquete, instalado: fs.existsSync(ruta) };
  });
}
if (require.main === module) {
  const resultado = comprobar();
  console.log(JSON.stringify({ dependencias: resultado, completas: resultado.every(x => x.instalado) }, null, 2));
  if (resultado.some(x => !x.instalado)) process.exitCode = 2;
}
module.exports = { comprobar };
