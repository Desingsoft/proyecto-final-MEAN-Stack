/**
 * Archivo: server.js
 * Propósito: Punto de entrada del servidor Node.js/Express.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
require('dotenv').config();

// Comprobar configuración antes de abrir puertos o conectar a MongoDB.
const { validarEntorno } = require('./utils/validarEntorno');
const entorno = validarEntorno(process.env);
for (const aviso of entorno.advertencias) console.warn(`AVISO: ${aviso}`);
if (!entorno.valido) {
  for (const error of entorno.errores) console.error(`CONFIGURACIÓN: ${error}`);
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('node:crypto');
const conectarDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const productoRoutes = require('./routes/productoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const proveedorRoutes = require('./routes/proveedorRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const ordenCompraRoutes = require('./routes/ordenCompraRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const carteraRoutes = require('./routes/carteraRoutes');
const devolucionRoutes = require('./routes/devolucionRoutes');
const { difundirCambios } = require('./utils/eventos');
const auditoria = require('./middlewares/auditoria');
const avanzadoRoutes = require('./routes/avanzadoRoutes');
const empresaRoutes = require('./routes/empresaRoutes');



const app = express();

// Permite restringir orígenes desde CORS_ORIGINS (lista separada por comas).
// Sin configuración se conserva la compatibilidad con instalaciones locales.
const origenes = entorno.origenes;
app.disable('x-powered-by');
// En producción, CORS sin lista explícita no debe abrirse a cualquier origen.
if (process.env.NODE_ENV === 'production' && origenes.length === 0) {
  throw new Error('Configura CORS_ORIGINS antes de iniciar el servidor en producción');
}
app.use(cors({ origin: origenes.length ? origenes : true }));
// Correlación de solicitudes para soporte y diagnóstico, sin registrar datos personales.
app.use((req, res, next) => {
  const identificador = crypto.randomUUID();
  req.requestId = identificador;
  res.set('X-Request-ID', identificador);
  next();
});
// Limitar solicitudes JSON reduce el riesgo de agotamiento de memoria.
app.use(express.json({ limit: '1mb' }));
// Cabeceras defensivas para respuestas de la API.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Frame-Options', 'DENY');
  res.set('Cache-Control', 'no-store');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// La conexión se inicia en arrancarServidor(), antes del monitor y de aceptar HTTP.

app.use('/api', difundirCambios);
app.use('/api', auditoria);
app.use('/api/avanzado', avanzadoRoutes);
app.use('/api/empresa', empresaRoutes);

 // avisa en tiempo real tras cada cambio exitoso
app.use('/api/auth', authRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ordenes-compra', ordenCompraRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/cartera', carteraRoutes);
app.use('/api/devoluciones', devolucionRoutes);

// El estado de salud distingue proceso activo de base de datos desconectada.
app.get('/api/health', (req, res) => {
  const conectado = mongoose.connection.readyState === 1;
  res.status(conectado ? 200 : 503).json({ estado: conectado ? 'ok' : 'degradado', baseDatos: conectado ? 'conectada' : 'desconectada' });
});

// Ruta no encontrada: respuesta JSON uniforme para consumidores REST.
app.use('/api', (req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
/**
 * Inicia la API únicamente cuando MongoDB está listo. Evita que el monitor
 * ejecute consultas antes de establecer la conexión y que HTTP acepte pedidos
 * mientras la base de datos está desconectada durante el arranque.
 */
async function arrancarServidor() {
  await conectarDB();
  require('./services/monitorAlertas').iniciarMonitor();
  const servidor = app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
  servidor.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${PORT} ya está en uso. Detén el proceso anterior o cambia PORT.`);
      process.exit(1);
    }
    console.error('Error al iniciar HTTP:', error);
    process.exit(1);
  });
  // Las señales de Docker detienen primero HTTP, luego el monitor y MongoDB.
  const { crearCierreOrdenado } = require('./utils/cierreOrdenado');
  const cerrar = crearCierreOrdenado({
    servidor,
    detenerMonitor: require('./services/monitorAlertas').detenerMonitor,
    desconectar: () => mongoose.disconnect(),
    registrar: mensaje => console.log(mensaje)
  });
  for (const senal of ['SIGINT', 'SIGTERM']) {
    process.once(senal, () => cerrar(senal).then(
      () => { process.exitCode = 0; },
      error => { console.error('Error durante el cierre:', error.message); process.exitCode = 1; }
    ));
  }
  return servidor;
}

if (require.main === module) {
  arrancarServidor().catch((error) => {
    console.error('No se pudo iniciar la aplicación:', error);
    process.exit(1);
  });
}
module.exports = { app, arrancarServidor };
