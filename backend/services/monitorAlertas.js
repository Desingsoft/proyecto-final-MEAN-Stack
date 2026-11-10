/**
 * Archivo: monitorAlertas.js
 * Propósito: Servicio de dominio: implementa procesos reutilizables y tareas automáticas.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Monitor de alertas: consulta el inventario periódicamente sin modificar existencias.
const Producto = require('../models/Producto');
const Notificacion = require('../models/Notificacion');
const Pedido = require('../models/Pedido');

async function revisarAlertas() {
  const productos = await Producto.find({ activo: true, $expr: { $lte: ['$stock', '$stockMinimo'] } }).select('_id nombre stock stockMinimo');
  for (const producto of productos) {
    // La clave evita avisos duplicados mientras el producto siga bajo mínimo.
    const clave = `stock:${producto.id}`;
    await Notificacion.updateOne({ clave }, { $set: {
      titulo: 'Stock bajo', mensaje: `${producto.nombre}: ${producto.stock} unidades (mínimo ${producto.stockMinimo})`,
      tipo: 'stock', leida: false, activa: true
    }, $setOnInsert: { clave } }, { upsert: true });
  }
  const activas = productos.map(p => `stock:${p.id}`);
  await Notificacion.updateMany({ tipo: 'stock', clave: { $nin: activas }, activa: true }, { $set: { activa: false } });
  const pendientes = await Pedido.countDocuments({ estado: 'pendiente' });
  if (pendientes) await Notificacion.updateOne({ clave: 'pedidos:pendientes' }, {
    $set: { titulo: 'Pedidos pendientes', mensaje: `${pendientes} pedidos pendientes`, tipo: 'pedidos', activa: true },
    $setOnInsert: { clave: 'pedidos:pendientes' }
  }, { upsert: true });
  else await Notificacion.updateMany({ clave: 'pedidos:pendientes' }, { $set: { activa: false } });
  return { productosBajoMinimo: productos.length, pedidosPendientes: pendientes };
}

let intervaloActivo = null;
function detenerMonitor() {
  if (intervaloActivo) clearInterval(intervaloActivo);
  intervaloActivo = null;
}

function iniciarMonitor() {
  if (intervaloActivo) return;
  const minutos = Number(process.env.ALERTAS_INTERVALO_MIN ?? 15);
  if (!Number.isFinite(minutos) || minutos <= 0) return;
  // Un único monitor por proceso; en despliegues multiinstancia usar un job centralizado.
  const ejecutar = () => revisarAlertas().catch(error => console.error('Error monitor de alertas:', error.message));
  const intervalo = setInterval(ejecutar, Math.max(minutos, 1) * 60000);
  intervalo.unref();
  intervaloActivo = intervalo;
  ejecutar();
}
module.exports = { revisarAlertas, iniciarMonitor, detenerMonitor };
