/**
 * Archivo: db.js
 * Propósito: Configuración de servicios externos y conexiones.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado correctamente');
  } catch (error) {
    console.error('\nNo se pudo conectar a MongoDB:', error.message);
    console.error('Revisa que MongoDB esté en ejecución (en Windows: "Get-Service MongoDB") y que MONGODB_URI en el archivo .env sea correcta.\n');
    process.exit(1);
  }

  // Crear pedidos y registrar movimientos usa transacciones, que solo existen en un replica set.
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!info.setName) {
      console.warn(
        '\nAVISO: MongoDB NO está en modo replica set. La aplicación arranca, pero crear pedidos y\n' +
        'registrar movimientos de inventario fallará. Consulta "Transacciones de MongoDB" en el README.\n'
      );
    }
  } catch {
    /* si el servidor no permite la consulta, se omite el aviso */
  }
};

module.exports = conectarDB;
