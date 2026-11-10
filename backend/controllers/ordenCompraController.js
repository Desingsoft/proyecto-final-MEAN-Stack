/**
 * Archivo: ordenCompraController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const OrdenCompra = require('../models/OrdenCompra');
const Proveedor = require('../models/Proveedor');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');
const Bodega = require('../models/Bodega');
const Existencia = require('../models/Existencia');
const { conTransaccion } = require('../utils/transaccion');
const { siguiente, formatear } = require('../utils/consecutivos');
const { cargar: cargarConfig } = require('./configuracionController');
const { valorRecibido, saldoDeOrden } = require('../utils/cartera');

// Agrega lo que se debe por la mercancía recibida y lo que falta por pagar.
const conSaldo = (orden) => (orden ? { ...orden, valorRecibido: valorRecibido(orden), saldoPorPagar: saldoDeOrden(orden) } : orden);

const ESTADOS = ['borrador', 'enviada', 'parcial', 'recibida', 'cancelada'];
// Transiciones manuales permitidas. Pasar a "parcial" o "recibida" ocurre al registrar una recepción.
const TRANSICIONES = {
  borrador: ['enviada', 'cancelada'],
  enviada: ['cancelada'],
  parcial: ['recibida'], // cerrar la orden aunque falten unidades
  recibida: [],
  cancelada: []
};

const idValido = (id) => mongoose.isValidObjectId(id);
const falla = (status, mensaje) => ({ status, mensaje });
const responderError = (res, error, mensaje) =>
  error.status ? res.status(error.status).json({ mensaje: error.mensaje }) : res.status(500).json({ mensaje });

const poblar = (consulta) =>
  consulta
    .populate('proveedor', 'nombre contacto telefono email diasCredito')
    .populate('items.producto', 'nombre sku stock stockMinimo costo')
    .populate('creadoPor', 'nombre')
    .populate('recepciones.usuario', 'nombre')
    .populate('recepciones.items.producto', 'nombre sku');

const totalDe = (items) => Math.round(items.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0));

// Valida y normaliza las líneas de una orden. Lanza { status, mensaje } si algo no cuadra.
const normalizarItems = async (items, proveedorId) => {
  if (!Array.isArray(items) || items.length === 0) throw falla(400, 'La orden debe tener al menos un producto');
  const vistos = new Set();
  const resultado = [];
  for (const item of items) {
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) throw falla(400, 'Las cantidades deben ser números enteros mayores a cero');
    if (!idValido(item.producto)) throw falla(400, 'Producto inválido en la orden');
    if (vistos.has(String(item.producto))) throw falla(400, 'Un producto no puede repetirse en la misma orden');
    vistos.add(String(item.producto));

    const producto = await Producto.findById(item.producto).lean();
    if (!producto || !producto.activo) throw falla(404, `Producto no encontrado: ${item.producto}`);

    const costo = item.costoUnitario !== undefined && item.costoUnitario !== '' ? Number(item.costoUnitario) : producto.costo;
    if (!(costo >= 0)) throw falla(400, `El costo de "${producto.nombre}" no es válido`);
    resultado.push({ producto: producto._id, cantidad, cantidadRecibida: 0, costoUnitario: costo });
  }
  return resultado;
};

// GET /api/ordenes-compra?estado=&proveedor=&buscar=&pagina=&limite=
/**
 * Controlador listar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listar = async (req, res) => {
  try {
    const { estado, proveedor, buscar, pagina = 1, limite = 20 } = req.query;
    const filtro = req.alcanceSucursales === null ? {} : { sucursal: { $in: req.alcanceSucursales || [] } };
    if (estado && ESTADOS.includes(estado)) filtro.estado = estado;
    if (proveedor && idValido(proveedor)) filtro.proveedor = proveedor;
    if (buscar) filtro.numero = { $regex: buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const [ordenes, total, porEstado] = await Promise.all([
      OrdenCompra.find(filtro).populate('proveedor', 'nombre').sort({ createdAt: -1 })
        .skip((pagina - 1) * limite).limit(Number(limite)).lean(),
      OrdenCompra.countDocuments(filtro),
      Promise.all(ESTADOS.map((e) => OrdenCompra.countDocuments({ ...filtro, estado: e })))
    ]);

    res.json({
      ordenes: ordenes.map((o) => conSaldo({
        ...o,
        unidades: o.items.reduce((s, i) => s + i.cantidad, 0),
        unidadesRecibidas: o.items.reduce((s, i) => s + i.cantidadRecibida, 0)
      })),
      total,
      paginas: Math.ceil(total / limite),
      conteos: Object.fromEntries(ESTADOS.map((e, i) => [e, porEstado[i]]))
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener las órdenes de compra');
  }
};

// GET /api/ordenes-compra/:id
/**
 * Controlador obtener: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtener = async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador inválido' });
    const orden = await poblar(OrdenCompra.findById(req.params.id)).lean();
    if (!orden) return res.status(404).json({ mensaje: 'Orden de compra no encontrada' });
    res.json(conSaldo(orden));
  } catch (error) {
    responderError(res, error, 'Error al obtener la orden de compra');
  }
};

const crearBorrador = async ({ proveedor, items, notas, fechaEsperada, usuarioId, config }) => {
  const consecutivo = await siguiente('ordenCompra');
  return OrdenCompra.create({
    numero: formatear(config.prefijoOrdenCompra || 'OC', consecutivo),
    proveedor,
    items,
    total: totalDe(items),
    notas: notas || '',
    fechaEsperada: fechaEsperada || undefined,
    creadoPor: usuarioId
  });
};

// POST /api/ordenes-compra  { proveedor, items:[{producto,cantidad,costoUnitario?}], notas?, fechaEsperada? }
/**
 * Controlador crear: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.crear = async (req, res) => {
  try {
    const { proveedor, items, notas, fechaEsperada } = req.body;
    if (!idValido(proveedor) || !(await Proveedor.findById(proveedor).lean())) throw falla(400, 'Elige un proveedor válido');

    const lineas = await normalizarItems(items, proveedor);
    const orden = await crearBorrador({ proveedor, items: lineas, notas, fechaEsperada, usuarioId: req.usuario.id, config: await cargarConfig() });
    res.status(201).json(conSaldo(await poblar(OrdenCompra.findById(orden._id)).lean()));
  } catch (error) {
    responderError(res, error, 'Error al crear la orden de compra');
  }
};

// POST /api/ordenes-compra/desde-reposicion  { items:[{producto,cantidad}] }
// Crea un borrador por cada proveedor. Los productos sin proveedor se devuelven aparte.
/**
 * Controlador desdeReposicion: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.desdeReposicion = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) throw falla(400, 'Selecciona al menos un producto');

    const porProveedor = new Map();
    const sinProveedor = [];
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      if (!idValido(item.producto) || !Number.isInteger(cantidad) || cantidad < 1) continue;
      const producto = await Producto.findById(item.producto).lean();
      if (!producto || !producto.activo) continue;
      if (!producto.proveedor) { sinProveedor.push({ producto: producto._id, nombre: producto.nombre }); continue; }
      const clave = String(producto.proveedor);
      porProveedor.set(clave, [...(porProveedor.get(clave) ?? []), { producto: producto._id, cantidad }]);
    }

    if (porProveedor.size === 0) {
      throw falla(400, sinProveedor.length
        ? 'Ninguno de los productos tiene proveedor asignado. Asígnalo desde Productos para poder crear la orden.'
        : 'No hay productos válidos para crear órdenes');
    }

    const config = await cargarConfig();
    const ordenes = [];
    for (const [proveedor, lineas] of porProveedor) {
      const normalizadas = await normalizarItems(lineas, proveedor);
      const orden = await crearBorrador({ proveedor, items: normalizadas, usuarioId: req.usuario.id, config });
      ordenes.push(conSaldo(await poblar(OrdenCompra.findById(orden._id)).lean()));
    }
    res.status(201).json({ ordenes, sinProveedor });
  } catch (error) {
    responderError(res, error, 'Error al crear las órdenes de compra');
  }
};

// PUT /api/ordenes-compra/:id  (solo borradores)
/**
 * Controlador actualizar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.actualizar = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) throw falla(404, 'Orden de compra no encontrada');
    if (orden.estado !== 'borrador') throw falla(400, 'Solo se pueden editar las órdenes en borrador');

    const { proveedor, items, notas, fechaEsperada } = req.body;
    if (proveedor !== undefined) {
      if (!idValido(proveedor) || !(await Proveedor.findById(proveedor).lean())) throw falla(400, 'Elige un proveedor válido');
      orden.proveedor = proveedor;
    }
    if (items !== undefined) {
      orden.items = await normalizarItems(items, orden.proveedor);
      orden.total = totalDe(orden.items);
    }
    if (notas !== undefined) orden.notas = notas;
    if (fechaEsperada !== undefined) orden.fechaEsperada = fechaEsperada || undefined;

    await orden.save();
    res.json(conSaldo(await poblar(OrdenCompra.findById(orden._id)).lean()));
  } catch (error) {
    responderError(res, error, 'Error al actualizar la orden de compra');
  }
};

// PATCH /api/ordenes-compra/:id/estado  { estado }
/**
 * Controlador cambiarEstado: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) throw falla(400, 'Estado inválido');
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');

    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) throw falla(404, 'Orden de compra no encontrada');
    if (!TRANSICIONES[orden.estado].includes(estado)) {
      throw falla(400, `No se puede pasar una orden "${orden.estado}" a "${estado}"`);
    }
    // Fase 23: ninguna orden se envía sin aprobación independiente y vigente.
    if (estado === 'enviada') {
      const AprobacionCompra = require('../models/AprobacionCompra');
      const aprobacion = await AprobacionCompra.findOne({ orden: orden._id, estado: 'aprobada' });
      if (!aprobacion || aprobacion.monto !== orden.total || !aprobacion.huellaOrden || aprobacion.huellaOrden !== require('node:crypto').createHash('sha256').update(JSON.stringify({proveedor:String(orden.proveedor),items:orden.items.map(i=>({producto:String(i.producto),cantidad:i.cantidad,costoUnitario:i.costoUnitario})),total:orden.total})).digest('hex')) {
        throw falla(409, 'La orden requiere aprobación vigente antes de enviarse');
      }
    }
    if (estado === 'enviada') orden.enviadaEn = new Date();
    orden.estado = estado;
    await orden.save();
    res.json(conSaldo(await poblar(OrdenCompra.findById(orden._id)).lean()));
  } catch (error) {
    responderError(res, error, 'Error al cambiar el estado');
  }
};

// POST /api/ordenes-compra/:id/recibir  { items:[{producto,cantidad}], actualizarCosto?, nota? }
// Suma las unidades al stock y registra los movimientos de entrada, todo en una transacción.
/**
 * Controlador recibir: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.recibir = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const { items, actualizarCosto = false, nota = '', bodega: bodegaId } = req.body;
    if (!idValido(bodegaId)) throw falla(422, 'Debe indicar una bodega de recepción válida');
    if (!Array.isArray(items) || items.length === 0) throw falla(400, 'Indica qué unidades recibiste');

    await conTransaccion(async (session) => {
      const orden = await OrdenCompra.findById(req.params.id).session(session || null);
      if (!orden) throw falla(404, 'Orden de compra no encontrada');
      const bodega = await Bodega.findById(bodegaId).session(session || null);
      if (!bodega?.activa || !bodega.sucursal) throw falla(422, 'Bodega inactiva o sin sucursal');
      // No se reciben compras históricas sin sede: requieren migración explícita.
      if (!orden.sucursal || String(orden.sucursal) !== String(bodega.sucursal))
        throw falla(409, 'La orden y la bodega deben pertenecer a la misma sucursal');
      if (req.alcanceSucursales !== null && !(req.alcanceSucursales || []).includes(String(bodega.sucursal)))
        throw falla(404, 'Registro no encontrado');
      if (!['enviada', 'parcial'].includes(orden.estado)) {
        throw falla(400, orden.estado === 'borrador'
          ? 'Marca la orden como enviada antes de registrar una recepción'
          : `No se pueden recibir unidades de una orden "${orden.estado}"`);
      }

      const recepcion = { fecha: new Date(), usuario: req.usuario.id, nota, bodega: bodegaId, items: [] };
      const vistos = new Set();
      for (const recibido of items) {
        if (!idValido(recibido.producto) || vistos.has(String(recibido.producto)))
          throw falla(400, 'Productos inválidos o repetidos en la recepción');
        vistos.add(String(recibido.producto));
        const cantidad = Number(recibido.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 0) throw falla(400, 'Las cantidades recibidas deben ser enteros');
        if (cantidad === 0) continue;

        const linea = orden.items.find((i) => String(i.producto) === String(recibido.producto));
        if (!linea) throw falla(400, 'Uno de los productos no pertenece a esta orden');
        const pendiente = linea.cantidad - linea.cantidadRecibida;
        if (cantidad > pendiente) throw falla(400, `Solo faltan ${pendiente} unidades por recibir de uno de los productos (intentaste recibir ${cantidad})`);

        const cambios = { $inc: { stock: cantidad } };
        if (actualizarCosto) cambios.$set = { costo: linea.costoUnitario };
        await Producto.findByIdAndUpdate(linea.producto, cambios, { session: session || undefined });
        await Existencia.updateOne(
          { producto: linea.producto, bodega: bodegaId },
          { $inc: { cantidad }, $setOnInsert: { producto: linea.producto, bodega: bodegaId } },
          { upsert: true, session: session || undefined }
        );
        await MovimientoInventario.create([{
          producto: linea.producto, tipo: 'entrada', cantidad, motivo: `compra ${orden.numero}`, registradoPor: req.usuario.id, bodega: bodegaId, sucursal: bodega.sucursal
        }], { session: session || undefined });

        linea.cantidadRecibida += cantidad;
        recepcion.items.push({ producto: linea.producto, cantidad });
      }
      if (recepcion.items.length === 0) throw falla(400, 'Indica al menos una unidad recibida');

      orden.recepciones.push(recepcion);
      // Al llegar la primera mercancía empieza a correr el plazo para pagarle al proveedor.
      if (!orden.fechaVencimientoPago) {
        const prov = await Proveedor.findById(orden.proveedor).select('diasCredito').lean();
        orden.fechaVencimientoPago = new Date(Date.now() + (prov?.diasCredito ?? 30) * 86400000);
      }
      orden.estado = orden.items.every((i) => i.cantidadRecibida >= i.cantidad) ? 'recibida' : 'parcial';
      await orden.save({ session: session || undefined });
    });

    res.json(conSaldo(await poblar(OrdenCompra.findById(req.params.id)).lean()));
  } catch (error) {
    responderError(res, error, 'Error al registrar la recepción');
  }
};

// PATCH /api/ordenes-compra/:id/facturacion  { facturaProveedor?, fechaVencimientoPago? }
/**
 * Controlador actualizarFacturacion: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.actualizarFacturacion = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const orden = await OrdenCompra.findById(req.params.id);
    if (!orden) throw falla(404, 'Orden de compra no encontrada');

    const { facturaProveedor, fechaVencimientoPago } = req.body;
    if (facturaProveedor !== undefined) orden.facturaProveedor = String(facturaProveedor).trim();
    if (fechaVencimientoPago !== undefined) {
      if (fechaVencimientoPago === null || fechaVencimientoPago === '') orden.fechaVencimientoPago = undefined;
      else {
        const fecha = new Date(fechaVencimientoPago);
        if (Number.isNaN(fecha.getTime())) throw falla(400, 'La fecha de vencimiento no es válida');
        orden.fechaVencimientoPago = fecha;
      }
    }
    await orden.save();
    res.json(conSaldo(await poblar(OrdenCompra.findById(orden._id)).lean()));
  } catch (error) {
    responderError(res, error, 'Error al actualizar la facturación de la orden');
  }
};
