/**
 * Archivo: documentos.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Cálculo de totales y armado de remisiones y facturas. Funciones puras: fáciles de probar.

/**
 * Totales de un documento. Los valores se redondean a pesos enteros.
 *  - descuento: porcentaje aplicado sobre el subtotal bruto.
 *  - Si los precios INCLUYEN IVA, el IVA se "desglosa" del valor neto (el total no cambia).
 *  - Si NO lo incluyen, el IVA se SUMA al valor neto.
 *  - Una remisión (conIva = false) no discrimina IVA.
 */
const calcularTotales = ({ subtotalBruto, descuentoPorcentaje = 0, ivaPorcentaje = 0, preciosIncluyenIva = true, conIva = true }) => {
  const descuentoValor = Math.round((subtotalBruto * descuentoPorcentaje) / 100);
  const neto = subtotalBruto - descuentoValor;

  if (!conIva || !ivaPorcentaje) return { descuentoValor, base: neto, ivaValor: 0, total: neto };

  if (preciosIncluyenIva) {
    const base = Math.round(neto / (1 + ivaPorcentaje / 100));
    return { descuentoValor, base, ivaValor: neto - base, total: neto };
  }
  const ivaValor = Math.round((neto * ivaPorcentaje) / 100);
  return { descuentoValor, base: neto, ivaValor, total: neto + ivaValor };
};

/** Distribuye importes redondeados por renglón sin perder un solo peso del total. */
const distribuir = (total, pesos) => {
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  if (!sumaPesos) return pesos.map(() => 0);
  const exactos = pesos.map((p) => total * p / sumaPesos);
  const partes = exactos.map(Math.floor);
  let faltan = total - partes.reduce((a, b) => a + b, 0);
  const orden = exactos.map((v, i) => ({ i, fraccion: v - partes[i] }))
    .sort((a, b) => b.fraccion - a.fraccion || a.i - b.i);
  for (let k = 0; k < faltan; k++) partes[orden[k].i]++;
  return partes;
};

/** Congela los valores fiscales de cada línea, conciliados exactamente con el documento. */
const distribuirFiscalPorLinea = (items, totales, ivaPorcentaje) => {
  const bruto = items.map((i) => i.subtotal);
  const descuentos = distribuir(totales.descuentoValor, bruto);
  const netos = bruto.map((v, i) => v - descuentos[i]);
  const bases = distribuir(totales.base, netos);
  const impuestos = distribuir(totales.ivaValor, netos);
  return items.map((item, i) => ({
    ...item, descuentoValor: descuentos[i], base: bases[i],
    ivaPorcentaje, ivaValor: impuestos[i], total: bases[i] + impuestos[i]
  }));
};

const NOTA_LEGAL =
  'Documento generado por Inventario PYME. No sustituye la factura electrónica de venta exigida por la DIAN.';

/** Arma los datos de un documento a partir de un pedido (con items.producto poblado). */
const construirDocumento = ({ tipo, pedido, cliente, config, formaPago = 'contado', diasCredito, notas = '', ivaPorcentaje }) => {
  const items = pedido.items.map((i) => ({
    sku: i.producto?.sku ?? '',
    descripcion: i.producto?.nombre ?? 'Producto eliminado',
    cantidad: i.cantidad,
    precioUnitario: i.precioUnitario,
    subtotal: i.cantidad * i.precioUnitario
  }));
  const subtotalBruto = items.reduce((s, i) => s + i.subtotal, 0);
  const esFactura = tipo === 'factura';
  const iva = esFactura ? (ivaPorcentaje ?? config.ivaPorcentaje ?? 0) : 0;
  const descuentoPorcentaje = pedido.descuentoPorcentaje || 0;

  const totales = calcularTotales({
    subtotalBruto,
    descuentoPorcentaje,
    ivaPorcentaje: iva,
    preciosIncluyenIva: config.preciosIncluyenIva !== false,
    conIva: esFactura
  });

  let fechaVencimiento;
  if (esFactura && formaPago === 'credito') {
    fechaVencimiento = new Date(Date.now() + (diasCredito ?? config.diasCreditoDefecto ?? 30) * 86400000);
  }

  return {
    tipo,
    pedido: pedido._id,
    clienteRef: cliente?._id,
    empresa: {
      nombreEmpresa: config.nombreEmpresa, nit: config.nit, direccion: config.direccion,
      ciudad: config.ciudad, telefono: config.telefono, email: config.email
    },
    cliente: cliente
      ? {
          nombre: cliente.nombre, tipoDocumento: cliente.tipoDocumento, documento: cliente.documento,
          direccion: cliente.direccion, ciudad: cliente.ciudad, telefono: cliente.telefono, email: cliente.email
        }
      : { nombre: pedido.cliente },
    items: distribuirFiscalPorLinea(items, totales, iva),
    subtotalBruto,
    descuentoPorcentaje,
    ...totales,
    ivaPorcentaje: iva,
    preciosIncluyenIva: config.preciosIncluyenIva !== false,
    formaPago: esFactura ? formaPago : 'contado',
    fechaVencimiento,
    notas,
    notaLegal: [config.notaFactura, NOTA_LEGAL].filter(Boolean).join(' ')
  };
};

module.exports = { calcularTotales, construirDocumento, distribuirFiscalPorLinea, NOTA_LEGAL };
