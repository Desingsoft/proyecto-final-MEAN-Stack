/**
 * Archivo: clienteController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const Documento = require('../models/Documento');

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idValido = (id) => mongoose.isValidObjectId(id);
const CAMPOS = ['nombre', 'tipoDocumento', 'documento', 'email', 'telefono', 'direccion', 'ciudad', 'notas', 'diasCredito', 'cupoCredito'];

// Los campos numéricos vacíos del formulario se guardan como "sin valor".
const limpiarNumeros = (datos) => {
  for (const campo of ['diasCredito', 'cupoCredito']) {
    if (datos[campo] === '' || datos[campo] === null) datos[campo] = campo === 'cupoCredito' ? 0 : undefined;
    else if (datos[campo] !== undefined && !(Number(datos[campo]) >= 0)) throw { status: 400, mensaje: `El valor de ${campo === 'cupoCredito' ? 'cupo de crédito' : 'días de crédito'} no es válido` };
    else if (datos[campo] !== undefined) datos[campo] = Number(datos[campo]);
  }
};

// GET /api/clientes?buscar=&pagina=&limite=
/**
 * Controlador listar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listar = async (req, res) => {
  try {
    const { buscar, pagina = 1, limite = 20 } = req.query;
    const filtro = { activo: true };
    if (buscar) {
      const patron = { $regex: escapar(buscar), $options: 'i' };
      filtro.$or = [{ nombre: patron }, { documento: patron }, { email: patron }, { telefono: patron }];
    }

    const [clientes, total] = await Promise.all([
      Cliente.find(filtro).sort({ nombre: 1 }).skip((pagina - 1) * limite).limit(Number(limite)).lean(),
      Cliente.countDocuments(filtro)
    ]);
    res.json({ clientes, total, paginas: Math.ceil(total / limite) });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los clientes' });
  }
};

// GET /api/clientes/:id - ficha con estadísticas, pedidos y documentos recientes
/**
 * Controlador obtener: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtener = async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador inválido' });
    const cliente = await Cliente.findById(req.params.id).lean();
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const [pedidos, documentos] = await Promise.all([
      Pedido.find({ clienteRef: cliente._id }).sort({ createdAt: -1 }).select('total estado createdAt items cliente').lean(),
      Documento.find({ clienteRef: cliente._id }).sort({ createdAt: -1 }).limit(10)
        .select('tipo numero total estado createdAt formaPago fechaVencimiento pedido').lean()
    ]);
    const validos = pedidos.filter((p) => p.estado !== 'cancelado');
    const totalComprado = validos.reduce((s, p) => s + p.total, 0);

    res.json({
      ...cliente,
      estadisticas: {
        pedidos: pedidos.length,
        totalComprado,
        ticketPromedio: validos.length ? Math.round(totalComprado / validos.length) : 0,
        ultimaCompra: validos[0]?.createdAt ?? null
      },
      pedidos: pedidos.slice(0, 10).map(({ items, ...resto }) => ({ ...resto, unidades: items.reduce((s, i) => s + i.cantidad, 0) })),
      documentos
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el cliente' });
  }
};

const duplicado = async ({ tipoDocumento, documento }, idExcluido) => {
  if (!documento) return null;
  const filtro = { activo: true, tipoDocumento, documento };
  if (idExcluido) filtro._id = { $ne: idExcluido };
  return Cliente.findOne(filtro).lean();
};

// POST /api/clientes
/**
 * Controlador crear: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.crear = async (req, res) => {
  try {
    const datos = {};
    for (const campo of CAMPOS) if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    limpiarNumeros(datos);
    if (!datos.nombre || !String(datos.nombre).trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
    if (datos.email && !/^\S+@\S+\.\S+$/.test(datos.email)) return res.status(400).json({ mensaje: 'El correo no es válido' });

    const repetido = await duplicado({ tipoDocumento: datos.tipoDocumento || 'CC', documento: datos.documento });
    if (repetido) return res.status(400).json({ mensaje: `Ya existe un cliente con ese documento: ${repetido.nombre}` });

    const cliente = await Cliente.create(datos);
    res.status(201).json(cliente);
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.mensaje || 'Error al crear el cliente', error: error.message });
  }
};

// PUT /api/clientes/:id
/**
 * Controlador actualizar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.actualizar = async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador inválido' });
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const cambios = {};
    for (const campo of CAMPOS) if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    limpiarNumeros(cambios);
    Object.assign(cliente, cambios);
    if (!String(cliente.nombre).trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
    if (cliente.email && !/^\S+@\S+\.\S+$/.test(cliente.email)) return res.status(400).json({ mensaje: 'El correo no es válido' });

    const repetido = await duplicado(cliente, cliente._id);
    if (repetido) return res.status(400).json({ mensaje: `Ya existe un cliente con ese documento: ${repetido.nombre}` });

    await cliente.save();
    res.json(cliente);
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.mensaje || 'Error al actualizar el cliente', error: error.message });
  }
};

// DELETE /api/clientes/:id (borrado lógico: sus pedidos y documentos se conservan)
/**
 * Controlador eliminar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.eliminar = async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador inválido' });
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el cliente' });
  }
};
