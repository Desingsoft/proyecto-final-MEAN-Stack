/** Verifica que cambiar el correo no evada el límite por dirección IP. */
const test = require('node:test');
const assert = require('node:assert/strict');
const limitarLogin = require('../middlewares/limitarLogin');

test('bloquea por IP incluso cuando se cambia el correo', () => {
  const ip = '192.0.2.42';
  let bloqueados = 0;
  for (let i = 0; i < 62; i += 1) {
    const req = { ip, body: { email: `persona${i}@ejemplo.test` } };
    const res = {
      codigo: 200,
      status(codigo) { this.codigo = codigo; return this; },
      set() { return this; },
      json() { bloqueados += 1; return this; }
    };
    let paso = false;
    limitarLogin(req, res, () => { paso = true; });
    if (i < 60) assert.equal(paso, true);
    else assert.equal(res.codigo, 429);
  }
  assert.equal(bloqueados, 2);
});
