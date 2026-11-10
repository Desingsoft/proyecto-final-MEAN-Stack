/**
 * Archivo: cartera.js
 * Propósito: Utilidad compartida: encapsula funciones auxiliares.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Reglas de cartera (cuentas por cobrar y por pagar). Funciones puras: fáciles de probar.
const { MS_DIA, claveDia, inicioDeDia } = require('./fechas');

// Tramos de antigüedad de la deuda vencida.
const TRAMOS = [
  { clave: 'alDia', etiqueta: 'Al día' },
  { clave: 'd1_30', etiqueta: '1 a 30 días' },
  { clave: 'd31_60', etiqueta: '31 a 60 días' },
  { clave: 'd61_90', etiqueta: '61 a 90 días' },
  { clave: 'd90mas', etiqueta: 'Más de 90 días' }
];

const redondear = (n) => Math.round(n);

/** Días de mora: positivo = vencida hace N días; 0 o negativo = aún no vence. Se cuenta por días del negocio. */
const diasDeMora = (vencimiento, ahora = new Date()) => {
  if (!vencimiento) return 0;
  const hoy = inicioDeDia(claveDia(ahora));
  const vence = inicioDeDia(claveDia(new Date(vencimiento)));
  return Math.round((hoy - vence) / MS_DIA);
};

const tramoDeMora = (mora) =>
  mora <= 0 ? 'alDia' : mora <= 30 ? 'd1_30' : mora <= 60 ? 'd31_60' : mora <= 90 ? 'd61_90' : 'd90mas';

/**
 * Estado de cobro de una factura. Una nota crédito reduce lo que se debe (acreditado) y un reembolso
 * devuelve dinero al cliente (reembolsado), por lo que resta de lo pagado.
 */
const estadoPagoDe = (total, pagado, acreditado = 0, reembolsado = 0) => {
  const debido = total - acreditado;
  if (debido <= 0) return acreditado > 0 ? 'acreditada' : 'pagada';
  const neto = pagado - reembolsado;
  return neto <= 0 ? 'pendiente' : neto >= debido ? 'pagada' : 'parcial';
};

/**
 * Lo abonado de una factura. Las facturas emitidas antes de existir la cartera no tienen el dato:
 * si eran de contado se dan por pagadas; si eran a crédito, por pendientes.
 */
const pagadoDeFactura = (doc) => (doc.pagado !== undefined && doc.pagado !== null ? doc.pagado : doc.formaPago === 'contado' ? doc.total : 0);

// Lo que el cliente todavía debe: total - notas crédito - lo que ya pagó (más lo que se le reembolsó).
const posicionDeFactura = (doc) => doc.total - (doc.acreditado || 0) - pagadoDeFactura(doc) + (doc.reembolsado || 0);
const saldoDeFactura = (doc) => Math.max(posicionDeFactura(doc), 0);
/** Dinero que le debemos al cliente (pagó de más porque una nota crédito bajó el valor de su factura). */
const saldoAFavorDe = (doc) => Math.max(-posicionDeFactura(doc), 0);

/** Lo que se le debe a un proveedor por una orden: el valor de la mercancía ya recibida. */
const valorRecibido = (orden) => redondear(orden.items.reduce((s, i) => s + (i.cantidadRecibida || 0) * i.costoUnitario, 0));

const saldoDeOrden = (orden) => Math.max(valorRecibido(orden) - (orden.pagado || 0), 0);

/** Suma montos por tramo de antigüedad a partir de [{ saldo, mora }]. */
const antiguedad = (filas) => {
  const resultado = TRAMOS.map((t) => ({ ...t, monto: 0, cantidad: 0 }));
  for (const f of filas) {
    const tramo = resultado.find((t) => t.clave === tramoDeMora(f.mora));
    tramo.monto += f.saldo;
    tramo.cantidad += 1;
  }
  return resultado;
};

module.exports = {
  TRAMOS, redondear, diasDeMora, tramoDeMora, estadoPagoDe, pagadoDeFactura, saldoDeFactura, saldoAFavorDe, valorRecibido, saldoDeOrden, antiguedad
};
