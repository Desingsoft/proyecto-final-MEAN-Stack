/**
 * Archivo: seedDemo.js
 * Propósito: Script administrativo: ejecución manual; revisar su efecto antes de utilizarlo.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
/**
 * Datos de demostración para ver el dashboard y los reportes con información.
 *
 *   npm run seed:demo             -> crea proveedores, productos, pedidos y movimientos de ejemplo
 *   npm run seed:demo -- --limpiar -> elimina SOLO los datos de demostración (SKU "DEMO-...")
 *
 * Por seguridad, si ya existen productos que no son de demostración, no hace nada.
 * Los pedidos se asignan al primer usuario administrador (crea uno antes con crearAdmin.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const Proveedor = require('../models/Proveedor');
const Pedido = require('../models/Pedido');
const MovimientoInventario = require('../models/MovimientoInventario');
const Usuario = require('../models/Usuario');
const Cliente = require('../models/Cliente');
const OrdenCompra = require('../models/OrdenCompra');
const Documento = require('../models/Documento');
const Configuracion = require('../models/Configuracion');
const Pago = require('../models/Pago');
const Devolucion = require('../models/Devolucion');
const { Contador, formatear } = require('../utils/consecutivos');
const { construirDocumento, calcularTotales, NOTA_LEGAL } = require('../utils/documentos');
const { estadoPagoDe } = require('../utils/cartera');

const OFFSET_HORAS = Number(process.env.ZONA_OFFSET_HORAS ?? -5);
const MS_DIA = 24 * 3600000;

// Generador pseudoaleatorio con semilla: siempre produce los mismos datos.
const crearAleatorio = (semilla) => () => {
  semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const azar = crearAleatorio(2026);
const entre = (min, max) => Math.floor(azar() * (max - min + 1)) + min;
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

const PROVEEDORES = [
  { nombre: 'Distribuidora Andina', contacto: 'Marcela Ortiz', telefono: '601 555 0142', email: 'ventas@andina.demo.local' },
  { nombre: 'TecnoSuministros SAS', contacto: 'Julián Prieto', telefono: '604 555 0178', email: 'pedidos@tecnosuministros.demo.local' },
  { nombre: 'Papelería Mayorista del Valle', contacto: 'Diana Herrera', telefono: '602 555 0116', email: 'contacto@papeleriavalle.demo.local' }
];

// [sku, nombre, categoría, proveedor(índice), costo, precio, stock final, stock mínimo]
const PRODUCTOS = [
  ['DEMO-001', 'Resma papel carta 500 hojas', 'Papelería', 2, 11800, 16500, 64, 20],
  ['DEMO-002', 'Cuaderno cuadriculado 100 hojas', 'Papelería', 2, 3200, 5500, 8, 25],
  ['DEMO-003', 'Bolígrafo azul caja x12', 'Papelería', 2, 6400, 9800, 41, 15],
  ['DEMO-004', 'Marcadores permanentes x4', 'Papelería', 2, 7900, 12900, 3, 12],
  ['DEMO-005', 'Carpeta archivadora oficio', 'Papelería', 2, 4800, 7900, 52, 18],
  ['DEMO-006', 'Notas adhesivas pack x6', 'Papelería', 2, 5200, 8700, 0, 15],
  ['DEMO-007', 'Cinta de embalaje transparente', 'Empaque', 0, 2900, 4800, 76, 30],
  ['DEMO-008', 'Caja de cartón mediana x10', 'Empaque', 0, 14500, 21000, 18, 10],
  ['DEMO-009', 'Bolsa de burbuja rollo 50 m', 'Empaque', 0, 22000, 33500, 5, 8],
  ['DEMO-010', 'Mouse inalámbrico', 'Tecnología', 1, 24000, 39900, 33, 12],
  ['DEMO-011', 'Teclado USB español', 'Tecnología', 1, 31000, 49900, 6, 10],
  ['DEMO-012', 'Memoria USB 64 GB', 'Tecnología', 1, 18500, 29900, 47, 15],
  ['DEMO-013', 'Cable HDMI 2 m', 'Tecnología', 1, 9800, 17900, 2, 10],
  ['DEMO-014', 'Audífonos con diadema', 'Tecnología', 1, 42000, 69900, 21, 8],
  ['DEMO-015', 'Tóner compatible 105A', 'Tecnología', 1, 58000, 89000, 4, 6],
  ['DEMO-016', 'Silla ergonómica de oficina', 'Mobiliario', 0, 185000, 289000, 9, 4],
  ['DEMO-017', 'Lámpara LED de escritorio', 'Mobiliario', 0, 26000, 42900, 15, 6],
  ['DEMO-018', 'Archivador metálico 3 gavetas', 'Mobiliario', 0, 220000, 349000, 2, 3],
  ['DEMO-019', 'Calculadora científica', 'Papelería', 2, 38000, 59900, 27, 8],
  ['DEMO-020', 'Grapadora metálica', 'Papelería', 2, 8500, 14900, 36, 10],
  ['DEMO-021', 'Pizarra blanca 60x90 cm', 'Mobiliario', 0, 47000, 76000, 7, 5],
  ['DEMO-022', 'Regleta con protección 6 tomas', 'Tecnología', 1, 21000, 34900, 24, 8]
];

const CLIENTES = [
  ['Colegio San José', 'NIT', '800.123.456-1', 'Bogotá', 'Calle 80 # 20-15'],
  ['Ferretería El Tornillo', 'NIT', '900.234.567-2', 'Medellín', 'Carrera 50 # 30-12'],
  ['Oficinas Andina SAS', 'NIT', '901.345.678-3', 'Bogotá', 'Av. El Dorado # 68-40'],
  ['Consultorio Dental Sonrisa', 'NIT', '900.456.789-4', 'Cali', 'Calle 5 # 38-20'],
  ['Cafetería La Esquina', 'NIT', '901.567.890-5', 'Bogotá', 'Carrera 13 # 63-07'],
  ['Estudio Contable Rojas', 'NIT', '900.678.901-6', 'Bogotá', 'Calle 100 # 15-33'],
  ['Constructora Altavista', 'NIT', '800.789.012-7', 'Medellín', 'Calle 10 # 43-50'],
  ['Academia de Idiomas Horizonte', 'NIT', '901.890.123-8', 'Barranquilla', 'Carrera 53 # 75-20'],
  ['Clínica Veterinaria Patitas', 'NIT', '900.901.234-9', 'Bogotá', 'Calle 127 # 7-45'],
  ['Droguería Salud Total', 'NIT', '800.012.345-0', 'Cali', 'Av. 6N # 25-18'],
  ['Agencia de Viajes Brújula', 'NIT', '901.123.456-4', 'Bogotá', 'Carrera 11 # 82-01'],
  ['María Fernanda Quintero', 'CC', '52.345.678', 'Bogotá', 'Calle 45 # 22-10']
];

const limpiar = async () => {
  const demo = await Producto.find({ sku: /^DEMO-/ }).select('_id').lean();
  const ids = demo.map((p) => p._id);
  const idsPedidosDemo = (await Pedido.find({ 'items.producto': { $in: ids } }).select('_id').lean()).map((p) => p._id);
  const pedidos = await Pedido.deleteMany({ 'items.producto': { $in: ids } });
  const movs = await MovimientoInventario.deleteMany({ producto: { $in: ids } });
  const prods = await Producto.deleteMany({ sku: /^DEMO-/ });
  const provs = await Proveedor.deleteMany({ email: /demo\.local$/ });
  const docsDemo = (await Documento.find({ pedido: { $in: idsPedidosDemo } }).select('_id').lean()).map((d) => d._id);
  const ordenesDemo = (await OrdenCompra.find({ 'items.producto': { $in: ids } }).select('_id').lean()).map((o) => o._id);
  const devoluciones = await Devolucion.deleteMany({ pedido: { $in: idsPedidosDemo } });
  const pagos = await Pago.deleteMany({ $or: [{ documento: { $in: docsDemo } }, { orden: { $in: ordenesDemo } }] });
  const documentos = await Documento.deleteMany({ pedido: { $in: idsPedidosDemo } });
  const ordenes = await OrdenCompra.deleteMany({ 'items.producto': { $in: ids } });
  const clientes = await Cliente.deleteMany({ email: /demo\.local$/ });
  // Si ya no quedan documentos u órdenes, los consecutivos vuelven a empezar.
  if ((await Documento.countDocuments()) === 0) await Contador.deleteMany({ _id: { $in: ['factura', 'remision'] } });
  if ((await OrdenCompra.countDocuments()) === 0) await Contador.deleteMany({ _id: 'ordenCompra' });
  if ((await Devolucion.countDocuments()) === 0) await Contador.deleteMany({ _id: { $in: ['devolucion', 'notaCredito'] } });
  if ((await Pago.countDocuments({ tipo: 'cobro' })) === 0) await Contador.deleteMany({ _id: 'recibo' });
  if ((await Pago.countDocuments({ tipo: 'egreso' })) === 0) await Contador.deleteMany({ _id: 'egreso' });
  console.log(`  También se eliminaron ${clientes.deletedCount} clientes, ${documentos.deletedCount} documentos, ${devoluciones.deletedCount} devoluciones, ${pagos.deletedCount} pagos y ${ordenes.deletedCount} órdenes de compra.`);
  console.log(`Datos de demostración eliminados: ${prods.deletedCount} productos, ${pedidos.deletedCount} pedidos, ${movs.deletedCount} movimientos, ${provs.deletedCount} proveedores.`);
};

const crear = async () => {
  const admin = await Usuario.findOne({ role: 'admin' });
  if (!admin) throw new Error('No hay ningún usuario administrador. Crea uno primero con crearAdmin.js.');

  const reales = await Producto.countDocuments({ sku: { $not: /^DEMO-/ } });
  if (reales > 0) throw new Error('Ya tienes productos propios. Para no mezclar datos, el seed de demostración no se ejecuta.');
  if ((await Producto.countDocuments({ sku: /^DEMO-/ })) > 0) {
    throw new Error('Los datos de demostración ya existen. Usa "npm run seed:demo -- --limpiar" para borrarlos y volver a crearlos.');
  }

  const proveedores = await Proveedor.insertMany(PROVEEDORES);
  const productos = await Producto.insertMany(
    PRODUCTOS.map(([sku, nombre, categoria, prov, costo, precio, stock, stockMinimo]) => ({
      sku, nombre, categoria, costo, precio, stock, stockMinimo, proveedor: proveedores[prov]._id
    }))
  );

  const clientes = await Cliente.insertMany(
    CLIENTES.map(([nombre, tipoDocumento, documento, ciudad, direccion], i) => ({
      nombre, tipoDocumento, documento, ciudad, direccion,
      // Algunos clientes tienen plazo propio y un cupo de crédito.
      diasCredito: [30, 15, 45][i % 3],
      cupoCredito: i % 4 === 0 ? 6000000 : 0,
      email: `compras${i + 1}@demo.local`,
      telefono: `60${entre(1, 8)} 555 ${String(entre(100, 999))}${entre(0, 9)}`
    }))
  );

  // Pedidos de los últimos 45 días: más movimiento entre semana y una tendencia creciente.
  const ahora = Date.now();
  const pedidos = [];
  const movimientos = [];
  for (let atras = 45; atras >= 0; atras--) {
    const base = ahora - atras * MS_DIA;
    const diaSemana = new Date(base + OFFSET_HORAS * 3600000).getUTCDay(); // 0 = domingo
    if (diaSemana === 0 && azar() < 0.8) continue;
    const cantidadPedidos = Math.max(0, Math.round((diaSemana === 6 ? 1 : 2) + azar() * 2.2 + (45 - atras) / 25 - 0.7));

    for (let n = 0; n < cantidadPedidos; n++) {
      const hora = entre(9, 17);
      const fecha = new Date(base - ((new Date(base).getUTCHours() - ((hora - OFFSET_HORAS) % 24) + 24) % 24) * 3600000 - entre(0, 59) * 60000);
      if (fecha.getTime() > ahora) continue;

      const lineas = [];
      const elegidos = new Set();
      for (let i = 0; i < entre(1, 4); i++) {
        const producto = elegir(productos);
        if (elegidos.has(String(producto._id))) continue;
        elegidos.add(String(producto._id));
        const cantidad = producto.precio > 150000 ? entre(1, 2) : entre(1, 9);
        lineas.push({ producto: producto._id, cantidad, precioUnitario: producto.precio });
      }

      let estado;
      if (atras > 6) estado = azar() < 0.07 ? 'cancelado' : 'completado';
      else if (atras > 2) estado = elegir(['completado', 'completado', 'enviado', 'procesando']);
      else estado = elegir(['pendiente', 'pendiente', 'procesando', 'enviado']);

      const pedidoId = new mongoose.Types.ObjectId();
      const clientePedido = elegir(clientes);
      const subtotal = lineas.reduce((s, l) => s + l.cantidad * l.precioUnitario, 0);
      const descuentoPorcentaje = azar() < 0.2 ? elegir([5, 10]) : 0;
      pedidos.push({
        _id: pedidoId,
        cliente: clientePedido.nombre,
        clienteRef: clientePedido._id,
        items: lineas,
        subtotal,
        descuentoPorcentaje,
        total: subtotal - Math.round((subtotal * descuentoPorcentaje) / 100),
        estado,
        creadoPor: admin._id,
        createdAt: fecha,
        updatedAt: fecha,
        __v: 0
      });
      for (const l of lineas) {
        movimientos.push({
          producto: l.producto, tipo: 'salida', cantidad: l.cantidad, motivo: 'venta',
          registradoPor: admin._id, createdAt: fecha, updatedAt: fecha, __v: 0
        });
        if (estado === 'cancelado') {
          movimientos.push({
            producto: l.producto, tipo: 'entrada', cantidad: l.cantidad, motivo: 'devolución',
            registradoPor: admin._id, createdAt: new Date(fecha.getTime() + 3600000), updatedAt: fecha, __v: 0
          });
        }
      }
    }
  }

  // Compras a proveedores a lo largo del periodo.
  for (const producto of productos) {
    for (let i = 0; i < entre(1, 3); i++) {
      const fecha = new Date(ahora - entre(3, 44) * MS_DIA);
      movimientos.push({
        producto: producto._id, tipo: 'entrada', cantidad: entre(10, 60), motivo: 'compra',
        registradoPor: admin._id, createdAt: fecha, updatedAt: fecha, __v: 0
      });
    }
  }

  // Configuración de la empresa (solo si todavía no existe).
  if (!(await Configuracion.findById('general'))) {
    await Configuracion.create({
      nombreEmpresa: 'Papelería y Tecnología Demo S.A.S.', nit: '900.555.123-1', direccion: 'Carrera 15 # 85-20',
      ciudad: 'Bogotá', telefono: '601 555 0100', email: 'ventas@demo.local'
    });
  }
  const config = { ...new Configuracion().toObject(), ...((await Configuracion.findById('general').lean()) || {}) };

  // Facturas y remisiones de los pedidos ya entregados (en orden cronológico, con su consecutivo).
  const porId = new Map(productos.map((p) => [String(p._id), p]));
  const clientePorId = new Map(clientes.map((c) => [String(c._id), c.toObject()]));
  const documentos = [];
  const pagosDemo = [];
  let seqRecibo = 0;
  let seqEgreso = 0;
  let seqFactura = 0;
  let seqRemision = 0;
  for (const pedido of pedidos) {
    if (!['completado', 'enviado'].includes(pedido.estado)) continue;
    const poblado = {
      ...pedido,
      items: pedido.items.map((i) => ({ ...i, producto: porId.get(String(i.producto)) }))
    };
    const tipos = [];
    if (azar() < 0.7) tipos.push('factura');
    if (pedido.estado === 'completado' ? azar() < 0.35 : true) tipos.push('remision');
    for (const tipo of tipos) {
      const credito = tipo === 'factura' && azar() < 0.35;
      const datos = construirDocumento({
        tipo, pedido: poblado, cliente: clientePorId.get(String(pedido.clienteRef)), config,
        formaPago: credito ? 'credito' : 'contado', diasCredito: 30
      });
      const fecha = new Date(pedido.createdAt.getTime() + 3600000);
      const consecutivo = tipo === 'factura' ? ++seqFactura : ++seqRemision;
      const docId = new mongoose.Types.ObjectId();
      const numeroDoc = formatear(tipo === 'factura' ? config.prefijoFactura : config.prefijoRemision, consecutivo);

      // Cartera: lo contado se pagó al emitir; lo a crédito está pagado, abonado en parte o pendiente.
      let pagado = 0;
      if (tipo === 'factura') {
        const abonar = (monto, desdeFecha, dias) => {
          const cuando = new Date(Math.min(desdeFecha.getTime() + dias * MS_DIA, ahora));
          pagosDemo.push({
            tipo: 'cobro', numero: formatear(config.prefijoRecibo, ++seqRecibo), documento: docId, clienteRef: pedido.clienteRef,
            contraparte: datos.cliente.nombre, referenciaDocumento: numeroDoc, monto, fecha: cuando,
            metodo: elegir(['efectivo', 'transferencia', 'transferencia', 'tarjeta']), referencia: '', nota: credito ? '' : 'Pago de contado',
            estado: 'vigente', registradoPor: admin._id, createdAt: cuando, updatedAt: cuando, __v: 0
          });
          pagado += monto;
        };
        if (!credito) abonar(datos.total, fecha, 0);
        else {
          const r = azar();
          if (r < 0.4) abonar(datos.total, fecha, entre(5, 28));
          else if (r < 0.65) abonar(Math.round(datos.total * (0.3 + azar() * 0.4)), fecha, entre(5, 20));
        }
      }
      documentos.push({
        _id: docId,
        ...(tipo === 'factura' ? { pagado, estadoPago: pagado <= 0 ? 'pendiente' : pagado >= datos.total ? 'pagada' : 'parcial' } : {}),
        ...datos,
        numero: numeroDoc,
        consecutivo,
        fechaVencimiento: credito ? new Date(fecha.getTime() + 30 * MS_DIA) : undefined,
        estado: 'emitida',
        emitidoPor: admin._id,
        createdAt: fecha, updatedAt: fecha, __v: 0
      });
    }
  }

  // Devoluciones de algunos pedidos ya entregados, con su nota crédito.
  const pedidoPorId = new Map(pedidos.map((p) => [String(p._id), p]));
  const devolucionesDemo = [];
  let seqDev = 0;
  let seqNC = 0;
  const candidatas = documentos.filter((d) => d.tipo === 'factura' && pedidoPorId.get(String(d.pedido))?.estado === 'completado');
  candidatas.filter((_, i) => i % 7 === 3).slice(0, 6).forEach((fac) => {
    const pedido = pedidoPorId.get(String(fac.pedido));
    const linea = pedido.items[0];
    const prod = porId.get(String(linea.producto));
    const cantidad = Math.max(1, Math.min(linea.cantidad, entre(1, 2)));
    const reintegrar = azar() < 0.7;
    const motivo = elegir(['defectuoso', 'error_pedido', 'no_deseado', 'garantia']);
    const subtotalBruto = cantidad * linea.precioUnitario;
    const descuentoPorcentaje = pedido.descuentoPorcentaje || 0;
    const t = calcularTotales({ subtotalBruto, descuentoPorcentaje, ivaPorcentaje: fac.ivaPorcentaje, preciosIncluyenIva: fac.preciosIncluyenIva, conIva: true });
    const valor = Math.min(t.total, fac.total);
    const fecha = new Date(Math.min(fac.createdAt.getTime() + entre(1, 4) * MS_DIA, ahora));
    const devId = new mongoose.Types.ObjectId();
    const ncId = new mongoose.Types.ObjectId();
    const numeroDev = formatear(config.prefijoDevolucion, ++seqDev);
    const itemsDev = [{ producto: linea.producto, sku: prod.sku, descripcion: prod.nombre, cantidad, precioUnitario: linea.precioUnitario, reintegrar }];

    devolucionesDemo.push({
      _id: devId, numero: numeroDev, pedido: pedido._id, clienteRef: pedido.clienteRef, cliente: pedido.cliente, items: itemsDev, motivo, nota: '',
      subtotalBruto, descuentoPorcentaje, valor, notaCredito: ncId, estado: 'vigente', registradoPor: admin._id, createdAt: fecha, updatedAt: fecha, __v: 0
    });
    documentos.push({
      _id: ncId, tipo: 'nota_credito', numero: formatear(config.prefijoNotaCredito, ++seqNC), consecutivo: seqNC, pedido: pedido._id, clienteRef: pedido.clienteRef,
      empresa: fac.empresa, cliente: fac.cliente,
      items: itemsDev.map((i) => ({ sku: i.sku, descripcion: i.descripcion, cantidad: i.cantidad, precioUnitario: i.precioUnitario, subtotal: i.cantidad * i.precioUnitario })),
      subtotalBruto, descuentoPorcentaje, descuentoValor: t.descuentoValor, base: t.base, ivaPorcentaje: fac.ivaPorcentaje, ivaValor: t.ivaValor, total: valor,
      preciosIncluyenIva: fac.preciosIncluyenIva, formaPago: 'contado', notas: '', notaLegal: NOTA_LEGAL, estado: 'emitida', facturaOrigen: fac._id, numeroOrigen: fac.numero,
      devolucion: devId, motivoDevolucion: motivo, emitidoPor: admin._id, createdAt: fecha, updatedAt: fecha, __v: 0
    });
    fac.acreditado = valor;
    fac.estadoPago = estadoPagoDe(fac.total, fac.pagado ?? 0, valor, 0);
    if (reintegrar) {
      movimientos.push({ producto: linea.producto, tipo: 'entrada', cantidad, motivo: `devolución ${numeroDev}`, registradoPor: admin._id, createdAt: fecha, updatedAt: fecha, __v: 0 });
    }
  });

  // Órdenes de compra en distintos estados.
  const porProveedor = proveedores.map((prov) => ({ prov, productos: productos.filter((p) => String(p.proveedor) === String(prov._id)) }));
  const ordenes = [];
  const ordenIdPagos = [];
  const estadosOrden = ['recibida', 'recibida', 'parcial', 'enviada', 'borrador'];
  estadosOrden.forEach((estado, i) => {
    const { prov, productos: lista } = porProveedor[i % porProveedor.length];
    const items = lista.slice(0, entre(2, 3)).map((p) => {
      const cantidad = entre(10, 40);
      const recibida = estado === 'recibida' ? cantidad : estado === 'parcial' ? Math.floor(cantidad / 2) : 0;
      return { producto: p._id, cantidad, cantidadRecibida: recibida, costoUnitario: p.costo };
    });
    const creada = new Date(ahora - (estado === 'recibida' ? entre(20, 35) : estado === 'parcial' ? 8 : estado === 'enviada' ? 3 : 1) * MS_DIA);
    const numero = formatear(config.prefijoOrdenCompra, i + 1);
    const recepciones = estado === 'recibida' || estado === 'parcial'
      ? [{ fecha: new Date(creada.getTime() + 4 * MS_DIA), usuario: admin._id, nota: estado === 'parcial' ? 'Primera entrega' : '', items: items.filter((it) => it.cantidadRecibida > 0).map((it) => ({ producto: it.producto, cantidad: it.cantidadRecibida })) }]
      : [];
    for (const r of recepciones) {
      for (const it of r.items) {
        movimientos.push({ producto: it.producto, tipo: 'entrada', cantidad: it.cantidad, motivo: `compra ${numero}`, registradoPor: admin._id, createdAt: r.fecha, updatedAt: r.fecha, __v: 0 });
      }
    }
    // Pagos a proveedores: la primera orden recibida se pagó completa; la segunda, en parte.
    const valor = Math.round(items.reduce((s, it) => s + it.cantidadRecibida * it.costoUnitario, 0));
    let pagadoOrden = 0;
    if (estado === 'recibida' || estado === 'parcial') {
      const monto = i === 0 ? valor : i === 1 ? Math.round(valor * 0.5) : 0;
      if (monto > 0) {
        const fechaPago = new Date(creada.getTime() + 8 * MS_DIA);
        pagadoOrden = monto;
        ordenIdPagos.push({ numero, monto, fechaPago, proveedor: prov });
      }
    }
    ordenes.push({
      numero, proveedor: prov._id, items,
      pagado: pagadoOrden,
      fechaVencimientoPago: new Date(creada.getTime() + (4 + (prov.diasCredito ?? 30)) * MS_DIA),
      total: Math.round(items.reduce((s, it) => s + it.cantidad * it.costoUnitario, 0)),
      estado, notas: i === 3 ? 'Entregar en la bodega principal' : '',
      fechaEsperada: estado === 'enviada' ? new Date(ahora + 3 * MS_DIA) : undefined,
      enviadaEn: estado === 'borrador' ? undefined : creada,
      recepciones, creadoPor: admin._id, createdAt: creada, updatedAt: creada, __v: 0
    });
  });

  await Pedido.collection.insertMany(pedidos);
  await MovimientoInventario.collection.insertMany(movimientos);
  if (documentos.length) await Documento.collection.insertMany(documentos);
  if (devolucionesDemo.length) await Devolucion.collection.insertMany(devolucionesDemo);
  const insertadas = await OrdenCompra.collection.insertMany(ordenes);
  const egresos = ordenIdPagos.map((o) => {
    const orden = ordenes.find((x) => x.numero === o.numero);
    return {
      tipo: 'egreso', numero: formatear(config.prefijoEgreso, ++seqEgreso), orden: orden._id ?? insertadas.insertedIds[ordenes.indexOf(orden)],
      proveedor: o.proveedor._id, contraparte: o.proveedor.nombre, referenciaDocumento: o.numero, monto: o.monto, fecha: o.fechaPago,
      metodo: 'transferencia', referencia: '', nota: '', estado: 'vigente', registradoPor: admin._id, createdAt: o.fechaPago, updatedAt: o.fechaPago, __v: 0
    };
  });
  if (pagosDemo.length || egresos.length) await Pago.collection.insertMany([...pagosDemo, ...egresos]);
  await Contador.findOneAndUpdate({ _id: 'devolucion' }, { $set: { seq: seqDev } }, { upsert: true });
  await Contador.findOneAndUpdate({ _id: 'notaCredito' }, { $set: { seq: seqNC } }, { upsert: true });
  await Contador.findOneAndUpdate({ _id: 'recibo' }, { $set: { seq: seqRecibo } }, { upsert: true });
  await Contador.findOneAndUpdate({ _id: 'egreso' }, { $set: { seq: seqEgreso } }, { upsert: true });
  await Contador.findOneAndUpdate({ _id: 'factura' }, { $set: { seq: seqFactura } }, { upsert: true });
  await Contador.findOneAndUpdate({ _id: 'remision' }, { $set: { seq: seqRemision } }, { upsert: true });
  await Contador.findOneAndUpdate({ _id: 'ordenCompra' }, { $set: { seq: ordenes.length } }, { upsert: true });
  console.log(`Datos de demostración creados: ${proveedores.length} proveedores, ${productos.length} productos, ${clientes.length} clientes, ${pedidos.length} pedidos, ${documentos.length} facturas y remisiones, ${devolucionesDemo.length} devoluciones, ${pagosDemo.length + egresos.length} pagos, ${ordenes.length} órdenes de compra y ${movimientos.length} movimientos.`);
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    if (process.argv.includes('--limpiar')) await limpiar();
    else await crear();
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
