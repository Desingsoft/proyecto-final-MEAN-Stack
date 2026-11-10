const alcanceSede = require('../middlewares/alcanceSucursal');
/**
 * Archivo: pagoController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const { huellaOperacion } = require('../utils/huellaOperacion');
const Pago = require('../models/Pago');
const Documento = require('../models/Documento');
const { esVentas } = require('../middlewares/autorizacionRegistro');
const { documentosPropios } = require('../middlewares/autorizacionFinanciera');
const OrdenCompra = require('../models/OrdenCompra');
const { conTransaccion } = require('../utils/transaccion');
const { siguiente, formatear } = require('../utils/consecutivos');
const { rangoDesdeQuery } = require('../utils/fechas');
const { estadoPagoDe, saldoDeFactura, saldoAFavorDe, saldoDeOrden } = require('../utils/cartera');
const { cargar: cargarConfig } = require('./configuracionController');

/**
 * Lee una clave de idempotencia suministrada por el cliente (UUID recomendado).
 * Es obligatoria en operaciones nuevas: evita reintentos ambiguos tras una caída de red.
 * La restricción única en MongoDB garantiza que dos solicitudes con la misma clave
 * no creen dos pagos, incluso cuando se ejecutan simultáneamente.
 */
const claveDePago = (req) => {
  const clave = req.get('Idempotency-Key');
  if (typeof clave !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(clave)) {
    throw { status: 400, mensaje: 'Se requiere Idempotency-Key (16 a 128 caracteres alfanuméricos, guion o guion bajo)' };
  }
  return clave;
};

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'];
const LIMITE_FILAS = 1000;
const idValido = (id) => mongoose.isValidObjectId(id);
const falla = (status, mensaje) => ({ status, mensaje });
const responderError = (res, error, mensaje) =>
  error.status ? res.status(error.status).json({ mensaje: error.mensaje }) : res.status(500).json({ mensaje });
const pesos = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;
const sesion = (s) => ({ session: s || undefined });

// --- Recalcular lo pagado desde los pagos vigentes (única fuente de verdad) ---
const sumaVigentes = async (filtro, session) => {
  const pagos = await Pago.find({ ...filtro, estado: 'vigente' }).session(session || null).select('monto').lean();
  return pagos.reduce((s, p) => s + p.monto, 0);
};

const recalcularFactura = async (documentoId, session) => {
  const doc = await Documento.findById(documentoId).session(session || null);
  if (!doc) return null;
  doc.pagado = await sumaVigentes({ documento: documentoId, tipo: 'cobro' }, session);
  doc.reembolsado = await sumaVigentes({ documento: documentoId, tipo: 'reembolso' }, session);
  // Las notas crédito vigentes de la factura reducen lo que se debe.
  const notas = await Documento.find({ facturaOrigen: documentoId, tipo: 'nota_credito', estado: 'emitida' }).session(session || null).select('total').lean();
  doc.acreditado = notas.reduce((s, n) => s + n.total, 0);
  doc.estadoPago = estadoPagoDe(doc.total, doc.pagado, doc.acreditado, doc.reembolsado);
  await doc.save(sesion(session));
  return doc;
};

const recalcularOrden = async (ordenId, session) => {
  const orden = await OrdenCompra.findById(ordenId).session(session || null);
  if (!orden) return null;
  orden.pagado = await sumaVigentes({ orden: ordenId }, session);
  await orden.save(sesion(session));
  return orden;
};

