/**
 * Archivo: eventos.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Difusión de cambios en tiempo real (Server-Sent Events).
// Cada navegador abierto mantiene una conexión; cuando algo cambia, el servidor
// avisa QUÉ cambió (pedidos, productos…) y cada pantalla decide si vuelve a cargar.
const clientes = new Set();

const suscribir = (res) => {
  clientes.add(res);
  res.on('close', () => clientes.delete(res));
};

const publicar = (tipos) => {
  const mensaje = `event: cambio\ndata: ${JSON.stringify({ tipos, ts: Date.now() })}\n\n`;
  for (const res of clientes) res.write(mensaje);
};

// Latido para que proxies y navegadores no cierren conexiones inactivas.
const latido = setInterval(() => {
  for (const res of clientes) res.write(': latido\n\n');
}, 25000);
latido.unref();

// Qué datos se ven afectados según el recurso modificado.
const AFECTA = {
  pedidos: ['pedidos', 'productos', 'inventario'], // un pedido descuenta stock y crea movimientos
  inventario: ['inventario', 'productos'],
  productos: ['productos'],
  proveedores: ['proveedores', 'productos'],
  usuarios: ['usuarios'],
  auth: ['usuarios'], // /auth/registro crea usuarios
  clientes: ['clientes'],
  'ordenes-compra': ['ordenes-compra', 'productos', 'inventario'], // recibir mercancía sube el stock
  documentos: ['documentos', 'pedidos', 'cartera'],
  configuracion: ['configuracion'],
  devoluciones: ['devoluciones', 'pedidos', 'productos', 'inventario', 'documentos', 'cartera'], // devolver sube el stock y baja la factura
  pagos: ['pagos', 'documentos', 'ordenes-compra', 'cartera'] // un abono cambia saldos de facturas u órdenes
};

// Middleware: tras cualquier escritura exitosa en la API, avisa a los clientes conectados.
const difundirCambios = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const recurso = req.originalUrl.split('?')[0].split('/')[2]; // /api/<recurso>/...
      if (recurso === 'auth' && req.originalUrl.includes('/login')) return;
      if (AFECTA[recurso]) publicar(AFECTA[recurso]);
    });
  }
  next();
};

module.exports = { suscribir, publicar, difundirCambios };
