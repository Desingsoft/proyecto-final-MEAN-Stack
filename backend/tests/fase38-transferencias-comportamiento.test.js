/** Pruebas de comportamiento del controlador sin MongoDB real.
 * Simulan respuestas de los modelos, NO prueban concurrencia del motor MongoDB.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const oid = n => String(n).padStart(24, '0');
const producto = oid(1), origen = oid(2), destino = oid(3), sucursalA = oid(4), sucursalB = oid(5);
const usuario = oid(6);
const clave = 'clave_transferencia_2026_001';

function controlador({ stock = 10, autorizado = [sucursalA, sucursalB], previa = null, failDestino = false, destinoSinCambio = false } = {}) {
  const estado = { origen: stock, destino: 2, movimientos: [], transferencias: [], commits: 0, rollbacks: 0 };
  const fakeMongoose = { isValidObjectId: v => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v) };
  const session = { test: true };
  const models = {
    '../models/MovimientoInventario': {
      create: async (docs) => { estado.movimientos.push(...docs); return docs; }
    },
    '../models/Producto': { findById: id => ({ session: async () => id === producto ? { activo: true } : null }) },
    '../models/Bodega': { findById: id => ({ session: async () => id === origen ? { activa: true, sucursal: sucursalA } : id === destino ? { activa: true, sucursal: sucursalB } : null }) },
    '../models/Existencia': {
      updateOne: async (filter, update) => {
        if (filter.bodega === origen) {
          if (estado.origen < (filter.cantidad?.$gte || 0)) return { modifiedCount: 0 };
          estado.origen += update.$inc.cantidad;
        } else if (filter.bodega === destino) {
          if (failDestino) throw Error('fallo simulado en destino');
          if (destinoSinCambio) return { modifiedCount: 0, upsertedCount: 0 };
          estado.destino += update.$inc.cantidad;
        }
        return { modifiedCount: 1 };
      }
    },
    '../models/TransferenciaInventario': {
      findOne: () => ({ lean: async () => previa }),
      create: async docs => { estado.transferencias.push(...docs); return [{ ...docs[0], _id: oid(7) }]; }
    },
    '../utils/transaccion': {
      conTransaccion: async fn => {
        const snapshot = { origen: estado.origen, destino: estado.destino, movimientos: [...estado.movimientos], transferencias: [...estado.transferencias] };
        try { const result = await fn(session); estado.commits++; return result; }
        catch (error) { Object.assign(estado, snapshot); estado.rollbacks++; throw error; }
      }
    }
  };
  const source = fs.readFileSync(path.join(__dirname, '../controllers/inventarioController.js'), 'utf8');
  const exports = {};
  vm.runInNewContext(`(function(require, exports){${source}\n})`, { console })(name => {
    if (name === 'mongoose') return fakeMongoose;
    if (name === 'crypto') return require('node:crypto');
    if (models[name]) return models[name];
    if (name === '../middlewares/validacionesComerciales') return {};
    throw Error('Dependencia inesperada: ' + name);
  }, exports);
  const request = (changes = {}) => ({
    body: { producto, origen, destino, cantidad: 3, motivo: 'traslado', ...changes },
    get: name => name === 'Idempotency-Key' ? clave : null,
    usuario: { id: usuario }, alcanceSucursales: autorizado
  });
  const invoke = async req => {
    const response = { statusCode: 200, payload: null, status(n) { this.statusCode = n; return this; }, json(obj) { this.payload = obj; return this; } };
    await exports.transferir(req, response);
    return response;
  };
  return { estado, request, invoke };
}

test('transferencia válida genera salida y entrada sin alterar suma de bodegas', async () => {
  const { estado, request, invoke } = controlador();
  const response = await invoke(request());
  assert.equal(response.statusCode, 201);
  assert.equal(estado.origen, 7);
  assert.equal(estado.destino, 5);
  assert.deepEqual(Array.from(estado.movimientos, m => m.tipo), ['salida', 'entrada']);
  assert.equal(estado.commits, 1);
});

test('rechaza salidas superiores al saldo disponible', async () => {
  const { estado, request, invoke } = controlador({ stock: 2 });
  const response = await invoke(request());
  assert.equal(response.statusCode, 409);
  assert.equal(estado.origen, 2);
  assert.equal(estado.destino, 2);
  assert.equal(estado.transferencias.length, 0);
  assert.equal(estado.rollbacks, 1);
});

test('rechaza acceso a bodega de otra sucursal sin revelar el registro', async () => {
  const { estado, request, invoke } = controlador({ autorizado: [sucursalA] });
  const response = await invoke(request());
  assert.equal(response.statusCode, 404);
  assert.equal(estado.movimientos.length, 0);
});

test('revierte cambios simulados si falla la escritura de destino', async () => {
  const { estado, request, invoke } = controlador({ failDestino: true });
  const response = await invoke(request());
  assert.equal(response.statusCode, 500);
  assert.equal(estado.origen, 10);
  assert.equal(estado.destino, 2);
  assert.equal(estado.movimientos.length, 0);
  assert.equal(estado.rollbacks, 1);
});

test('reintento idéntico devuelve registro previo sin crear movimientos', async () => {
  const { estado, request, invoke } = controlador();
  const primera = await invoke(request());
  assert.equal(primera.statusCode, 201);
  // La simulación de lectura previa se efectúa en otra instancia del controlador.
  const previa = { _id: oid(7), huellaSolicitud: require('node:crypto').createHash('sha256').update(JSON.stringify({ producto, origen, destino, cantidad: 3, motivo: 'traslado' })).digest('hex') };
  const repeticion = controlador({ previa });
  const segunda = await repeticion.invoke(repeticion.request());
  assert.equal(segunda.statusCode, 200);
  assert.equal(segunda.payload.repetida, true);
  assert.equal(repeticion.estado.movimientos.length, 0);
});

test('reutilizar clave para datos diferentes produce conflicto', async () => {
  const { request, invoke } = controlador({ previa: { _id: oid(7), huellaSolicitud: 'a'.repeat(64) } });
  const response = await invoke(request());
  assert.equal(response.statusCode, 409);
});

test('rechaza cantidades decimales, bodegas iguales y clave inválida', async () => {
  const { request, invoke } = controlador();
  assert.equal((await invoke(request({ cantidad: 1.5 }))).statusCode, 422);
  assert.equal((await invoke(request({ destino: origen }))).statusCode, 422);
  const req = request(); req.get = () => 'corta';
  assert.equal((await invoke(req)).statusCode, 400);
});

test('reintento no revela transferencia cuando usuario pierde permiso de sede', async () => {
  const { request, invoke } = controlador({ autorizado: [sucursalA], previa: { _id: oid(7), huellaSolicitud: 'a'.repeat(64) } });
  const response = await invoke(request());
  assert.equal(response.statusCode, 404);
});

test('no se crean movimientos si el producto no existe', async () => {
  const { estado, request, invoke } = controlador();
  const response = await invoke(request({ producto: oid(99) }));
  assert.equal(response.statusCode, 422);
  assert.equal(estado.movimientos.length, 0);
});

test('si el incremento de destino no modifica existencias se revierte toda la transferencia', async () => {
  const { estado, request, invoke } = controlador({ destinoSinCambio: true });
  const response = await invoke(request());
  assert.equal(response.statusCode, 409);
  assert.equal(estado.origen, 10);
  assert.equal(estado.destino, 2);
  assert.equal(estado.movimientos.length, 0);
});
