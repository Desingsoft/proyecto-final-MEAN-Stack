/**
 * Archivo: carteraController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const Documento = require('../models/Documento');
const { esVentas } = require('../middlewares/autorizacionRegistro');
const { documentosPropios } = require('../middlewares/autorizacionFinanciera');
const OrdenCompra = require('../models/OrdenCompra');
const Cliente = require('../models/Cliente');
const Pago = require('../models/Pago');
const Pedido = require('../models/Pedido');
const { MS_DIA, inicioDeMes } = require('../utils/fechas');
const { diasDeMora, tramoDeMora, antiguedad, saldoDeFactura, saldoAFavorDe, pagadoDeFactura, saldoDeOrden, valorRecibido, redondear } = require('../utils/cartera');

const idValido = (id) => mongoose.isValidObjectId(id);
const falla = (status, mensaje) => ({ status, mensaje });
const responderError = (res, error, mensaje) =>
  error.status ? res.status(error.status).json({ mensaje: error.mensaje }) : res.status(500).json({ mensaje });
const suma = (lista, fn) => lista.reduce((s, x) => s + fn(x), 0);
const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Estado de la deuda según la mora: vencida, por vencer (en los próximos 7 días) o vigente.
const situacion = (mora) => (mora > 0 ? 'vencida' : mora >= -7 ? 'porVencer' : 'vigente');

// Fase 32: el alcance por sucursal se aplica en MongoDB antes de agregar saldos.
// No incluir documentos históricos sin pedido/sucursal para usuarios locales.
const documentosEnAlcance = async (req) => {
  if (!req || req.alcanceSucursales === null) return null;
  const pedidos = await Pedido.distinct('_id', { sucursal: { $in: req.alcanceSucursales || [] } });
  return Documento.distinct('_id', { pedido: { $in: pedidos } });
};
const filtroDocumentos = async (req) => {
  const propios = req && esVentas(req) ? await documentosPropios(req) : null;
  const sede = await documentosEnAlcance(req);
  if (propios === null && sede === null) return {};
  if (propios === null) return { _id: { $in: sede } };
  if (sede === null) return { _id: { $in: propios } };
  const ids = new Set(sede.map(String));
  return { _id: { $in: propios.filter(id => ids.has(String(id))) } };
};
const filtroPagosEnAlcance = async (req) => {
  const filtro = await filtroDocumentos(req);
  return filtro._id ? { documento: filtro._id } : {};
};

// ---------------------------------------------------------------------------
// Cuentas por cobrar: una fila por factura con saldo pendiente
// ---------------------------------------------------------------------------
const filasPorCobrar = async (ahora = new Date(), req = null) => {
  const filtroPropiedad = await filtroDocumentos(req);
  const facturas = await Documento.find({ tipo: 'factura', estado: 'emitida', ...filtroPropiedad })
    .select('numero cliente.nombre clienteRef createdAt fechaVencimiento total pagado acreditado reembolsado formaPago pedido').lean();
  return facturas
    .map((f) => {
      const saldo = saldoDeFactura(f);
      const mora = diasDeMora(f.fechaVencimiento, ahora);
      return {
        _id: f._id, numero: f.numero, cliente: f.cliente.nombre, clienteRef: f.clienteRef ?? null, pedido: f.pedido,
        fecha: f.createdAt, fechaVencimiento: f.fechaVencimiento ?? null, total: f.total, pagado: pagadoDeFactura(f), acreditado: f.acreditado || 0, reembolsado: f.reembolsado || 0,
        saldo, mora, tramo: tramoDeMora(mora), situacion: situacion(mora), formaPago: f.formaPago
      };
    })
    .filter((f) => f.saldo > 0);
};

const agruparPor = (filas, claveFn, nombreFn) => {
  const mapa = new Map();
  for (const f of filas) {
    const clave = claveFn(f);
    const g = mapa.get(clave) ?? { clave, nombre: nombreFn(f), referencia: f.clienteRef ?? f.proveedorRef ?? null, saldo: 0, vencido: 0, documentos: 0, mayorMora: 0 };
    g.saldo += f.saldo;
    if (f.mora > 0) g.vencido += f.saldo;
    g.documentos += 1;
    g.mayorMora = Math.max(g.mayorMora, f.mora);
    mapa.set(clave, g);
  }
  return [...mapa.values()].sort((a, b) => b.saldo - a.saldo);
};

const totalesDe = (filas) => {
  const porCobrar = suma(filas, (f) => f.saldo);
  const vencido = suma(filas.filter((f) => f.mora > 0), (f) => f.saldo);
  const porVencer = suma(filas.filter((f) => f.situacion === 'porVencer'), (f) => f.saldo);
  return {
    total: redondear(porCobrar), vencido: redondear(vencido), porVencer: redondear(porVencer),
    vigente: redondear(porCobrar - vencido - porVencer), documentos: filas.length, documentosVencidos: filas.filter((f) => f.mora > 0).length
  };
};

// Reutilizable por el panel principal.
exports.calcularCobrar = async (ahora = new Date()) => {
  const filas = await filasPorCobrar(ahora);
  return { filas, totales: totalesDe(filas) };
};

// Facturas donde el cliente pagó de más (una nota crédito bajó su valor): dinero que se le debe devolver.
const filasAFavor = async (req = null) => {
  const filtroPropiedad = await filtroDocumentos(req);
  const facturas = await Documento.find({ tipo: 'factura', estado: 'emitida', acreditado: { $gt: 0 }, ...filtroPropiedad })
    .select('numero cliente.nombre clienteRef total pagado acreditado reembolsado formaPago createdAt').lean();
  return facturas.filter((f) => saldoAFavorDe(f) > 0).map((f) => ({
    _id: f._id, numero: f.numero, cliente: f.cliente.nombre, clienteRef: f.clienteRef ?? null, fecha: f.createdAt,
    total: f.total, pagado: pagadoDeFactura(f), acreditado: f.acreditado, reembolsado: f.reembolsado || 0, aFavor: saldoAFavorDe(f)
  }));
};

// GET /api/cartera/cobrar/a-favor
/**
 * Controlador listaAFavor: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listaAFavor = async (req, res) => {
  try {
    const filas = (await filasAFavor(req)).sort((a, b) => b.aFavor - a.aFavor);
    res.json({ facturas: filas, total: suma(filas, (f) => f.aFavor) });
  } catch (error) {
    responderError(res, error, 'Error al obtener los saldos a favor');
  }
};

// GET /api/cartera/cobrar/resumen
/**
 * Controlador resumenCobrar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.resumenCobrar = async (req, res) => {
  try {
    const ahora = new Date();
    const filas = await filasPorCobrar(ahora, req);
    // Lo cobrado en el mes, menos lo reembolsado a clientes.
    const filtroPagos = await filtroPagosEnAlcance(req);
    const movimientosMes = await Pago.find({ tipo: { $in: ['cobro', 'reembolso'] }, estado: 'vigente', fecha: { $gte: inicioDeMes(ahora) }, ...filtroPagos }).select('monto tipo').lean();
    const aFavor = await filasAFavor(req);

    res.json({
      totales: { ...totalesDe(filas), cobradoMes: suma(movimientosMes, (p) => (p.tipo === 'reembolso' ? -p.monto : p.monto)) },
      aFavor: { total: suma(aFavor, (f) => f.aFavor), facturas: aFavor.length },
      antiguedad: antiguedad(filas),
      deudores: agruparPor(filas, (f) => String(f.clienteRef ?? f.cliente), (f) => f.cliente).slice(0, 8)
    });
  } catch (error) {
    responderError(res, error, 'Error al calcular la cartera por cobrar');
  }
};

// GET /api/cartera/cobrar?situacion=vencida|porVencer|vigente&cliente=&buscar=&pagina=&limite=
/**
 * Controlador listaCobrar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listaCobrar = async (req, res) => {
  try {
    const { situacion: filtroSituacion, cliente, buscar, pagina = 1, limite = 15 } = req.query;
    let filas = await filasPorCobrar(new Date(), req);

    if (['vencida', 'porVencer', 'vigente'].includes(filtroSituacion)) filas = filas.filter((f) => f.situacion === filtroSituacion);
    if (cliente && idValido(cliente)) filas = filas.filter((f) => String(f.clienteRef) === cliente);
    if (buscar) {
      const re = new RegExp(escapar(buscar), 'i');
      filas = filas.filter((f) => re.test(f.numero) || re.test(f.cliente));
    }
    // Lo más urgente primero: mayor mora; entre las vigentes, la que vence antes.
    filas.sort((a, b) => b.mora - a.mora || b.saldo - a.saldo);

    const total = filas.length;
    res.json({
      facturas: filas.slice((pagina - 1) * limite, pagina * limite),
      total, paginas: Math.ceil(total / limite), saldoFiltrado: redondear(suma(filas, (f) => f.saldo))
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener las facturas por cobrar');
  }
};

// GET /api/cartera/cobrar/clientes - saldo por cliente, con su cupo de crédito
/**
 * Controlador porCliente: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.porCliente = async (req, res) => {
  try {
    const filas = await filasPorCobrar(new Date(), req);
    const grupos = agruparPor(filas, (f) => String(f.clienteRef ?? f.cliente), (f) => f.cliente);
    const ids = grupos.map((g) => g.referencia).filter(Boolean);
    const clientes = ids.length ? await Cliente.find({ _id: { $in: ids } }).select('cupoCredito diasCredito').lean() : [];
    const porId = new Map(clientes.map((c) => [String(c._id), c]));

    res.json(grupos.map((g) => {
      const cupo = g.referencia ? porId.get(String(g.referencia))?.cupoCredito ?? 0 : 0;
      return {
        clienteRef: g.referencia, cliente: g.nombre, saldo: redondear(g.saldo), vencido: redondear(g.vencido),
        facturas: g.documentos, mayorMora: g.mayorMora, cupo, disponible: cupo > 0 ? Math.max(cupo - g.saldo, 0) : null
      };
    }));
  } catch (error) {
    responderError(res, error, 'Error al obtener la cartera por cliente');
  }
};

// GET /api/cartera/cobrar/estado-cuenta/:clienteId
/**
 * Controlador estadoCuenta: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.estadoCuenta = async (req, res) => {
  try {
    if (!idValido(req.params.clienteId)) throw falla(400, 'Cliente inválido');
    const cliente = await Cliente.findById(req.params.clienteId).lean();
    if (!cliente) throw falla(404, 'Cliente no encontrado');
    // Evita revelar datos del cliente si no tiene facturas en las sedes autorizadas.
    if (req.alcanceSucursales !== null) {
      const ids = await documentosEnAlcance(req);
      if (!await Documento.exists({ _id: { $in: ids }, clienteRef: cliente._id }))
        throw falla(404, 'Cliente no encontrado');
    }

    const filas = (await filasPorCobrar(new Date(), req)).filter((f) => String(f.clienteRef) === String(cliente._id));
    const filtroPagos = await filtroPagosEnAlcance(req);
    const pagos = await Pago.find({ tipo: 'cobro', estado: 'vigente', clienteRef: cliente._id, ...filtroPagos }).sort({ fecha: -1 }).limit(15)
      .select('numero fecha monto metodo referenciaDocumento').lean();
    const totales = totalesDe(filas);

    res.json({
      cliente, facturas: filas.sort((a, b) => b.mora - a.mora), pagos,
      resumen: { ...totales, cupo: cliente.cupoCredito || 0, disponible: cliente.cupoCredito > 0 ? Math.max(cliente.cupoCredito - totales.total, 0) : null }
    });
  } catch (error) {
    responderError(res, error, 'Error al generar el estado de cuenta');
  }
};

// ---------------------------------------------------------------------------
// Cuentas por pagar: una fila por orden de compra con saldo pendiente
// ---------------------------------------------------------------------------
const filasPorPagar = async (ahora = new Date(), req = null) => {
  // El filtro por sede se aplica en la consulta, antes de calcular saldos.
  const alcance = req?.alcanceSucursales === null ? {} : req?.alcanceSucursales ? { sucursal: { $in: req.alcanceSucursales } } : {};
  const ordenes = await OrdenCompra.find({ estado: { $in: ['enviada', 'parcial', 'recibida'] }, ...alcance })
    .populate('proveedor', 'nombre diasCredito').select('numero proveedor items pagado estado fechaVencimientoPago facturaProveedor recepciones createdAt').lean();
  return ordenes
    .map((o) => {
      const saldo = saldoDeOrden(o);
      // Si nadie fijó el vencimiento, se calcula desde la primera recepción y el plazo del proveedor.
      const primera = o.recepciones?.[0]?.fecha;
      const vencimiento = o.fechaVencimientoPago ?? (primera ? new Date(new Date(primera).getTime() + (o.proveedor?.diasCredito ?? 30) * MS_DIA) : null);
      const mora = diasDeMora(vencimiento, ahora);
      return {
        _id: o._id, numero: o.numero, proveedor: o.proveedor?.nombre ?? 'Proveedor', proveedorRef: o.proveedor?._id ?? null,
        facturaProveedor: o.facturaProveedor || '', estadoOrden: o.estado, fecha: o.createdAt, fechaVencimiento: vencimiento,
        total: valorRecibido(o), pagado: o.pagado || 0, saldo, mora, tramo: tramoDeMora(mora), situacion: situacion(mora)
      };
    })
    .filter((f) => f.saldo > 0);
};

exports.calcularPagar = async (ahora = new Date()) => {
  const filas = await filasPorPagar(ahora);
  return { filas, totales: totalesDe(filas) };
};

// GET /api/cartera/pagar/resumen
/**
 * Controlador resumenPagar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.resumenPagar = async (req, res) => {
  try {
    const filas = await filasPorPagar(new Date(), req);
    const alcancePagos = req.alcanceSucursales === null ? {} : { sucursal: { $in: req.alcanceSucursales || [] } };
    const pagosMes = await Pago.find({ tipo: 'egreso', estado: 'vigente', ...alcancePagos, fecha: { $gte: inicioDeMes(new Date()) } }).select('monto').lean();
    res.json({
      totales: { ...totalesDe(filas), pagadoMes: suma(pagosMes, (p) => p.monto) },
      antiguedad: antiguedad(filas),
      acreedores: agruparPor(filas.map((f) => ({ ...f, clienteRef: f.proveedorRef })), (f) => String(f.clienteRef ?? f.proveedor), (f) => f.proveedor).slice(0, 8)
    });
  } catch (error) {
    responderError(res, error, 'Error al calcular las cuentas por pagar');
  }
};

// GET /api/cartera/pagar?situacion=&buscar=&pagina=&limite=
/**
 * Controlador listaPagar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listaPagar = async (req, res) => {
  try {
    const { situacion: filtroSituacion, buscar, pagina = 1, limite = 15 } = req.query;
    let filas = await filasPorPagar(new Date(), req);
    if (['vencida', 'porVencer', 'vigente'].includes(filtroSituacion)) filas = filas.filter((f) => f.situacion === filtroSituacion);
    if (buscar) {
      const re = new RegExp(escapar(buscar), 'i');
      filas = filas.filter((f) => re.test(f.numero) || re.test(f.proveedor) || re.test(f.facturaProveedor));
    }
    filas.sort((a, b) => b.mora - a.mora || b.saldo - a.saldo);
    const total = filas.length;
    res.json({ ordenes: filas.slice((pagina - 1) * limite, pagina * limite), total, paginas: Math.ceil(total / limite), saldoFiltrado: redondear(suma(filas, (f) => f.saldo)) });
  } catch (error) {
    responderError(res, error, 'Error al obtener las cuentas por pagar');
  }
};

exports.saldoDeCliente = async (clienteId) => {
  const facturas = await Documento.find({ tipo: 'factura', estado: 'emitida', clienteRef: clienteId }).select('total pagado acreditado reembolsado formaPago').lean();
  return suma(facturas, (f) => saldoDeFactura(f));
};
