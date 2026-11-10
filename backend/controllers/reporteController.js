/**
 * Archivo: reporteController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const Pedido = require('../models/Pedido');
const Devolucion = require('../models/Devolucion');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');
const { nivelStock } = require('../utils/stock');
const { calcularCobrar, calcularPagar } = require('./carteraController');
const {
  claveDia,
  inicioDeDia,
  sumarDias,
  listarDias,
  rangoDesdeQuery
} = require('../utils/fechas');

const ESTADOS = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];
const LIMITE_FILAS = 1000;

const redondear = (n) => Math.round(n * 100) / 100;
const suma = (lista, fn) => lista.reduce((acc, x) => acc + fn(x), 0);
const esVenta = (pedido) => pedido.estado !== 'cancelado'; // un pedido cancelado no cuenta como venta
const unidadesDe = (pedido) => suma(pedido.items, (i) => i.cantidad);
const variacion = (actual, previo) => (previo > 0 ? redondear(((actual - previo) / previo) * 100) : null);

const responderError = (res, error, mensaje) => {
  if (error.status) return res.status(error.status).json({ mensaje: error.mensaje });
  return res.status(500).json({ mensaje });
};

// Devoluciones vigentes entre dos instantes (se cuentan en la fecha en que se registran).
const devolucionesEn = (desde, hasta) =>
  Devolucion.find({ estado: 'vigente', createdAt: { $gte: desde, $lt: hasta } })
    .select('valor items descuentoPorcentaje createdAt')
    .populate('items.producto', 'nombre sku categoria costo')
    .lean();

// Agrupa las líneas de una lista de pedidos por producto, restando lo devuelto.
const agruparPorProducto = (pedidos, devoluciones = []) => {
  const mapa = new Map();
  for (const pedido of pedidos) {
    const factor = 1 - (pedido.descuentoPorcentaje || 0) / 100; // el descuento del pedido se reparte entre sus líneas
    for (const item of pedido.items) {
      const prod = item.producto; // puede ser null si el producto se eliminó de verdad
      const clave = prod ? String(prod._id) : 'eliminado';
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          producto: prod?._id ?? null,
          sku: prod?.sku ?? '—',
          nombre: prod?.nombre ?? 'Producto eliminado',
          categoria: prod?.categoria ?? null,
          unidades: 0,
          ingresos: 0,
          costo: 0
        });
      }
      const fila = mapa.get(clave);
      fila.unidades += item.cantidad;
      fila.ingresos += item.cantidad * item.precioUnitario * factor;
      fila.costo += item.cantidad * (prod?.costo ?? 0);
    }
  }
  for (const dev of devoluciones) {
    const factor = 1 - (dev.descuentoPorcentaje || 0) / 100;
    for (const item of dev.items) {
      const prod = item.producto;
      const clave = prod ? String(prod._id) : 'eliminado';
      if (!mapa.has(clave)) {
        mapa.set(clave, { producto: prod?._id ?? null, sku: prod?.sku ?? '—', nombre: prod?.nombre ?? 'Producto eliminado', categoria: prod?.categoria ?? null, unidades: 0, ingresos: 0, costo: 0 });
      }
      const fila = mapa.get(clave);
      fila.unidades -= item.cantidad;
      fila.ingresos -= item.cantidad * item.precioUnitario * factor;
      if (item.reintegrar) fila.costo -= item.cantidad * (prod?.costo ?? 0); // lo dañado no recupera su costo
    }
  }
  return [...mapa.values()]
    .map((f) => ({
      ...f,
      ingresos: redondear(f.ingresos),
      costo: redondear(f.costo),
      margen: redondear(f.ingresos - f.costo)
    }))
    .sort((a, b) => b.ingresos - a.ingresos);
};

// Totales por día, con ceros en los días sin actividad y restando las devoluciones del día en que se registraron.
const ventasPorDia = (ventas, dias, devoluciones = []) => {
  const mapa = new Map(dias.map((fecha) => [fecha, { fecha, total: 0, pedidos: 0 }]));
  for (const pedido of ventas) {
    const dia = mapa.get(claveDia(pedido.createdAt));
    if (dia) {
      dia.total += pedido.total;
      dia.pedidos += 1;
    }
  }
  for (const dev of devoluciones) {
    const dia = mapa.get(claveDia(dev.createdAt));
    if (dia) dia.total -= dev.valor;
  }
  return [...mapa.values()].map((d) => ({ ...d, total: redondear(d.total) }));
};

// ---------------------------------------------------------------------------
// GET /api/reportes/dashboard?dias=14
// Las cifras de ventas cubren los últimos `dias` días y se comparan con los
// `dias` días inmediatamente anteriores.
// ---------------------------------------------------------------------------
/**
 * Controlador dashboard: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.dashboard = async (req, res) => {
  try {
    const dias = Math.min(Math.max(parseInt(req.query.dias, 10) || 14, 7), 90);
    const rol = req.usuario.role;
    const esAdmin = rol === 'admin';
    const verVentas = esAdmin || rol === 'ventas';

    const ahora = new Date();
    const hoy = claveDia(ahora);
    const claveInicio = sumarDias(hoy, -(dias - 1));
    const inicioPeriodo = inicioDeDia(claveInicio);
    const inicioPrevio = inicioDeDia(sumarDias(claveInicio, -dias));
    const hace30 = inicioDeDia(sumarDias(hoy, -29));

    const [productos, pendientes, procesando, conteoEstados] = await Promise.all([
      Producto.find({ activo: true }).select('nombre sku stock stockMinimo costo precio').lean(),
      Pedido.countDocuments({ estado: 'pendiente' }),
      Pedido.countDocuments({ estado: 'procesando' }),
      Promise.all(ESTADOS.map((estado) => Pedido.countDocuments({ estado, createdAt: { $gte: hace30 } })))
    ]);

    // --- Inventario ---
    const estadoInventario = { agotado: 0, critico: 0, bajo: 0, saludable: 0 };
    const conNivel = productos.map((p) => {
      const nivel = nivelStock(p.stock, p.stockMinimo);
      estadoInventario[nivel] += 1;
      return { ...p, nivel };
    });
    const atencion = conNivel
      .filter((p) => p.nivel !== 'saludable')
      .sort((a, b) => a.stock / (a.stockMinimo || 1) - b.stock / (b.stockMinimo || 1))
      .slice(0, 6)
      .map((p) => ({ _id: p._id, nombre: p.nombre, sku: p.sku, stock: p.stock, stockMinimo: p.stockMinimo, nivel: p.nivel }));

    // --- Cartera: lo que te deben (admin y ventas) y lo que debes (solo admin) ---
    const cartera = { carteraPorCobrar: null, carteraVencida: null, facturasVencidas: null, cuentasPorPagar: null, cuentasPorPagarVencidas: null };
    if (verVentas) {
      const { totales } = await calcularCobrar(ahora);
      cartera.carteraPorCobrar = totales.total;
      cartera.carteraVencida = totales.vencido;
      cartera.facturasVencidas = totales.documentosVencidos;
    }
    if (esAdmin) {
      const { totales } = await calcularPagar(ahora);
      cartera.cuentasPorPagar = totales.total;
      cartera.cuentasPorPagarVencidas = totales.vencido;
    }

    // --- Ventas (solo admin y ventas) ---
    let kpisVentas = { ventasPeriodo: null, ventasPeriodoAnterior: null, variacionVentas: null, pedidosPeriodo: null, ticketPromedio: null, devolucionesPeriodo: null };
    let serieVentas = null;
    let topProductos = null;

    if (verVentas) {
      const pedidos = await Pedido.find({ createdAt: { $gte: inicioPrevio } })
        .select('total estado createdAt items descuentoPorcentaje')
        .populate('items.producto', 'nombre sku')
        .lean();
      const ventas = pedidos.filter(esVenta);

      const delPeriodo = ventas.filter((p) => p.createdAt >= inicioPeriodo);
      const delPrevio = ventas.filter((p) => p.createdAt < inicioPeriodo);
      // Las ventas son netas: se descuenta lo devuelto en cada periodo.
      const devoluciones = await devolucionesEn(inicioPrevio, new Date(ahora.getTime() + 60000));
      const devPeriodo = devoluciones.filter((d) => d.createdAt >= inicioPeriodo);
      const devPrevio = devoluciones.filter((d) => d.createdAt < inicioPeriodo);
      const totalPeriodo = suma(delPeriodo, (p) => p.total) - suma(devPeriodo, (d) => d.valor);
      const totalPrevio = suma(delPrevio, (p) => p.total) - suma(devPrevio, (d) => d.valor);

      kpisVentas = {
        ventasPeriodo: redondear(totalPeriodo),
        ventasPeriodoAnterior: redondear(totalPrevio),
        variacionVentas: variacion(totalPeriodo, totalPrevio),
        pedidosPeriodo: delPeriodo.length,
        ticketPromedio: delPeriodo.length ? redondear(totalPeriodo / delPeriodo.length) : 0,
        devolucionesPeriodo: redondear(suma(devPeriodo, (d) => d.valor))
      };
      serieVentas = ventasPorDia(delPeriodo, listarDias(claveInicio, hoy), devPeriodo);
      topProductos = agruparPorProducto(delPeriodo, devPeriodo)
        .slice(0, 5)
        .map(({ producto, sku, nombre, unidades, ingresos }) => ({ producto, sku, nombre, unidades, ingresos }));
    }

    res.json({
      generadoEn: ahora,
      dias,
      kpis: {
        ...kpisVentas,
        ...cartera,
        pedidosPendientes: pendientes,
        pedidosProcesando: procesando,
        productosActivos: productos.length,
        unidadesEnStock: suma(productos, (p) => p.stock),
        productosEnAlerta: estadoInventario.agotado + estadoInventario.critico + estadoInventario.bajo,
        valorInventario: esAdmin
          ? {
              costo: redondear(suma(productos, (p) => p.stock * p.costo)),
              venta: redondear(suma(productos, (p) => p.stock * p.precio))
            }
          : null
      },
      estadoInventario,
      pedidosPorEstado: ESTADOS.map((estado, i) => ({ estado, cantidad: conteoEstados[i] })),
      ventasPorDia: serieVentas,
      topProductos,
      atencion
    });
  } catch (error) {
    responderError(res, error, 'Error al generar el dashboard');
  }
};

// ---------------------------------------------------------------------------
// GET /api/reportes/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
// ---------------------------------------------------------------------------
/**
 * Controlador ventas: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.ventas = async (req, res) => {
  try {
    const rango = rangoDesdeQuery(req.query);
    const duracion = rango.dias.length;

    // Periodo inmediatamente anterior, de la misma duración, para comparar.
    const claveHastaPrevio = sumarDias(rango.claveDesde, -1);
    const claveDesdePrevio = sumarDias(rango.claveDesde, -duracion);

    const [pedidos, previos, devoluciones, devolucionesPrevias] = await Promise.all([
      Pedido.find({ createdAt: { $gte: rango.desde, $lt: rango.hasta } })
        .sort({ createdAt: -1 })
        .select('cliente total estado createdAt items creadoPor descuentoPorcentaje')
        .populate('items.producto', 'nombre sku categoria costo')
        .populate('creadoPor', 'nombre')
        .lean(),
      Pedido.find({
        createdAt: { $gte: inicioDeDia(claveDesdePrevio), $lt: inicioDeDia(sumarDias(claveHastaPrevio, 1)) },
        estado: { $ne: 'cancelado' }
      })
        .select('total')
        .lean(),
      devolucionesEn(rango.desde, rango.hasta),
      devolucionesEn(inicioDeDia(claveDesdePrevio), inicioDeDia(sumarDias(claveHastaPrevio, 1)))
    ]);

    const ventas = pedidos.filter(esVenta);
    const cancelados = pedidos.filter((p) => !esVenta(p));
    const porProducto = agruparPorProducto(ventas, devoluciones);
    const ventasBrutas = suma(ventas, (p) => p.total);
    const valorDevuelto = suma(devoluciones, (d) => d.valor);
    // Ventas netas: lo vendido menos lo devuelto en el periodo.
    const totalVentas = ventasBrutas - valorDevuelto;
    const totalPrevio = suma(previos, (p) => p.total) - suma(devolucionesPrevias, (d) => d.valor);

    const vendedores = new Map();
    for (const p of ventas) {
      const nombre = p.creadoPor?.nombre ?? 'Sin asignar';
      const fila = vendedores.get(nombre) ?? { nombre, pedidos: 0, ventas: 0 };
      fila.pedidos += 1;
      fila.ventas += p.total;
      vendedores.set(nombre, fila);
    }

    res.json({
      rango: { desde: rango.claveDesde, hasta: rango.claveHasta, dias: duracion },
      resumen: {
        ventas: redondear(totalVentas),
        pedidos: ventas.length,
        ticketPromedio: ventas.length ? redondear(totalVentas / ventas.length) : 0,
        unidades: suma(ventas, unidadesDe) - suma(devoluciones, (d) => suma(d.items, (i) => i.cantidad)),
        ventasBrutas: redondear(ventasBrutas),
        devoluciones: redondear(valorDevuelto),
        devolucionesCantidad: devoluciones.length,
        cancelados: cancelados.length,
        margenEstimado: redondear(suma(porProducto, (f) => f.margen)),
        ventasPeriodoAnterior: redondear(totalPrevio),
        variacion: variacion(totalVentas, totalPrevio)
      },
      porDia: ventasPorDia(ventas, rango.dias, devoluciones),
      porEstado: ESTADOS.map((estado) => {
        const lista = pedidos.filter((p) => p.estado === estado);
        return { estado, cantidad: lista.length, total: redondear(suma(lista, (p) => p.total)) };
      }),
      porProducto,
      porVendedor: [...vendedores.values()]
        .map((v) => ({ ...v, ventas: redondear(v.ventas) }))
        .sort((a, b) => b.ventas - a.ventas),
      pedidos: pedidos.slice(0, LIMITE_FILAS).map((p) => ({
        _id: p._id,
        fecha: p.createdAt,
        cliente: p.cliente,
        estado: p.estado,
        unidades: unidadesDe(p),
        total: p.total,
        vendedor: p.creadoPor?.nombre ?? null
      })),
      truncado: pedidos.length > LIMITE_FILAS
    });
  } catch (error) {
    responderError(res, error, 'Error al generar el reporte de ventas');
  }
};

// ---------------------------------------------------------------------------
// GET /api/reportes/inventario
// ---------------------------------------------------------------------------
/**
 * Controlador inventario: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.inventario = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true })
      .populate('proveedor', 'nombre')
      .sort({ nombre: 1 })
      .lean();

    const porNivel = { agotado: 0, critico: 0, bajo: 0, saludable: 0 };
    const categorias = new Map();

    const filas = productos.map((p) => {
      const nivel = nivelStock(p.stock, p.stockMinimo);
      const valorCosto = redondear(p.stock * p.costo);
      const valorVenta = redondear(p.stock * p.precio);
      porNivel[nivel] += 1;

      const nombreCategoria = p.categoria || 'Sin categoría';
      const cat = categorias.get(nombreCategoria) ?? { categoria: nombreCategoria, productos: 0, unidades: 0, valorCosto: 0, valorVenta: 0 };
      cat.productos += 1;
      cat.unidades += p.stock;
      cat.valorCosto += valorCosto;
      cat.valorVenta += valorVenta;
      categorias.set(nombreCategoria, cat);

      return {
        _id: p._id,
        sku: p.sku,
        nombre: p.nombre,
        categoria: p.categoria || null,
        proveedor: p.proveedor?.nombre ?? null,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        nivel,
        costo: p.costo,
        precio: p.precio,
        valorCosto,
        valorVenta
      };
    });

    const valorCosto = suma(filas, (f) => f.valorCosto);
    const valorVenta = suma(filas, (f) => f.valorVenta);

    res.json({
      resumen: {
        productos: filas.length,
        unidades: suma(filas, (f) => f.stock),
        valorCosto: redondear(valorCosto),
        valorVenta: redondear(valorVenta),
        margenPotencial: redondear(valorVenta - valorCosto),
        porNivel
      },
      porCategoria: [...categorias.values()]
        .map((c) => ({ ...c, valorCosto: redondear(c.valorCosto), valorVenta: redondear(c.valorVenta) }))
        .sort((a, b) => b.valorCosto - a.valorCosto),
      productos: filas
    });
  } catch (error) {
    responderError(res, error, 'Error al generar el reporte de inventario');
  }
};

// ---------------------------------------------------------------------------
// GET /api/reportes/movimientos?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
// ---------------------------------------------------------------------------
/**
 * Controlador movimientos: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.movimientos = async (req, res) => {
  try {
    const rango = rangoDesdeQuery(req.query);

    const movimientos = await MovimientoInventario.find({ ...require('../middlewares/alcanceSucursal').filtro(req), createdAt: { $gte: rango.desde, $lt: rango.hasta } })
      .sort({ createdAt: -1 })
      .populate('producto', 'nombre sku')
      .populate('registradoPor', 'nombre')
      .lean();

    const entradas = movimientos.filter((m) => m.tipo === 'entrada');
    const salidas = movimientos.filter((m) => m.tipo === 'salida');

    const dias = new Map(rango.dias.map((fecha) => [fecha, { fecha, entradas: 0, salidas: 0 }]));
    const motivos = new Map();
    for (const m of movimientos) {
      const dia = dias.get(claveDia(m.createdAt));
      if (dia) dia[m.tipo === 'entrada' ? 'entradas' : 'salidas'] += m.cantidad;

      const nombre = m.motivo?.trim() || 'Sin motivo';
      const fila = motivos.get(nombre) ?? { motivo: nombre, movimientos: 0, entradas: 0, salidas: 0 };
      fila.movimientos += 1;
      fila[m.tipo === 'entrada' ? 'entradas' : 'salidas'] += m.cantidad;
      motivos.set(nombre, fila);
    }

    res.json({
      rango: { desde: rango.claveDesde, hasta: rango.claveHasta, dias: rango.dias.length },
      resumen: {
        movimientos: movimientos.length,
        unidadesEntrada: suma(entradas, (m) => m.cantidad),
        unidadesSalida: suma(salidas, (m) => m.cantidad),
        neto: suma(entradas, (m) => m.cantidad) - suma(salidas, (m) => m.cantidad)
      },
      porDia: [...dias.values()],
      porMotivo: [...motivos.values()].sort((a, b) => b.movimientos - a.movimientos),
      movimientos: movimientos.slice(0, LIMITE_FILAS).map((m) => ({
        _id: m._id,
        fecha: m.createdAt,
        sku: m.producto?.sku ?? '—',
        producto: m.producto?.nombre ?? 'Producto eliminado',
        tipo: m.tipo,
        cantidad: m.cantidad,
        motivo: m.motivo || null,
        registradoPor: m.registradoPor?.nombre ?? null
      })),
      truncado: movimientos.length > LIMITE_FILAS
    });
  } catch (error) {
    responderError(res, error, 'Error al generar el reporte de movimientos');
  }
};
