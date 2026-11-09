const alcanceSede = require('../middlewares/alcanceSucursal');
const { filtroPedidos } = require('../middlewares/autorizacionRegistro');
/**
 * Archivo: pedidoController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Cotizacion = require('../models/Cotizacion');
const Producto = require('../models/Producto');
const Existencia = require('../models/Existencia');
const MovimientoInventario = require('../models/MovimientoInventario');
const Cliente = require('../models/Cliente');
const Devolucion = require('../models/Devolucion');
const Documento = require('../models/Documento');
const { conTransaccion } = require('../utils/transaccion');
const { validarLineasCotizadas, calcularTotalCotizado } = require('../utils/preciosCotizados');

// GET /api/pedidos - listar con filtros
/**
 * Controlador obtenerTodos: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerTodos = async (req, res) => {
  try {
    // Limitar paginación y ordenamiento evita consultas excesivas o campos arbitrarios.
    const { estado, cliente } = req.query;
    const limite = Number(req.query.limite ?? 20);
    const pagina = Number(req.query.pagina ?? 1);
    const ordenesPermitidos = new Set(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'total', '-total']);
    const orden = ordenesPermitidos.has(req.query.orden) ? req.query.orden : '-createdAt';
    if (!Number.isSafeInteger(limite) || limite < 1 || limite > 100 ||
        !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) {
      return res.status(400).json({ mensaje: 'Paginación inválida: límite de 1 a 100 y página positiva' });
    }
    const filtro = { ...filtroPedidos(req), ...alcanceSede.filtro(req) };
    // Rechazar filtros inválidos evita resultados inesperados y consultas innecesarias.
    const estadosPermitidos = new Set(['pendiente', 'procesando', 'enviado', 'completado', 'cancelado']);
    if (estado && !estadosPermitidos.has(estado)) return res.status(400).json({ mensaje: 'Estado inválido' });
    if (cliente && !mongoose.isValidObjectId(cliente)) return res.status(400).json({ mensaje: 'Cliente inválido' });
    if (estado) filtro.estado = estado;
    if (cliente) filtro.clienteRef = cliente;

    const pedidos = await Pedido.find(filtro)
      .populate('items.producto', 'nombre sku')
      .populate('creadoPor', 'nombre')
      .sort(orden)
      .skip((pagina - 1) * limite)
      .limit(Number(limite));

    const total = await Pedido.countDocuments(filtro);

    res.json({ pedidos, total, paginas: Math.ceil(total / limite) });
  } catch (error) {
    console.error('Error al listar pedidos:', error);
    res.status(500).json({ mensaje: 'Error al obtener pedidos' });
  }
};

// GET /api/pedidos/:id
/**
 * Controlador obtenerPorId: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerPorId = async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('items.producto', 'nombre sku precio')
      .populate('clienteRef', 'nombre documento tipoDocumento email telefono diasCredito cupoCredito')
      .populate('creadoPor', 'nombre');
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    console.error('Error al consultar pedido:', error);
    res.status(500).json({ mensaje: 'Error al obtener el pedido' });
  }
};

// GET /api/pedidos/resumen
/**
 * Controlador obtenerResumen: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerResumen = async (req, res) => {
  try {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [pendientes, procesando, completadosHoy] = await Promise.all([
      Pedido.countDocuments({ estado: 'pendiente', ...alcanceSede.filtro(req) }),
      Pedido.countDocuments({ estado: 'procesando', ...alcanceSede.filtro(req) }),
      Pedido.countDocuments({ estado: 'completado', updatedAt: { $gte: inicioHoy }, ...alcanceSede.filtro(req) })
    ]);

    res.json({ pendientes, procesando, completadosHoy });
  } catch (error) {
    console.error('Error al resumir pedidos:', error);
    res.status(500).json({ mensaje: 'Error al obtener el resumen' });
  }
};

// POST /api/pedidos - crear pedido con descuento automático de stock (transacción)
// Body: { cliente?, clienteRef?, items:[{producto,cantidad}], descuentoPorcentaje? }
/**
 * Controlador crear: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.crear = async (req, res) => {
  try {
    const { items, clienteRef, cotizacionRef, bodegaId } = req.body;
    // Si hay stock distribuido, la bodega es obligatoria para evitar salidas sin ubicación.
    if (bodegaId && !mongoose.isValidObjectId(bodegaId)) throw { status: 400, mensaje: 'Bodega inválida' };
    let { cliente } = req.body;
    const descuentoPorcentaje = req.body.descuentoPorcentaje === undefined || req.body.descuentoPorcentaje === '' ? 0 : Number(req.body.descuentoPorcentaje);

    if (!Array.isArray(items) || items.length === 0) {
      throw { status: 400, mensaje: 'El pedido debe tener al menos un producto' };
    }
    // Cada producto debe aparecer una sola vez para evitar sobreventas por líneas repetidas.
    const ids = items.map((item) => String(item?.producto || ''));
    if (ids.some((id) => !mongoose.isValidObjectId(id)) || new Set(ids).size !== ids.length) {
      throw { status: 400, mensaje: 'Los productos deben ser válidos y no estar duplicados' };
    }
    if (items.some((item) => !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0)) {
      throw { status: 400, mensaje: 'Cada cantidad debe ser un entero positivo' };
    }
    if (!(descuentoPorcentaje >= 0 && descuentoPorcentaje <= 100)) {
      throw { status: 400, mensaje: 'El descuento debe estar entre 0 y 100' };
    }

    // Si se eligió un cliente registrado, el nombre del pedido sale de su ficha.
    if (clienteRef) {
      if (!mongoose.isValidObjectId(clienteRef)) throw { status: 400, mensaje: 'Cliente inválido' };
      const ficha = await Cliente.findById(clienteRef).lean();
      if (!ficha || !ficha.activo) throw { status: 404, mensaje: 'Cliente no encontrado' };
      cliente = ficha.nombre;
    }
    if (!cliente || !String(cliente).trim()) throw { status: 400, mensaje: 'Indica el cliente del pedido' };

    if (cotizacionRef && !mongoose.isValidObjectId(cotizacionRef)) throw { status: 400, mensaje: 'Cotización inválida' };
    // Nunca aceptar precios de cotización enviados por el navegador: se consultan en MongoDB.
    const pedidoId = await conTransaccion(async (session) => {
      let subtotal = 0;
      const usaBodegas = await Existencia.exists({}).session(session);
      if (usaBodegas && !bodegaId) throw { status: 409, mensaje: 'Selecciona una bodega antes de crear el pedido: existen inventarios por ubicación' };
      const itemsProcesados = [];
      const movimientosCreados = [];
      // Obtener la versión aprobada dentro de la misma sesión que crea el pedido.
      const cotizacion = cotizacionRef ? await Cotizacion.findById(cotizacionRef).session(session) : null;
      if (cotizacionRef) {
        if (!cotizacion || cotizacion.estado !== 'aceptada' || cotizacion.pedidoRef ||
            (cotizacion.vigenciaHasta && cotizacion.vigenciaHasta < new Date())) {
          throw { status: 409, mensaje: 'Cotización no aceptada, vencida o ya convertida' };
        }
        // Verificar que el cliente no cambie los productos ni cantidades aprobados.
        if (!validarLineasCotizadas(items, cotizacion.items)) {
          throw { status: 409, mensaje: 'Los productos o cantidades difieren de la cotización aprobada' };
        }
        if (String(cliente).trim() !== cotizacion.cliente || descuentoPorcentaje !== cotizacion.descuentoPorcentaje) {
          throw { status: 409, mensaje: 'Cliente o descuento diferente al aprobado' };
        }
      }


      // Usar el precio histórico aprobado, nunca el precio actual del catálogo.
      const lineas = cotizacion ? cotizacion.items : items;
      for (const item of lineas) {
        const producto = await Producto.findById(item.producto).session(session);

        if (!producto) {
          throw { status: 404, mensaje: `Producto no encontrado: ${item.producto}` };
        }
        // Validar cantidades antes de modificar existencias o crear movimientos.
        if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
          throw { status: 400, mensaje: 'Cada cantidad debe ser un entero positivo' };
        }
        if (producto.stock < item.cantidad) {
          throw {
            status: 400,
            mensaje: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}`
          };
        }

        itemsProcesados.push({
          producto: producto._id,
          cantidad: item.cantidad,
          precioUnitario: cotizacion ? item.precioUnitario : producto.precio,
          bodega: bodegaId || undefined
        });
        subtotal += (cotizacion ? item.precioUnitario : producto.precio) * item.cantidad;

        // Descontar también la existencia física en la misma transacción.
        if (usaBodegas) {
          const ubicacion = await Existencia.updateOne(
            { producto: producto._id, bodega: bodegaId, cantidad: { $gte: item.cantidad } },
            { $inc: { cantidad: -item.cantidad } }, { session }
          );
          if (ubicacion.modifiedCount !== 1) throw { status: 409, mensaje: `Stock insuficiente en la bodega para ${producto.nombre}` };
        }
        // Descuento condicional: dos pedidos concurrentes no pueden consumir el mismo stock.
        const descuento = await Producto.updateOne(
          { _id: producto._id, stock: { $gte: item.cantidad } },
          { $inc: { stock: -item.cantidad } }, { session }
        );
        if (descuento.modifiedCount !== 1) {
          throw { status: 409, mensaje: `Stock agotado durante la operación: ${producto.nombre}` };
        }

        const [movimientoSalida] = await MovimientoInventario.create([{
          producto: producto._id,
          tipo: 'salida',
          cantidad: item.cantidad,
          motivo: 'venta',
          bodega: bodegaId || undefined,
          // La referencia se completa al crear el pedido, dentro de la misma transacción.
          registradoPor: req.usuario.id
        }], { session });
        movimientosCreados.push(movimientoSalida._id);
      }

      // Respetar subtotal y total guardados en la cotización aceptada.
      const total = cotizacion ? calcularTotalCotizado(cotizacion) : subtotal - Math.round((subtotal * descuentoPorcentaje) / 100);
      if (cotizacion && (Math.abs(subtotal - cotizacion.subtotal) > 0.01)) {
        throw { status: 409, mensaje: 'El subtotal aprobado no coincide con sus líneas' };
      }
      const [pedido] = await Pedido.create([{
        // La referencia se persiste junto con el pedido dentro de la misma transacción.
        cotizacionRef: cotizacionRef || undefined,
        cliente: String(cliente).trim(),
        clienteRef: clienteRef || undefined,
        items: itemsProcesados,
        subtotal,
        descuentoPorcentaje,
        descuentoValor: subtotal - total,
        // IVA comercial: cero hasta que una factura determine la configuración fiscal.
        ivaPorcentaje: 0, ivaValor: 0,
        total,
        estado: 'pendiente',
        creadoPor: req.usuario.id
      }], { session });

      // Asociar las salidas de esta transacción con su pedido recién creado.
      // No se usa motivo textual como identificador: es una referencia MongoDB verificable.
      await MovimientoInventario.updateMany(
        { _id: { $in: movimientosCreados } }, { $set: { pedido: pedido._id } }, { session }
      );
      if (cotizacionRef) {
        // Cambio de estado y vínculo atómicos: si falla, también se revierte el pedido y stock.
        const resultado = await Cotizacion.updateOne(
          { _id: cotizacionRef, estado: 'aceptada', pedidoRef: null, $or: [{ vigenciaHasta: null }, { vigenciaHasta: { $gte: new Date() } }] },
          { $set: { pedidoRef: pedido._id } }, { session }
        );
        if (!resultado.modifiedCount) throw { status: 409, mensaje: 'Cotización ya convertida, vencida o no aceptada' };
      }
      return pedido._id;
    });

    const pedidoCompleto = await Pedido.findById(pedidoId).populate('items.producto', 'nombre sku');
    res.status(201).json(pedidoCompleto);
  } catch (error) {
    // Conflicto de índice único: segunda conversión concurrente de la misma cotización.
    const status = error.code === 11000 ? 409 : (error.status || 500);
    if (status === 500) console.error('Error al crear pedido:', error);
    res.status(status).json({ mensaje: status === 500 ? 'Error al crear el pedido' : (error.mensaje || 'Conflicto al crear pedido') });
  }
};

// PATCH /api/pedidos/:id/estado - cambiar estado
/**
 * Controlador cambiarEstado: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];
    // Máquina de estados: no permite saltos ni regresar a fases anteriores.
    const transiciones = {
      pendiente: ['procesando', 'cancelado'],
      procesando: ['enviado', 'cancelado'],
      enviado: ['completado'],
      completado: [], cancelado: []
    };
    if (!estadosValidos.includes(estado)) return res.status(400).json({ mensaje: 'Estado inválido' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ mensaje: 'Identificador de pedido inválido' });

    // Toda la cancelación ocurre en una sola transacción: estado, documentos,
    // existencias y movimientos se confirman juntos o se revierten juntos.
    const pedidoId = await conTransaccion(async (session) => {
      const pedido = await Pedido.findById(req.params.id).session(session);
      if (!pedido) throw { status: 404, mensaje: 'Pedido no encontrado' };
      if (pedido.estado === estado) return pedido._id; // Reintento idempotente.
      if (!transiciones[pedido.estado]?.includes(estado)) {
        throw { status: 409, mensaje: `Transición no permitida: ${pedido.estado} → ${estado}` };
      }
      if (estado !== 'cancelado') {
        // Evita sobrescrituras silenciosas por cambios de estado concurrentes.
        const actualizado = await Pedido.updateOne(
          { _id: pedido._id, estado: pedido.estado }, { $set: { estado } }, { session }
        );
        if (actualizado.modifiedCount !== 1) throw { status: 409, mensaje: 'El pedido cambió durante la operación' };
        return pedido._id;
      }
      // Una devolución previa impide reponer dos veces las mismas unidades.
      const devoluciones = await Devolucion.countDocuments({ pedido: pedido._id, estado: 'vigente' }).session(session);
      if (devoluciones) throw { status: 409, mensaje: 'El pedido tiene devoluciones vigentes; concilia antes de cancelar' };
      const factura = await Documento.findOne({ pedido: pedido._id, tipo: 'factura', estado: 'emitida' }).session(session);
      if (factura) throw { status: 409, mensaje: 'Anula primero la factura emitida del pedido' };

      // Reclamar el cambio de estado dentro de la transacción protege frente a
      // cancelaciones simultáneas que intentarían reponer stock dos veces.
      const reclamado = await Pedido.updateOne(
        { _id: pedido._id, estado: pedido.estado }, { $set: { estado: 'cancelado' } }, { session }
      );
      if (reclamado.modifiedCount !== 1) throw { status: 409, mensaje: 'Pedido modificado concurrentemente' };
      await Documento.updateMany(
        { pedido: pedido._id, estado: 'emitida', tipo: { $ne: 'factura' } },
        { $set: { estado: 'anulada', anuladaEn: new Date(), motivoAnulacion: 'Pedido cancelado' } },
        { session }
      );
      const usaBodegas = await Existencia.exists({}).session(session);
      for (const item of pedido.items) {
        // Nunca adivinar la bodega de destino: se usa la ubicación original.
        if (usaBodegas && !item.bodega) throw { status: 409, mensaje: 'Pedido histórico sin bodega: requiere conciliación manual antes de cancelar' };
        if (usaBodegas) {
          const resultadoBodega = await Existencia.updateOne(
            { producto: item.producto, bodega: item.bodega },
            { $inc: { cantidad: item.cantidad } }, { session }
          );
          if (resultadoBodega.modifiedCount !== 1) throw { status: 409, mensaje: 'No existe la ubicación de origen para reponer inventario' };
        }
        // La reposición y su evidencia de auditoría utilizan la misma sesión.
        const actualizado = await Producto.updateOne(
          { _id: item.producto }, { $inc: { stock: item.cantidad } }, { session }
        );
        if (actualizado.modifiedCount !== 1) throw { status: 409, mensaje: 'Producto del pedido no disponible para reposición' };
        await MovimientoInventario.create([{
          producto: item.producto, tipo: 'entrada', cantidad: item.cantidad,
          motivo: 'cancelación de pedido', pedido: pedido._id,
          bodega: item.bodega || undefined, registradoPor: req.usuario.id
        }], { session });
      }
      return pedido._id;
    });
    res.json(await Pedido.findById(pedidoId));
  } catch (error) {
    // Nunca incluir error.message de errores inesperados en respuestas públicas.
    const status = error.status || (error.code === 11000 ? 409 : 500);
    if (status === 500) console.error('Error al cambiar estado del pedido:', error);
    res.status(status).json({ mensaje: status === 500 ? 'No fue posible actualizar el pedido' : error.mensaje });
  }
};
