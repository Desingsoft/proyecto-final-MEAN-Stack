/** Preflight sin conexión a MongoDB; nunca imprime valores de secretos. */
require('dotenv').config();
const { validarEntorno } = require('../utils/validarEntorno');
const resultado = validarEntorno(process.env);
const salida = { valido: resultado.valido, errores: resultado.errores, advertencias: resultado.advertencias, cantidadOrigenes: resultado.origenes.length };
console.log(JSON.stringify(salida, null, 2));
if (!resultado.valido) process.exitCode = 2;
