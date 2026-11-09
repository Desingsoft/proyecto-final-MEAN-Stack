/**
 * Archivo: configuracionController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const Configuracion = require('../models/Configuracion');

// Devuelve la configuración guardada o, si aún no existe, los valores por defecto.
const cargar = async () => {
  const guardada = await Configuracion.findById('general').lean();
  return { ...new Configuracion().toObject(), ...(guardada || {}) };
};

exports.cargar = cargar;

// GET /api/configuracion
/**
 * Controlador obtener: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtener = async (req, res) => {
  try {
    res.json(await cargar());
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la configuración' });
  }
};

const CAMPOS = [
  'nombreEmpresa', 'nit', 'direccion', 'ciudad', 'telefono', 'email', 'ivaPorcentaje',
  'preciosIncluyenIva', 'prefijoFactura', 'prefijoRemision', 'prefijoOrdenCompra', 'prefijoRecibo', 'prefijoEgreso', 'prefijoNotaCredito', 'prefijoDevolucion', 'prefijoReembolso', 'diasCreditoDefecto', 'notaFactura'
];

// PUT /api/configuracion (admin)
/**
 * Controlador actualizar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.actualizar = async (req, res) => {
  try {
    const cambios = {};
    for (const campo of CAMPOS) if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];

    if (cambios.nombreEmpresa !== undefined && !String(cambios.nombreEmpresa).trim()) {
      return res.status(400).json({ mensaje: 'El nombre de la empresa es obligatorio' });
    }
    if (cambios.ivaPorcentaje !== undefined && !(Number(cambios.ivaPorcentaje) >= 0 && Number(cambios.ivaPorcentaje) <= 100)) {
      return res.status(400).json({ mensaje: 'El IVA debe estar entre 0 y 100' });
    }
    for (const prefijo of ['prefijoFactura', 'prefijoRemision', 'prefijoOrdenCompra', 'prefijoRecibo', 'prefijoEgreso', 'prefijoNotaCredito', 'prefijoDevolucion', 'prefijoReembolso']) {
      if (cambios[prefijo] !== undefined && !/^[A-Za-z0-9]{1,6}$/.test(cambios[prefijo])) {
        return res.status(400).json({ mensaje: 'Los prefijos deben tener de 1 a 6 letras o números, sin espacios' });
      }
    }

    await Configuracion.findOneAndUpdate({ _id: 'general' }, { $set: cambios }, { upsert: true, runValidators: true });
    res.json(await cargar());
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al guardar la configuración', error: error.message });
  }
};
