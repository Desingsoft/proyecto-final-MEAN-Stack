/**
 * Archivo: devolucionController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const { asignarCredito } = require('../utils/creditoFiscal');
const Devolucion = require('../models/Devolucion');
const { esVentas } = require('../middlewares/autorizacionRegistro');
const { pedidosPropios } = require('../middlewares/autorizacionFinanciera');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Existencia = require('../models/Existencia');
const Documento = require('../models/Documento');
const Pago = require('../models/Pago');
const MovimientoInventario = require('../models/MovimientoInventario');
const { conTransaccion } = require('../utils/transaccion');
const { siguiente, formatear } = require('../utils/consecutivos');
const { calcularTotales, NOTA_LEGAL } = require('../utils/documentos');
const { saldoAFavorDe } = require('../utils/cartera');
const { rangoDesdeQuery } = require('../utils/fechas');
const { cargar: cargarConfig } = require('./configuracionController');
const { recalcularFactura, METODOS } = require('./pagoController');

const MOTIVOS = ['defectuoso', 'error_pedido', 'no_deseado', 'garantia', 'otro'];
const LIMITE_FILAS = 1000;
const idValido = (id) => mongoose.isValidObjectId(id);
const falla = (status, mensaje) => ({ status, mensaje });
const responderError = (res, error, mensaje) =>
  error.status ? res.status(error.status).json({ mensaje: error.mensaje }) : res.status(500).json({ mensaje });
const sesion = (s) => ({ session: s || undefined });
const suma = (lista, fn) => lista.reduce((s, x) => s + fn(x), 0);
const pesos = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;

// Unidades ya devueltas (devoluciones vigentes) de un pedido, por producto.
const devueltoPorProducto = async (pedidoId) => {
  const previas = await Devolucion.find({ pedido: pedidoId, estado: 'vigente' }).select('items').lean();
  const mapa = new Map();
  for (const d of previas) for (const i of d.items) mapa.set(String(i.producto), (mapa.get(String(i.producto)) ?? 0) + i.cantidad);
  return mapa;
};

const poblar = (consulta) =>
  consulta.populate('notaCredito', 'numero total estado').populate('registradoPor', 'nombre').populate('pedido', 'cliente total estado createdAt');

// POST /api/devoluciones
// { pedidoId, motivo, nota?, items:[{producto,cantidad,reintegrar?}], reembolso?:{monto,metodo?,referencia?} }
/**
 * Controlador crear: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.crear = async (req, res) => {
  try {
    const claveIdempotencia = req.get('Idempotency-Key');
    if (typeof claveIdempotencia !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(claveIdempotencia)) {
      throw falla(400, 'Se requiere Idempotency-Key válida para registrar devoluciones');
    }
    const { pedidoId, motivo, nota = '', items, reembolso } = req.body;
    // Canonicalización de la solicitud lógica: el orden de las líneas no altera su identidad.
    // No incluimos atributos ajenos al contrato que el backend no procesa.
    const solicitud = {
      pedidoId: String(pedidoId), motivo, nota,
      items: Array.isArray(items) ? items.map(i => ({ producto: String(i.producto), cantidad: Number(i.cantidad), reintegrar: i.reintegrar !== false }))
        .sort((a, b) => a.producto.localeCompare(b.producto)) : items,
      reembolso: reembolso ? { monto: Number(reembolso.monto), metodo: reembolso.metodo || 'efectivo', referencia: String(reembolso.referencia || '').trim() } : null
    };
    const huellaSolicitud = createHash('sha256').update(JSON.stringify(solicitud)).digest('hex');
    const anterior = await Devolucion.findOne({ claveIdempotencia }).lean();
    if (anterior) {
      if (anterior.huellaSolicitud !== huellaSolicitud) throw falla(409, 'Esta clave ya se usó con una solicitud diferente');
      return res.status(200).json({ ...(await poblar(Devolucion.findById(anterior._id)).lean()), repetida: true });
    }
    if (!idValido(pedidoId)) throw falla(400, 'Pedido inválido');
    if (!MOTIVOS.includes(motivo)) throw falla(400, 'Indica el motivo de la devolución');
    if (!Array.isArray(items) || items.length === 0) throw falla(400, 'Selecciona al menos un producto a devolver');

    const pedido = await Pedido.findById(pedidoId).populate('items.producto', 'nombre sku').lean();
    if (!pedido) throw falla(404, 'Pedido no encontrado');
    if (!['enviado', 'completado'].includes(pedido.estado)) {
      throw falla(400, 'Solo se pueden devolver productos de pedidos enviados o completados. Si aún no se entregó, cancela el pedido.');
    }

    const yaDevuelto = await devueltoPorProducto(pedido._id);
    const vistos = new Set();
    const lineas = [];
    for (const it of items) {
      const cantidad = Number(it.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1) throw falla(400, 'Las cantidades deben ser enteros mayores a cero');
      if (!idValido(it.producto) || vistos.has(String(it.producto))) throw falla(400, 'Producto inválido o repetido');
      vistos.add(String(it.producto));

      const vendida = pedido.items.find((p) => String(p.producto?._id) === String(it.producto));
      if (!vendida) throw falla(400, 'Uno de los productos no pertenece a este pedido');
      const disponible = vendida.cantidad - (yaDevuelto.get(String(it.producto)) ?? 0);
      if (cantidad > disponible) {
        throw falla(400, `De "${vendida.producto.nombre}" solo se pueden devolver ${disponible} unidades (se vendieron ${vendida.cantidad})`);
      }
      lineas.push({
        producto: vendida.producto._id, sku: vendida.producto.sku, descripcion: vendida.producto.nombre,
        cantidad, precioUnitario: vendida.precioUnitario, bodega: vendida.bodega || undefined, reintegrar: it.reintegrar !== false
      });
    }

    // Valor que se le reconoce al cliente: lo mismo que pagó (con el descuento del pedido y el IVA de su factura).
    const factura = await Documento.findOne({ pedido: pedido._id, tipo: 'factura', estado: 'emitida' }).lean();
    // La factura original debe contener una instantánea fiscal por línea.
    // Los documentos antiguos sin desglose no se estiman: requieren regularización.
    if (factura) {
      for (const l of lineas) {
        const candidatas = factura.items.filter(i => i.sku === l.sku);
        if (candidatas.length !== 1 || !['descuentoValor', 'base', 'ivaValor', 'total'].every(c => Number.isSafeInteger(candidatas[0][c]) && candidatas[0][c] >= 0)) {
          throw falla(409, 'La factura no conserva un desglose fiscal inequívoco por producto; requiere revisión antes de devolver');
        }
        const origen = candidatas[0];
        if (origen.cantidad < l.cantidad || origen.precioUnitario !== l.precioUnitario) {
          throw falla(409, 'La línea de la factura no coincide con la venta histórica');
        }
        l.fiscalOrigen = origen;
      }
    }
    const subtotalBruto = suma(lineas, (l) => l.cantidad * l.precioUnitario);
    // La factura emitida es la fuente inmutable del descuento e IVA históricos.
    // Nunca se consultan precio ni impuesto del catálogo vigente.
    const descuentoPorcentaje = factura ? factura.descuentoPorcentaje : (pedido.descuentoPorcentaje || 0);
    if (factura && (!Number.isFinite(factura.descuentoPorcentaje) || !Number.isFinite(factura.ivaPorcentaje))) {
      throw falla(409, 'La factura carece de datos fiscales históricos completos; requiere revisión');
    }
    // Los acumulados se asignan por línea de la factura, no por totales del documento.
    // Para evitar carreras, el cálculo definitivo se repetirá bajo la transacción.
    const calcularCredito = (anteriores) => {
      const partidas = lineas.map(l => {
        const unidadesPrevias = anteriores.get(String(l.producto)) || 0;
        try { return asignarCredito(l.fiscalOrigen, unidadesPrevias, l.cantidad); }
        catch { throw falla(409, 'La devolución excede la cantidad o los valores históricos facturados'); }
      });
      const base = suma(partidas, p => p.base), ivaValor = suma(partidas, p => p.ivaValor);
      return { descuentoValor: suma(partidas, p => p.descuentoValor), base, ivaValor, total: base + ivaValor, partidas };
    };
    const totales = factura ? calcularCredito(yaDevuelto) : calcularTotales({
      subtotalBruto, descuentoPorcentaje, ivaPorcentaje: 0, conIva: false
    });
    if (factura && totales.total > factura.total - (factura.acreditado || 0)) {
      throw falla(409, 'El importe excede el saldo histórico acreditable; revisa las devoluciones previas');
    }
    if (reembolso) {
      if (!factura) throw falla(400, 'Solo se puede reembolsar dinero cuando el pedido tiene factura');
      if (!(Number(reembolso.monto) >= 1) || !Number.isInteger(Number(reembolso.monto))) throw falla(400, 'El monto del reembolso debe ser un entero mayor a cero');
      if (reembolso.metodo && !METODOS.includes(reembolso.metodo)) throw falla(400, 'Forma de reembolso inválida');
      // Se valida ANTES de registrar nada: el reembolso no puede superar lo que quedará a favor del cliente.
      const aFavorPrevisto = saldoAFavorDe({ ...factura, acreditado: (factura.acreditado || 0) + totales.total });
      if (Number(reembolso.monto) > aFavorPrevisto) {
        throw falla(400, aFavorPrevisto > 0
          ? `Solo hay ${pesos(aFavorPrevisto)} a favor del cliente para reembolsar con esta devolución`
          : 'Esta devolución no deja saldo a favor del cliente: su factura aún tiene saldo pendiente, así que el valor se descuenta de lo que debe');
      }
    }

    const config = await cargarConfig();
    const devolucion = await conTransaccion(async (session) => {
      // Bloquea lógicamente el pedido dentro de la transacción; otro registro simultáneo
      // de devolución del mismo pedido producirá conflicto de escritura y relectura.
      const pedidoActual = await Pedido.findByIdAndUpdate(pedidoId, { $inc: { __v: 1 } }, { new: true, session });
      if (!pedidoActual || !['enviado', 'completado'].includes(pedidoActual.estado)) throw falla(409, 'El pedido cambió de estado');
      const previas = await Devolucion.find({ pedido: pedidoId, estado: 'vigente' }).session(session).select('items').lean();
      const acumulado = new Map();
      for (const d of previas) for (const item of d.items) acumulado.set(String(item.producto), (acumulado.get(String(item.producto)) || 0) + item.cantidad);
      for (const linea of lineas) {
        const vendida = pedidoActual.items.filter(i => String(i.producto) === String(linea.producto)).reduce((n, i) => n + i.cantidad, 0);
        if (linea.cantidad + (acumulado.get(String(linea.producto)) || 0) > vendida) throw falla(409, 'Las unidades disponibles para devolución cambiaron; actualiza el pedido');
      }
      if (factura) {
        const facturaActual = await Documento.findById(factura._id).session(session);
        if (!facturaActual || facturaActual.estado !== 'emitida' || totales.total > facturaActual.total - (facturaActual.acreditado || 0)) throw falla(409, 'El saldo acreditable cambió; actualiza la factura');
      }
      if (factura) {
        const actuales = calcularCredito(acumulado);
        if (actuales.total !== totales.total || JSON.stringify(actuales.partidas) !== JSON.stringify(totales.partidas)) {
          throw falla(409, 'Las devoluciones previas cambiaron; vuelve a consultar el pedido');
        }
        const facturaActual = await Documento.findById(factura._id).session(session);
        if (actuales.total > facturaActual.total - (facturaActual.acreditado || 0)) {
          throw falla(409, 'No hay saldo fiscal suficiente para esta nota crédito');
        }
      }
      const consecutivo = await siguiente('devolucion', session);
      const [dev] = await Devolucion.create([{
        numero: formatear(config.prefijoDevolucion || 'DV', consecutivo), claveIdempotencia, huellaSolicitud, pedido: pedido._id, clienteRef: pedido.clienteRef, cliente: pedido.cliente,
        items: lineas, motivo, nota, subtotalBruto, descuentoPorcentaje, valor: totales.total, registradoPor: req.usuario.id
      }], sesion(session));

      // Reposición atómica: stock global, existencia física y kardex comparten sesión.
      // En inventarios multibodega no se permite asignar silenciosamente a una bodega distinta.
      const usaBodegas = Boolean(await Existencia.exists({}).session(session));
      for (const l of lineas.filter((x) => x.reintegrar)) {
        if (usaBodegas) {
          if (!l.bodega) throw falla(409, 'El pedido no identifica la bodega de origen; se requiere regularización antes de reintegrar');
          const ubicacion = await Existencia.updateOne(
            { producto: l.producto, bodega: l.bodega }, { $inc: { cantidad: l.cantidad } }, { session }
          );
          if (ubicacion.matchedCount !== 1) throw falla(409, 'No existe saldo por producto y bodega para reintegrar; concilia el inventario');
        }
        const global = await Producto.updateOne({ _id: l.producto }, { $inc: { stock: l.cantidad } }, { session });
        if (global.matchedCount !== 1) throw falla(409, 'Producto no disponible para reintegrar');
        await MovimientoInventario.create([{
          producto: l.producto, bodega: l.bodega, pedido: pedido._id, devolucion: dev._id, tipo: 'entrada', cantidad: l.cantidad, motivo: `devolución ${dev.numero}`, registradoPor: req.usuario.id
        }], sesion(session));
      }

      if (factura) {
        const seqNC = await siguiente('notaCredito', session);
        const [nc] = await Documento.create([{
          tipo: 'nota_credito', numero: formatear(config.prefijoNotaCredito || 'NC', seqNC), consecutivo: seqNC,
          pedido: pedido._id, clienteRef: factura.clienteRef, empresa: factura.empresa, cliente: factura.cliente,
          items: lineas.map((l, i) => ({ sku: l.sku, descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioUnitario, subtotal: l.cantidad * l.precioUnitario, descuentoValor: totales.partidas[i].descuentoValor, base: totales.partidas[i].base, ivaPorcentaje: l.fiscalOrigen.ivaPorcentaje, ivaValor: totales.partidas[i].ivaValor, total: totales.partidas[i].base + totales.partidas[i].ivaValor })),
          subtotalBruto, descuentoPorcentaje, descuentoValor: totales.descuentoValor, base: totales.base,
          ivaPorcentaje: factura.ivaPorcentaje, ivaValor: totales.ivaValor, total: totales.total, preciosIncluyenIva: factura.preciosIncluyenIva,
          notas: nota, notaLegal: NOTA_LEGAL, facturaOrigen: factura._id, numeroOrigen: factura.numero,
          devolucion: dev._id, motivoDevolucion: motivo, emitidoPor: req.usuario.id
        }], sesion(session));
        dev.notaCredito = nc._id;
        await dev.save(sesion(session));

        const actualizada = await recalcularFactura(factura._id, session);
        if (reembolso) {
          const aFavor = saldoAFavorDe(actualizada);
          if (Number(reembolso.monto) > aFavor) throw falla(400, `Solo hay ${pesos(aFavor)} a favor del cliente para reembolsar`);
          const seqRE = await siguiente('reembolso', session);
          await Pago.create([{
            tipo: 'reembolso', numero: formatear(config.prefijoReembolso || 'RE', seqRE), documento: factura._id, clienteRef: factura.clienteRef,
            contraparte: factura.cliente.nombre, referenciaDocumento: factura.numero, monto: Number(reembolso.monto),
            metodo: reembolso.metodo || 'efectivo', referencia: String(reembolso.referencia || '').trim(), nota: `Reembolso por ${nc.numero}`, registradoPor: req.usuario.id
          }], sesion(session));
          await recalcularFactura(factura._id, session);
        }
      }
      return dev;
    });
    res.status(201).json(await poblar(Devolucion.findById(devolucion._id)).lean());
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensaje: 'La operación ya existe o está en proceso. Consulta el historial antes de reintentar.' });
    responderError(res, error, 'Error al registrar la devolución');
  }
};

// GET /api/devoluciones?desde=&hasta=&motivo=&estado=&buscar=
/**
 * Controlador listar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listar = async (req, res) => {
  try {
    const rango = rangoDesdeQuery(req.query);
    const filtro = { createdAt: { $gte: rango.desde, $lt: rango.hasta } };
    if (MOTIVOS.includes(req.query.motivo)) filtro.motivo = req.query.motivo;
    if (['vigente', 'anulada'].includes(req.query.estado)) filtro.estado = req.query.estado;
    if (req.query.buscar) {
      const patron = { $regex: req.query.buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filtro.$or = [{ numero: patron }, { cliente: patron }];
    }
    if (esVentas(req)) filtro.pedido = { $in: await pedidosPropios(req) };
    const devoluciones = await Devolucion.find(filtro).sort({ createdAt: -1 }).populate('notaCredito', 'numero').lean();
    const vigentes = devoluciones.filter((d) => d.estado === 'vigente');

    const porMotivo = MOTIVOS.map((m) => {
      const lista = vigentes.filter((d) => d.motivo === m);
      return { motivo: m, cantidad: lista.length, valor: suma(lista, (d) => d.valor) };
    }).filter((m) => m.cantidad > 0).sort((a, b) => b.valor - a.valor);

    const productos = new Map();
    for (const d of vigentes) for (const i of d.items) {
      const f = productos.get(String(i.producto)) ?? { sku: i.sku, descripcion: i.descripcion, unidades: 0, valor: 0 };
      f.unidades += i.cantidad;
      f.valor += i.cantidad * i.precioUnitario;
      productos.set(String(i.producto), f);
    }

    res.json({
      rango: { desde: rango.claveDesde, hasta: rango.claveHasta, dias: rango.dias.length },
      resumen: {
        cantidad: vigentes.length, valor: suma(vigentes, (d) => d.valor), unidades: suma(vigentes, (d) => suma(d.items, (i) => i.cantidad)),
        anuladas: devoluciones.length - vigentes.length,
        reintegradas: suma(vigentes, (d) => suma(d.items.filter((i) => i.reintegrar), (i) => i.cantidad)),
        descartadas: suma(vigentes, (d) => suma(d.items.filter((i) => !i.reintegrar), (i) => i.cantidad))
      },
      porMotivo,
      topProductos: [...productos.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5),
      devoluciones: devoluciones.slice(0, LIMITE_FILAS).map((d) => ({
        _id: d._id, numero: d.numero, fecha: d.createdAt, pedido: d.pedido, cliente: d.cliente, motivo: d.motivo, estado: d.estado,
        unidades: suma(d.items, (i) => i.cantidad), valor: d.valor, notaCredito: d.notaCredito ?? null
      })),
      truncado: devoluciones.length > LIMITE_FILAS
    });
  } catch (error) {
    responderError(res, error, 'Error al obtener las devoluciones');
  }
};

// GET /api/devoluciones/pedido/:pedidoId  -> sus devoluciones y lo ya devuelto por producto
/**
 * Controlador porPedido: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.porPedido = async (req, res) => {
  try {
    if (!idValido(req.params.pedidoId)) throw falla(400, 'Identificador inválido');
    const devoluciones = await poblar(Devolucion.find({ pedido: req.params.pedidoId }).sort({ createdAt: -1 })).lean();
    const mapa = await devueltoPorProducto(req.params.pedidoId);
    res.json({ devoluciones, devuelto: Object.fromEntries(mapa) });
  } catch (error) {
    responderError(res, error, 'Error al obtener las devoluciones del pedido');
  }
};

// GET /api/devoluciones/:id
/**
 * Controlador obtener: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtener = async (req, res) => {
  try {
    if (!idValido(req.params.id)) throw falla(400, 'Identificador inválido');
    const dev = await poblar(Devolucion.findById(req.params.id)).lean();
    if (!dev) throw falla(404, 'Devolución no encontrada');
    res.json(dev);
  } catch (error) {
    responderError(res, error, 'Error al obtener la devolución');
  }
};

// PATCH /api/devoluciones/:id/anular  { motivo }   (solo admin)
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
      const dev = await Devolucion.findById(req.params.id).session(session || null);
      if (!dev) throw falla(404, 'Devolución no encontrada');
      if (dev.estado === 'anulada') throw falla(400, 'La devolución ya está anulada');

      // La anulación revierte en la misma ubicación física; sin saldo suficiente se rechaza todo.
      const usaBodegas = Boolean(await Existencia.exists({}).session(session));
      for (const i of dev.items.filter((x) => x.reintegrar)) {
        if (usaBodegas) {
          if (!i.bodega) throw falla(409, 'Devolución histórica sin bodega: conciliar antes de anular');
          const ubicacion = await Existencia.updateOne(
            { producto: i.producto, bodega: i.bodega, cantidad: { $gte: i.cantidad } },
            { $inc: { cantidad: -i.cantidad } }, { session }
          );
          if (ubicacion.modifiedCount !== 1) throw falla(409, 'Existencias insuficientes en la bodega original para anular');
        }
        const prod = await Producto.findById(i.producto).session(session || null);
        if (!prod || prod.stock < i.cantidad) {
          throw falla(400, `No hay stock suficiente de "${i.descripcion}" para revertir la devolución (hay ${prod?.stock ?? 0}, se necesitan ${i.cantidad})`);
        }
        prod.stock -= i.cantidad;
        await prod.save(sesion(session));
        await MovimientoInventario.create([{
          producto: i.producto, bodega: i.bodega, pedido: dev.pedido, devolucion: dev._id, tipo: 'salida', cantidad: i.cantidad, motivo: `anulación ${dev.numero}`, registradoPor: req.usuario.id
        }], sesion(session));
      }

      dev.estado = 'anulada';
      dev.anuladaEn = new Date();
      dev.motivoAnulacion = motivo;
      await dev.save(sesion(session));

      if (dev.notaCredito) {
        const nc = await Documento.findById(dev.notaCredito).session(session || null);
        if (nc && nc.estado === 'emitida') {
          nc.estado = 'anulada';
          nc.anuladaEn = new Date();
          nc.motivoAnulacion = `Devolución ${dev.numero} anulada: ${motivo}`;
          await nc.save(sesion(session));
          await recalcularFactura(nc.facturaOrigen, session);
        }
      }
    });
    res.json(await poblar(Devolucion.findById(req.params.id)).lean());
  } catch (error) {
    responderError(res, error, 'Error al anular la devolución');
  }
};

exports.MOTIVOS = MOTIVOS;
exports.devueltoPorProducto = devueltoPorProducto;