// Valida los datos comunes de un pago. Devuelve { monto, metodo, fecha, referencia, nota }.
const leerDatos = (cuerpo) => {
  const monto = Number(cuerpo.monto);
  if (!Number.isInteger(monto) || monto < 1) throw falla(400, 'El monto debe ser un número entero mayor a cero');
  const metodo = cuerpo.metodo || 'efectivo';
  if (!METODOS.includes(metodo)) throw falla(400, 'Método de pago inválido');
  let fecha = new Date();
  if (cuerpo.fecha) {
    fecha = new Date(cuerpo.fecha);
    if (Number.isNaN(fecha.getTime())) throw falla(400, 'La fecha del pago no es válida');
    if (fecha.getTime() > Date.now() + 86400000) throw falla(400, 'La fecha del pago no puede ser futura');
  }
  return { monto, metodo, fecha, fechaSolicitada: cuerpo.fecha ? fecha.toISOString() : null, referencia: String(cuerpo.referencia || '').trim(), nota: String(cuerpo.nota || '').trim() };
};

/** Responde reintentos confirmados sin registrar otro movimiento. */
const pagoAnterior = async (clave, huella) => {
  const anterior = await Pago.findOne({ claveIdempotencia: clave }).lean();
  if (!anterior) return null;
  if (!anterior.huellaSolicitud || anterior.huellaSolicitud !== huella) {
    throw falla(409, 'La clave de idempotencia ya pertenece a una solicitud diferente o anterior sin huella');
  }
  return anterior;
};
const respuestaDuplicada = async (req, res, huella) => {
  const anterior = await pagoAnterior(claveDePago(req), huella);
  if (!anterior) return false;
  res.status(200).json({ ...(await poblar(Pago.findById(anterior._id)).lean()), repetida: true });
  return true;
};
const poblar = (consulta) => consulta.populate('registradoPor', 'nombre');

