/**
 * Archivo: inventarioController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const MovimientoInventario = require('../models/MovimientoInventario');
const Producto = require('../models/Producto');
const Bodega = require('../models/Bodega');
const Existencia = require('../models/Existencia');
const TransferenciaInventario = require('../models/TransferenciaInventario');
const crypto = require('crypto');

// GET /api/inventario/movimientos?producto=<id>&tipo=<entrada|salida>
/**
 * Controlador obtenerMovimientos: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerMovimientos = async (req, res) => {
  try {
    const { producto, tipo, pagina = 1, limite = 20 } = req.query;
    const pag = Number(pagina), lim = Number(limite);
    if (!Number.isSafeInteger(pag) || pag < 1 || !Number.isSafeInteger(lim) || lim < 1 || lim > 100)
      return res.status(400).json({ mensaje: 'Paginación inválida (límite máximo: 100)' });
    if (producto && !mongoose.isValidObjectId(producto)) return res.status(400).json({ mensaje: 'Producto inválido' });
    if (tipo && !['entrada', 'salida'].includes(tipo)) return res.status(400).json({ mensaje: 'Tipo inválido' });
    const filtro = {};
    if (producto) filtro.producto = producto;
    if (tipo) filtro.tipo = tipo;
    // El filtro explícito solo se acepta si pertenece al alcance autorizado.
    // `cargar` valida la asignación contra la base, pero también se aplica aquí
    // para evitar que una futura ruta sin middleware filtre información ajena.
    if (req.query.sucursal) {
      if (!mongoose.isValidObjectId(req.query.sucursal))
        return res.status(400).json({ mensaje: 'Sucursal inválida' });
      if (req.alcanceSucursales !== null && !(req.alcanceSucursales || []).includes(String(req.query.sucursal)))
        return res.status(404).json({ mensaje: 'Registro no encontrado' });
      filtro.sucursal = req.query.sucursal;
    } else if (req.alcanceSucursales !== null) {
      filtro.sucursal = { $in: req.alcanceSucursales || [] };
    }

    const movimientos = await MovimientoInventario.find(filtro)
      .populate('producto', 'nombre sku')
      .populate('registradoPor', 'nombre')
      .sort({ createdAt: -1 })
      .skip((pag - 1) * lim)
      .limit(lim);

    const total = await MovimientoInventario.countDocuments(filtro);

    res.json({ movimientos, total, paginas: Math.ceil(total / lim) });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener movimientos' });
  }
};

// POST /api/inventario/movimiento - registro manual (ajuste, compra, etc.)
/**
 * Controlador registrar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.registrar = async (req, res) => {
  // La clave es obligatoria: un reintento de red nunca debe duplicar una entrada/salida.
  const clave = req.get?.('Idempotency-Key');
  if (typeof clave !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(clave))
    return res.status(400).json({ mensaje: 'Idempotency-Key obligatoria (16-128 caracteres)' });
  const { producto: productoId, tipo, cantidad, motivo, bodega: bodegaId } = req.body;
  if (![productoId, bodegaId].every(mongoose.isValidObjectId))
    return res.status(422).json({ mensaje: 'Producto y bodega válidos son obligatorios' });
  if (!['entrada', 'salida'].includes(tipo) || !Number.isSafeInteger(cantidad) || cantidad <= 0)
    return res.status(422).json({ mensaje: 'Tipo o cantidad inválidos' });
  if (motivo !== undefined && (typeof motivo !== 'string' || motivo.length > 300))
    return res.status(422).json({ mensaje: 'Motivo inválido' });
  const motivoFinal = (motivo || 'ajuste').trim() || 'ajuste';
  const huella = crypto.createHash('sha256').update(JSON.stringify({
    producto: String(productoId).toLowerCase(), bodega: String(bodegaId).toLowerCase(),
    tipo, cantidad, motivo: motivoFinal
  })).digest('hex');

  try {
    const { conTransaccion } = require('../utils/transaccion');
    const resultado = await conTransaccion(async session => {
      // Validar autorización también en reintentos, para evitar filtrar registros.
      const bodega = await Bodega.findById(bodegaId).session(session || null);
      if (!bodega?.activa || !bodega.sucursal)
        throw { status: 422, mensaje: 'Bodega sin sucursal activa' };
      if (req.alcanceSucursales !== null && !(req.alcanceSucursales || []).includes(String(bodega.sucursal)))
        throw { status: 404, mensaje: 'Registro no encontrado' };
      const previo = await MovimientoInventario.findOne({ claveIdempotencia: clave }).session(session || null);
      if (previo) {
        if (previo.huellaSolicitud !== huella)
          throw { status: 409, mensaje: 'Clave usada para un movimiento diferente' };
        return { movimiento: previo, repetida: true };
      }
      const producto = await Producto.findById(productoId).session(session || null);
      if (!producto?.activo) throw { status: 404, mensaje: 'Producto no encontrado o inactivo' };
      if (tipo === 'salida') {
        const local = await Existencia.updateOne(
          { producto: productoId, bodega: bodegaId, cantidad: { $gte: cantidad } },
          { $inc: { cantidad: -cantidad } }, { session: session || undefined }
        );
        if (local.modifiedCount !== 1) throw { status: 409, mensaje: 'Existencia insuficiente en bodega' };
        const global = await Producto.updateOne(
          { _id: productoId, stock: { $gte: cantidad } },
          { $inc: { stock: -cantidad } }, { session: session || undefined }
        );
        if (global.modifiedCount !== 1) throw { status: 409, mensaje: 'Stock global insuficiente' };
      } else {
        const local = await Existencia.updateOne(
          { producto: productoId, bodega: bodegaId },
          { $inc: { cantidad }, $setOnInsert: { producto: productoId, bodega: bodegaId } },
          { upsert: true, session: session || undefined }
        );
        if (local.modifiedCount !== 1 && local.upsertedCount !== 1)
          throw { status: 409, mensaje: 'No fue posible actualizar existencias de bodega' };
        const global = await Producto.updateOne(
          { _id: productoId }, { $inc: { stock: cantidad } }, { session: session || undefined }
        );
        if (global.modifiedCount !== 1) throw { status: 409, mensaje: 'No fue posible actualizar stock global' };
      }
      const [movimiento] = await MovimientoInventario.create([{
        producto: productoId, tipo, cantidad, motivo: motivoFinal,
        registradoPor: req.usuario.id, bodega: bodegaId, sucursal: bodega.sucursal,
        claveIdempotencia: clave, huellaSolicitud: huella
      }], { session: session || undefined });
      return { movimiento, repetida: false };
    });
    return res.status(resultado.repetida ? 200 : 201).json({
      ...(resultado.movimiento.toObject?.() || resultado.movimiento),
      repetida: resultado.repetida
    });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ mensaje: 'Movimiento concurrente con la misma clave; consulta antes de reintentar' });
    return res.status(error.status || 500).json({ mensaje: error.mensaje || 'Error al registrar movimiento' });
  }
};


// POST /api/inventario/transferencias: operación atómica e idempotente.
// Requiere replica set; una misma clave no puede registrar dos movimientos.
exports.transferir = async (req, res) => {
  try {
    const { producto, origen, destino, cantidad } = req.body;
    if (req.body.motivo !== undefined && (typeof req.body.motivo !== 'string' || req.body.motivo.length > 300))
      return res.status(422).json({ mensaje: 'Motivo inválido' });
    const motivo = (req.body.motivo || 'transferencia').trim() || 'transferencia';
    const clave = req.get('Idempotency-Key');
    if (typeof clave !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(clave))
      return res.status(400).json({ mensaje: 'Idempotency-Key obligatorio (16-128 caracteres)' });
    if (![producto, origen, destino].every(mongoose.isValidObjectId) || String(origen) === String(destino))
      return res.status(422).json({ mensaje: 'Producto, origen y destino distintos son obligatorios' });
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0 || motivo.length > 300)
      return res.status(422).json({ mensaje: 'Cantidad o motivo inválidos' });
    // Normalizar ObjectIds evita que una misma operación cambie de huella por mayúsculas.
    const huella = crypto.createHash('sha256').update(JSON.stringify({
      producto: String(producto).toLowerCase(), origen: String(origen).toLowerCase(),
      destino: String(destino).toLowerCase(), cantidad, motivo
    })).digest('hex');
    const autorizadas = req.alcanceSucursales;
    // Incluso en un reintento se revalida el permiso actual, antes de revelar el registro.
    const validarBodegas = async session => {
      const [bodegaOrigen, bodegaDestino, productoDb] = await Promise.all([
        Bodega.findById(origen).session(session || null), Bodega.findById(destino).session(session || null),
        Producto.findById(producto).session(session || null)
      ]);
      if (!productoDb?.activo || !bodegaOrigen?.activa || !bodegaDestino?.activa || !bodegaOrigen.sucursal || !bodegaDestino.sucursal)
        throw { status: 422, mensaje: 'Producto y bodegas activas con sucursal son obligatorios' };
      if (autorizadas !== null && ![bodegaOrigen.sucursal, bodegaDestino.sucursal].every(id => (autorizadas || []).includes(String(id))))
        throw { status: 404, mensaje: 'Registro no encontrado' };
      return { bodegaOrigen, bodegaDestino };
    };
    const previo = await TransferenciaInventario.findOne({ claveIdempotencia: clave }).lean();
    if (previo) {
      await validarBodegas(null);
      if (previo.huellaSolicitud !== huella) return res.status(409).json({ mensaje: 'Clave utilizada para una transferencia diferente' });
      return res.json({ transferenciaId: previo._id, producto, origen, destino, cantidad, repetida: true });
    }
    const { conTransaccion } = require('../utils/transaccion');
    const resultado = await conTransaccion(async session => {
      const { bodegaOrigen, bodegaDestino } = await validarBodegas(session);
      const [transferencia] = await TransferenciaInventario.create([{
        claveIdempotencia: clave, huellaSolicitud: huella, producto, origen, destino, cantidad, motivo, registradoPor: req.usuario.id
      }], { session: session || undefined });
      const decremento = await Existencia.updateOne({ producto, bodega: origen, cantidad: { $gte: cantidad } },
        { $inc: { cantidad: -cantidad } }, { session: session || undefined });
      if (decremento.modifiedCount !== 1) throw { status: 409, mensaje: 'Existencia insuficiente en origen' };
      const incremento = await Existencia.updateOne({ producto, bodega: destino },
        { $inc: { cantidad }, $setOnInsert: { producto, bodega: destino } },
        { upsert: true, session: session || undefined });
      if (incremento.modifiedCount !== 1 && incremento.upsertedCount !== 1)
        throw { status: 409, mensaje: 'No fue posible incrementar las existencias de destino' };
      await MovimientoInventario.create([
        { producto, tipo: 'salida', cantidad, motivo, bodega: origen, sucursal: bodegaOrigen.sucursal, transferenciaId: transferencia._id, registradoPor: req.usuario.id },
        { producto, tipo: 'entrada', cantidad, motivo, bodega: destino, sucursal: bodegaDestino.sucursal, transferenciaId: transferencia._id, registradoPor: req.usuario.id }
      ], { session: session || undefined });
      return { transferenciaId: transferencia._id, producto, origen, destino, cantidad };
    });
    res.status(201).json(resultado);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: 'Transferencia concurrente con la misma clave; consulta el resultado antes de reintentar' });
    res.status(error.status || 500).json({ mensaje: error.mensaje || 'No fue posible realizar la transferencia' });
  }
};


/** Historial de transferencias: no expone registros de bodegas ajenas a la sesión. */
exports.listarTransferencias = async (req, res) => {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const limite = Number(req.query.limite ?? 20);
    if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000 || !Number.isSafeInteger(limite) || limite < 1 || limite > 100)
      return res.status(400).json({ mensaje: 'Paginación inválida' });
    const alcance = req.alcanceSucursales;
    // Consultar primero bodegas de alcance; no se filtra por campos proporcionados por el cliente.
    const filtroBodegas = alcance === null ? { activa: true, sucursal: { $ne: null } } :
      { activa: true, sucursal: { $in: alcance || [] } };
    const bodegas = await Bodega.find(filtroBodegas).select('_id').lean();
    const ids = bodegas.map(b => b._id);
    const filtro = { origen: { $in: ids }, destino: { $in: ids } };
    const [transferencias, total] = await Promise.all([
      TransferenciaInventario.find(filtro).sort({ createdAt: -1, _id: -1 })
        .skip((pagina - 1) * limite).limit(limite)
        .select('producto origen destino cantidad motivo registradoPor createdAt').lean(),
      TransferenciaInventario.countDocuments(filtro)
    ]);
    return res.json({ transferencias, total, pagina, limite, paginas: Math.ceil(total / limite) });
  } catch (error) { return res.status(500).json({ mensaje: 'Error al consultar transferencias' }); }
};

/** Consulta por identificador; origen Y destino deben permanecer dentro del alcance actual. */
exports.obtenerTransferencia = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ mensaje: 'Identificador inválido' });
    const transferencia = await TransferenciaInventario.findById(req.params.id)
      .select('producto origen destino cantidad motivo registradoPor createdAt').lean();
    if (!transferencia) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    const bodegas = await Bodega.find({ _id: { $in: [transferencia.origen, transferencia.destino] }, activa: true, sucursal: { $ne: null } })
      .select('_id sucursal').lean();
    if (bodegas.length !== 2 || (req.alcanceSucursales !== null &&
      !bodegas.every(b => (req.alcanceSucursales || []).includes(String(b.sucursal)))))
      return res.status(404).json({ mensaje: 'Registro no encontrado' });
    return res.json(transferencia);
  } catch (error) { return res.status(500).json({ mensaje: 'Error al consultar transferencia' }); }
};
