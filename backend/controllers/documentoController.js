const alcanceSede = require('../middlewares/alcanceSucursal');
const { filtroPedidos, pedidoAutorizado, esVentas } = require('../middlewares/autorizacionRegistro');
/**
 * Archivo: documentoController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const Documento = require('../models/Documento');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
const { construirDocumento } = require('../utils/documentos');
const { siguiente, formatear } = require('../utils/consecutivos');
const Pago = require('../models/Pago');
const { conTransaccion } = require('../utils/transaccion');
const { pagadoDeFactura, estadoPagoDe, saldoDeFactura, saldoAFavorDe } = require('../utils/cartera');
const { cargar: cargarConfig } = require('./configuracionController');
const { saldoDeCliente } = require('./carteraController');

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'];
const pesos = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;
const sesion = (s) => ({ session: s || undefined });

// Agrega lo abonado, el saldo y el estado de pago a una factura (también a las emitidas antes de existir la cartera).
const conCartera = (doc) => {
  if (!doc || doc.tipo !== 'factura') return doc;
  const pagado = pagadoDeFactura(doc);
  const acreditado = doc.acreditado || 0;
  const reembolsado = doc.reembolsado || 0;
  return {
    ...doc, pagado, acreditado, reembolsado, saldo: saldoDeFactura(doc), saldoAFavor: saldoAFavorDe(doc),
    estadoPago: estadoPagoDe(doc.total, pagado, acreditado, reembolsado)
  };
};

const idValido = (id) => mongoose.isValidObjectId(id);
const falla = (status, mensaje) => ({ status, mensaje });
const responderError = (res, error, mensaje) =>
  error.status ? res.status(error.status).json({ mensaje: error.mensaje }) : res.status(500).json({ mensaje });

// GET /api/documentos?tipo=&estado=&buscar=&pagina=&limite=
/**
 * Controlador listar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listar = async (req, res) => {
  try {
    const { tipo, estado, buscar, pagina = 1, limite = 20 } = req.query;
    const filtro = {};
    if (req.alcanceSucursales !== null) {
      const idsSede = await Pedido.find(alcanceSede.filtro(req)).distinct('_id');
      filtro.pedido = { $in: idsSede };
    }
    if (esVentas(req)) {
      const propios = await Pedido.find(filtroPedidos(req)).distinct('_id');
      filtro.pedido = { $in: req.alcanceSucursales === null ? propios : propios.filter(id => filtro.pedido.$in.some(s => String(s) === String(id))) };
    }
    if (['factura', 'remision', 'nota_credito'].includes(tipo)) filtro.tipo = tipo;
    if (['emitida', 'anulada'].includes(estado)) filtro.estado = estado;
    if (buscar) {
      const patron = { $regex: buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filtro.$or = [{ numero: patron }, { 'cliente.nombre': patron }, { 'cliente.documento': patron }];
    }

    const [documentos, total] = await Promise.all([
      Documento.find(filtro).sort({ createdAt: -1 }).skip((pagina - 1) * limite).limit(Number(limite))
        .select('tipo numero cliente.nombre total estado formaPago fechaVencimiento createdAt pedido pagado estadoPago acreditado reembolsado numeroOrigen facturaOrigen').lean(),
      Documento.countDocuments(filtro)
    ]);
    res.json({ documentos: documentos.map(conCartera), total, paginas: Math.ceil(total / limite) });
  } catch (error) {
    responderError(res, error, 'Error al obtener los documentos');
  }
};

// GET /api/documentos/pedido/:pedidoId
/**
 * Controlador porPedido: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.porPedido = async (req, res) => {
  try {
    if (!idValido(req.params.pedidoId)) throw falla(400, 'Identificador inválido');
    const documentos = await Documento.find({ pedido: req.params.pedidoId }).sort({ createdAt: -1 })
      .select('tipo numero total estado createdAt formaPago pagado estadoPago acreditado reembolsado numeroOrigen facturaOrigen ivaPorcentaje preciosIncluyenIva').lean();
    res.json(documentos.map(conCartera));
  } catch (error) {
    responderError(res, error, 'Error al obtener los documentos del pedido');
  }
};

// GET /api/documentos/:id
/**
 * Controlador obtener: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtener = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const documento = await Documento.findById(req.params.id).populate('emitidoPor', 'nombre').lean();
    if (!documento) throw falla(404, 'Documento no encontrado');
    res.json(conCartera(documento));
  } catch (error) {
    responderError(res, error, 'Error al obtener el documento');
  }
};

// POST /api/documentos  { pedidoId, tipo, formaPago?, diasCredito?, notas?, ivaPorcentaje?, metodoPago?, referenciaPago?, forzarCupo? }
// Una factura de contado queda pagada al emitirse (se registra su recibo). Una a crédito queda pendiente de cobro.
/**
 * Controlador crear: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.crear = async (req, res) => {
  try {
    const { pedidoId, tipo, formaPago = 'contado', diasCredito, notas = '', ivaPorcentaje, metodoPago = 'efectivo', referenciaPago = '', forzarCupo = false } = req.body;
    if (esVentas(req) && !await pedidoAutorizado(req, pedidoId)) throw falla(404, 'Pedido no encontrado');
    if (!['factura', 'remision'].includes(tipo)) throw falla(400, 'El tipo debe ser factura o remisión');
    if (!['contado', 'credito'].includes(formaPago)) throw falla(400, 'Forma de pago inválida');
    if (!METODOS.includes(metodoPago)) throw falla(400, 'Método de pago inválido');
    if (ivaPorcentaje !== undefined && !(Number(ivaPorcentaje) >= 0 && Number(ivaPorcentaje) <= 100)) throw falla(400, 'El IVA debe estar entre 0 y 100');
    if (diasCredito !== undefined && !(Number(diasCredito) >= 0)) throw falla(400, 'Los días de crédito no son válidos');
    if (!idValido(pedidoId)) throw falla(400, 'Pedido inválido');

    const pedido = await Pedido.findById(pedidoId).populate('items.producto', 'nombre sku').lean();
    if (!pedido) throw falla(404, 'Pedido no encontrado');
    if (pedido.estado === 'cancelado') throw falla(400, 'No se puede emitir un documento de un pedido cancelado');

    const vigente = await Documento.findOne({ pedido: pedido._id, tipo, estado: 'emitida' }).lean();
    if (vigente) {
      throw falla(400, `Este pedido ya tiene ${tipo === 'factura' ? 'una factura' : 'una remisión'} vigente (${vigente.numero}). Anúlala si necesitas emitir otra.`);
    }

    const config = await cargarConfig();
    const cliente = pedido.clienteRef ? await Cliente.findById(pedido.clienteRef).lean() : null;
    // Plazo: el indicado al emitir, o el del cliente, o el de la configuración.
    const dias = diasCredito !== undefined ? Number(diasCredito) : (cliente?.diasCredito ?? undefined);

    const datos = construirDocumento({
      tipo, pedido, cliente, config, formaPago, diasCredito: dias, notas,
      ivaPorcentaje: ivaPorcentaje !== undefined ? Number(ivaPorcentaje) : undefined
    });

    // Cupo de crédito del cliente: lo que ya debe más esta factura no puede pasarse, salvo autorización de un administrador.
    if (tipo === 'factura' && formaPago === 'credito' && cliente && cliente.cupoCredito > 0) {
      const saldoActual = await saldoDeCliente(cliente._id);
      if (saldoActual + datos.total > cliente.cupoCredito && !(forzarCupo && req.usuario.role === 'admin')) {
        throw falla(400, `Supera el cupo de crédito de ${cliente.nombre}: cupo ${pesos(cliente.cupoCredito)}, ya debe ${pesos(saldoActual)} y esta factura es de ${pesos(datos.total)}. Un administrador puede autorizarlo.`);
      }
    }

    const documento = await conTransaccion(async (session) => {
      const consecutivo = await siguiente(tipo, session);
      const prefijo = tipo === 'factura' ? config.prefijoFactura : config.prefijoRemision;
      const contado = tipo === 'factura' && formaPago === 'contado';
      const [doc] = await Documento.create([{
        ...datos, numero: formatear(prefijo || (tipo === 'factura' ? 'FV' : 'RM'), consecutivo), consecutivo, emitidoPor: req.usuario.id,
        ...(tipo === 'factura' ? { pagado: contado ? datos.total : 0, estadoPago: contado ? 'pagada' : 'pendiente' } : {})
      }], sesion(session));

      if (contado && datos.total >= 1) {
        const recibo = await siguiente('recibo', session);
        await Pago.create([{
          tipo: 'cobro', numero: formatear(config.prefijoRecibo || 'RC', recibo), documento: doc._id, clienteRef: doc.clienteRef,
          contraparte: doc.cliente.nombre, referenciaDocumento: doc.numero, monto: datos.total, metodo: metodoPago,
          referencia: String(referenciaPago).trim(), nota: 'Pago de contado', registradoPor: req.usuario.id
        }], sesion(session));
      }
      return doc;
    });
    res.status(201).json(conCartera(documento.toObject()));
  } catch (error) {
    responderError(res, error, 'Error al emitir el documento');
  }
};

// PATCH /api/documentos/:id/anular  { motivo }   (solo admin)
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

    const resultado = await conTransaccion(async (session) => {
      const documento = await Documento.findById(req.params.id).session(session || null);
      if (!documento) throw falla(404, 'Documento no encontrado');
      if (documento.estado === 'anulada') throw falla(400, 'El documento ya está anulado');
      if (documento.tipo === 'nota_credito') throw falla(400, 'Para anular una nota crédito, anula la devolución que la originó');
      if (documento.tipo === 'factura') {
        const notas = await Documento.countDocuments({ facturaOrigen: documento._id, tipo: 'nota_credito', estado: 'emitida' });
        if (notas > 0) throw falla(400, 'Esta factura tiene notas crédito vigentes. Anula primero las devoluciones que las originaron.');
      }

      documento.estado = 'anulada';
      documento.anuladaEn = new Date();
      documento.motivoAnulacion = motivo;
      let pagosAnulados = 0;
      if (documento.tipo === 'factura') {
        // El dinero cobrado de una factura anulada deja de contar: sus recibos se anulan con ella.
        const r = await Pago.updateMany(
          { documento: documento._id, estado: 'vigente' },
          { $set: { estado: 'anulado', anuladoEn: new Date(), motivoAnulacion: `Factura ${documento.numero} anulada: ${motivo}` } },
          sesion(session)
        );
        pagosAnulados = r.modifiedCount ?? 0;
        documento.pagado = 0;
        documento.estadoPago = 'pendiente';
      }
      await documento.save(sesion(session));
      return { documento, pagosAnulados };
    });
    res.json({ ...conCartera(resultado.documento.toObject()), pagosAnulados: resultado.pagosAnulados });
  } catch (error) {
    responderError(res, error, 'Error al anular el documento');
  }
};