// POST /api/pagos/cobro  { documentoId, monto, metodo?, fecha?, referencia?, nota? }   (abono de un cliente)
/**
 * Controlador registrarCobro: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.registrarCobro = async (req, res) => {
  try {
    const claveIdempotencia = claveDePago(req);
    const datos = leerDatos(req.body);
    if (!idValido(req.body.documentoId)) throw falla(400, 'Factura inválida');
    const huellaSolicitud = huellaOperacion('cobro', req.body.documentoId, datos);
    if (await respuestaDuplicada(req, res, huellaSolicitud)) return;

    const pago = await conTransaccion(async (session) => {
      // Escritura sobre la factura: las transacciones concurrentes compiten por el mismo documento.
      // MongoDB aborta/reintenta una de ellas y el saldo se vuelve a leer dentro de la transacción.
      const doc = await Documento.findByIdAndUpdate(req.body.documentoId, { $inc: { __v: 1 } }, { new: true, session });
      if (!doc) throw falla(404, 'Factura no encontrada');
      if (doc.tipo !== 'factura') throw falla(400, 'Solo las facturas tienen cartera: una remisión no se paga');
      if (doc.estado !== 'emitida') throw falla(400, 'No se pueden registrar pagos en una factura anulada');

      const saldo = saldoDeFactura(doc);
      if (saldo <= 0) throw falla(400, 'Esta factura ya está pagada por completo');
      if (datos.monto > saldo) throw falla(400, `El abono (${pesos(datos.monto)}) supera el saldo pendiente (${pesos(saldo)})`);

      const config = await cargarConfig();
      const consecutivo = await siguiente('recibo', session);
      const [nuevo] = await Pago.create([{
        tipo: 'cobro', numero: formatear(config.prefijoRecibo || 'RC', consecutivo),
        documento: doc._id, clienteRef: doc.clienteRef, contraparte: doc.cliente.nombre, referenciaDocumento: doc.numero,
        ...{ monto: datos.monto, metodo: datos.metodo, fecha: datos.fecha, referencia: datos.referencia, nota: datos.nota }, claveIdempotencia, huellaSolicitud, registradoPor: req.usuario.id
      }], sesion(session));
      await recalcularFactura(doc._id, session);
      return nuevo;
    });
    res.status(201).json(await poblar(Pago.findById(pago._id)).lean());
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: 'Clave ya registrada o solicitud concurrente; consulta el historial y reintenta con la misma clave y datos' });
    responderError(res, error, 'Error al registrar el pago');
  }
};

// POST /api/pagos/reembolso  { documentoId, monto, metodo?, fecha?, referencia?, nota? }
// Devuelve dinero a un cliente que pagó de más porque una nota crédito bajó el valor de su factura.
/**
 * Controlador registrarReembolso: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.registrarReembolso = async (req, res) => {
  try {
    const claveIdempotencia = claveDePago(req);
    const datos = leerDatos(req.body);
    if (!idValido(req.body.documentoId)) throw falla(400, 'Factura inválida');
    const huellaSolicitud = huellaOperacion('reembolso', req.body.documentoId, datos);
    if (await respuestaDuplicada(req, res, huellaSolicitud)) return;

    const pago = await conTransaccion(async (session) => {
      // Escritura sobre la factura: las transacciones concurrentes compiten por el mismo documento.
      // MongoDB aborta/reintenta una de ellas y el saldo se vuelve a leer dentro de la transacción.
      const doc = await Documento.findByIdAndUpdate(req.body.documentoId, { $inc: { __v: 1 } }, { new: true, session });
      if (!doc) throw falla(404, 'Factura no encontrada');
      if (doc.tipo !== 'factura' || doc.estado !== 'emitida') throw falla(400, 'Solo se reembolsa dinero de facturas vigentes');

      const aFavor = saldoAFavorDe(doc);
      if (aFavor <= 0) throw falla(400, 'Esta factura no tiene saldo a favor del cliente');
      if (datos.monto > aFavor) throw falla(400, `El reembolso (${pesos(datos.monto)}) supera el saldo a favor del cliente (${pesos(aFavor)})`);

      const config = await cargarConfig();
      const consecutivo = await siguiente('reembolso', session);
      const [nuevo] = await Pago.create([{
        tipo: 'reembolso', numero: formatear(config.prefijoReembolso || 'RE', consecutivo),
        documento: doc._id, clienteRef: doc.clienteRef, contraparte: doc.cliente.nombre, referenciaDocumento: doc.numero,
        ...{ monto: datos.monto, metodo: datos.metodo, fecha: datos.fecha, referencia: datos.referencia, nota: datos.nota }, claveIdempotencia, huellaSolicitud, registradoPor: req.usuario.id
      }], sesion(session));
      await recalcularFactura(doc._id, session);
      return nuevo;
    });
    res.status(201).json(await poblar(Pago.findById(pago._id)).lean());
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: 'Clave ya registrada o solicitud concurrente; consulta el historial y reintenta con la misma clave y datos' });
    responderError(res, error, 'Error al registrar el reembolso');
  }
};

// POST /api/pagos/egreso  { ordenId, monto, ... }   (pago a un proveedor; solo admin)
/**
 * Controlador registrarEgreso: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.registrarEgreso = async (req, res) => {
  try {
    const claveIdempotencia = claveDePago(req);
    const datos = leerDatos(req.body);
    if (!idValido(req.body.ordenId)) throw falla(400, 'Orden de compra inválida');
    const huellaSolicitud = huellaOperacion('egreso', req.body.ordenId, datos);
    if (await respuestaDuplicada(req, res, huellaSolicitud)) return;

    const pago = await conTransaccion(async (session) => {
      // Serializa los egresos de una misma orden mediante conflicto de escritura transaccional.
      const orden = await OrdenCompra.findByIdAndUpdate(req.body.ordenId, { $inc: { __v: 1 } }, { new: true, session }).populate('proveedor', 'nombre');
      if (!orden) throw falla(404, 'Orden de compra no encontrada');
      if (!['enviada', 'parcial', 'recibida'].includes(orden.estado)) throw falla(400, 'Solo se pagan órdenes enviadas o recibidas');

      const saldo = saldoDeOrden(orden);
      if (saldo <= 0) throw falla(400, 'No hay saldo por pagar: se paga el valor de la mercancía ya recibida');
      if (datos.monto > saldo) throw falla(400, `El pago (${pesos(datos.monto)}) supera lo que se debe por lo recibido (${pesos(saldo)})`);

      const config = await cargarConfig();
      const consecutivo = await siguiente('egreso', session);
      const [nuevo] = await Pago.create([{
        tipo: 'egreso', numero: formatear(config.prefijoEgreso || 'CE', consecutivo),
        orden: orden._id, proveedor: orden.proveedor._id, contraparte: orden.proveedor.nombre, referenciaDocumento: orden.numero,
        ...{ monto: datos.monto, metodo: datos.metodo, fecha: datos.fecha, referencia: datos.referencia, nota: datos.nota }, claveIdempotencia, huellaSolicitud, registradoPor: req.usuario.id
      }], sesion(session));
      await recalcularOrden(orden._id, session);
      return nuevo;
    });
    res.status(201).json(await poblar(Pago.findById(pago._id)).lean());
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: 'Clave ya registrada o solicitud concurrente; consulta el historial y reintenta con la misma clave y datos' });
    responderError(res, error, 'Error al registrar el pago al proveedor');
  }
};

// PATCH /api/pagos/:id/anular  { motivo }   (solo admin)
/**
 * Controlador anular: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.anular = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const motivo = String(req.body.motivo || '').trim();
    if (motivo.length < 5) throw falla(400, 'Escribe el motivo de la anulación (mínimo 5 caracteres)');

    await conTransaccion(async (session) => {
      const pago = await Pago.findById(req.params.id).session(session || null);
      if (!pago) throw falla(404, 'Pago no encontrado');
      if (pago.estado === 'anulado') throw falla(400, 'Este pago ya está anulado');
      pago.estado = 'anulado';
      pago.anuladoEn = new Date();
      pago.motivoAnulacion = motivo;
      await pago.save(sesion(session));
      if (pago.documento) await recalcularFactura(pago.documento, session);
      if (pago.orden) await recalcularOrden(pago.orden, session);
    });
    res.json(await poblar(Pago.findById(req.params.id)).lean());
  } catch (error) {
    responderError(res, error, 'Error al anular el pago');
  }
};

// GET /api/pagos?tipo=cobro|egreso&metodo=&estado=&desde=&hasta=&buscar=
/**
 * Controlador listar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listar = async (req, res) => {
  try {
    const tipo = req.query.tipo === 'egreso' ? 'egreso' : 'cobro';
    if (tipo === 'egreso' && req.usuario.role !== 'admin') throw falla(403, 'No autorizado para esta acción');

    const rango = rangoDesdeQuery(req.query);
    // La vista de "cobros" incluye los reembolsos a clientes: el recaudo real es lo cobrado menos lo devuelto.
    const filtro = { tipo: tipo === 'cobro' ? { $in: ['cobro', 'reembolso'] } : tipo, fecha: { $gte: rango.desde, $lt: rango.hasta } };
    if (METODOS.includes(req.query.metodo)) filtro.metodo = req.query.metodo;
    if (['vigente', 'anulado'].includes(req.query.estado)) filtro.estado = req.query.estado;
    if (req.query.buscar) {
      const patron = { $regex: req.query.buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filtro.$or = [{ numero: patron }, { contraparte: patron }, { referenciaDocumento: patron }, { referencia: patron }];
    }

    if (esVentas(req)) filtro.documento = { $in: await documentosPropios(req) };
    if (req.alcanceSucursales !== null) {
      const pedidosSede = await require('../models/Pedido').find(alcanceSede.filtro(req)).distinct('_id');
      const documentosSede = await Documento.find({ pedido: { $in: pedidosSede } }).distinct('_id');
      filtro.documento = { $in: filtro.documento?.$in
        ? documentosSede.filter(id => filtro.documento.$in.some(propio => String(propio) === String(id)))
        : documentosSede };
    }
    const pagos = await poblar(Pago.find(filtro).sort({ fecha: -1, createdAt: -1 })).lean();
    const vigentes = pagos.filter((p) => p.estado === 'vigente');
    const signo = (p) => (p.tipo === 'reembolso' ? -1 : 1);
    const porMetodo = METODOS.map((metodo) => {
      const lista = vigentes.filter((p) => p.metodo === metodo);
      return { metodo, monto: lista.reduce((s, p) => s + signo(p) * p.monto, 0), cantidad: lista.length };
    }).filter((m) => m.cantidad > 0);
    const reembolsos = vigentes.filter((p) => p.tipo === 'reembolso');

    res.json({
      rango: { desde: rango.claveDesde, hasta: rango.claveHasta, dias: rango.dias.length },
      resumen: {
        total: vigentes.reduce((s, p) => s + signo(p) * p.monto, 0), cantidad: vigentes.length, anulados: pagos.length - vigentes.length, porMetodo,
        reembolsos: reembolsos.reduce((s, p) => s + p.monto, 0), cantidadReembolsos: reembolsos.length
      },
      pagos: pagos.slice(0, LIMITE_FILAS).map((p) => ({
        _id: p._id, numero: p.numero, tipo: p.tipo, fecha: p.fecha, contraparte: p.contraparte, referenciaDocumento: p.referenciaDocumento,
        documento: p.documento, orden: p.orden, monto: p.monto, metodo: p.metodo, referencia: p.referencia, nota: p.nota,
        estado: p.estado, motivoAnulacion: p.motivoAnulacion, registradoPor: p.registradoPor?.nombre ?? null
      })),
      truncado: pagos.length > LIMITE_FILAS
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener los pagos');
  }
};

// GET /api/pagos/documento/:id  y  /api/pagos/orden/:id
const pagosDe = (campo) => async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    if (campo === 'orden' && req.usuario.role !== 'admin') throw falla(403, 'No autorizado para esta acción');
    res.json(await poblar(Pago.find({ [campo]: req.params.id }).sort({ fecha: -1, createdAt: -1 })).lean());
  } catch (error) {
    responderError(res, error, 'Error al obtener los pagos');
  }
};
exports.porDocumento = pagosDe('documento');
exports.porOrden = pagosDe('orden');

// GET /api/pagos/:id - detalle para imprimir el recibo (incluye el saldo actual de la factura u orden)
/**
 * Controlador obtener: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtener = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const pago = await poblar(Pago.findById(req.params.id)).lean();
    if (!pago) throw falla(404, 'Pago no encontrado');
    if (pago.tipo === 'egreso' && req.usuario.role !== 'admin') throw falla(403, 'No autorizado para esta acción');
    if (req.alcanceSucursales !== null) {
      // No confiar en el campo sucursal del pago: resolver el pedido de origen.
      const doc = pago.documento && await Documento.findById(pago.documento).select('pedido').lean();
      const pedido = doc?.pedido && await require('../models/Pedido').findById(doc.pedido).select('sucursal').lean();
      if (!pedido?.sucursal || !req.alcanceSucursales.includes(String(pedido.sucursal))) throw falla(404, 'Pago no encontrado');
    }

    let cuenta = null;
    if (pago.documento) {
      const doc = await Documento.findById(pago.documento).select('numero total pagado formaPago').lean();
      if (doc) cuenta = { numero: doc.numero, total: doc.total, pagado: doc.pagado ?? 0, saldo: saldoDeFactura(doc) };
    } else if (pago.orden) {
      const orden = await OrdenCompra.findById(pago.orden).select('numero items pagado').lean();
      if (orden) cuenta = { numero: orden.numero, total: orden.items.reduce((s, i) => s + (i.cantidadRecibida || 0) * i.costoUnitario, 0), pagado: orden.pagado || 0, saldo: saldoDeOrden(orden) };
    }
    res.json({ ...pago, cuenta });
  } catch (error) {
    responderError(res, error, 'Error al obtener el pago');
  }
};

exports.recalcularFactura = recalcularFactura;
exports.recalcularOrden = recalcularOrden;
exports.METODOS = METODOS;
