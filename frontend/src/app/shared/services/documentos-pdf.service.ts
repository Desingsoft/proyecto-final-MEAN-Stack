/**
 * Archivo: documentos-pdf.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { LOCALE, MONEDA } from '../../core/config/formato';
import { Configuracion, DocumentoVenta, EstadoCuenta, ETIQUETA_METODO, OrdenCompra, Pago } from '../../core/models/negocio.model';

const dinero = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: MONEDA, maximumFractionDigits: 0 });
const fecha = (valor?: string | Date) =>
  valor ? new Date(valor).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const TINTA: [number, number, number] = [16, 41, 44];
const PRIMARIO: [number, number, number] = [11, 122, 117];
const GRIS: [number, number, number] = [241, 244, 242];

interface Documento {
  titulo: string;           // FACTURA DE VENTA, REMISIÓN, ORDEN DE COMPRA
  numero: string;
  emisor: { nombre: string; lineas: string[] };
  receptorTitulo: string;   // Cliente / Proveedor
  receptor: { nombre: string; lineas: string[] };
  datos: { etiqueta: string; valor: string }[];
  columnas: { encabezado: string; alinear: 'left' | 'right'; peso: number }[];
  filas: string[][];
  totales: { etiqueta: string; valor: string; fuerte?: boolean }[];
  notas?: string;
  pie?: string;
  anulado?: string;         // si está anulado, motivo
  archivo: string;
}

/** Genera los PDF de facturas, remisiones y órdenes de compra. jsPDF se descarga solo al usarlo. */
@Injectable({ providedIn: 'root' })
export class DocumentosPdfService {
  async documentoVenta(d: DocumentoVenta): Promise<void> {
    const esFactura = d.tipo === 'factura';
    const esNota = d.tipo === 'nota_credito';
    const lineasEmpresa = [d.empresa.nit && `NIT ${d.empresa.nit}`, [d.empresa.direccion, d.empresa.ciudad].filter(Boolean).join(', '), [d.empresa.telefono, d.empresa.email].filter(Boolean).join('  |  ')].filter(Boolean) as string[];
    const lineasCliente = [
      d.cliente.documento && `${d.cliente.tipoDocumento ?? 'Doc.'} ${d.cliente.documento}`,
      [d.cliente.direccion, d.cliente.ciudad].filter(Boolean).join(', '),
      [d.cliente.telefono, d.cliente.email].filter(Boolean).join('  |  ')
    ].filter(Boolean) as string[];

    const totales: Documento['totales'] = [{ etiqueta: 'Subtotal', valor: dinero.format(d.subtotalBruto) }];
    if (d.descuentoValor > 0) totales.push({ etiqueta: `Descuento (${d.descuentoPorcentaje} %)`, valor: `- ${dinero.format(d.descuentoValor)}` });
    if ((esFactura || esNota) && d.ivaPorcentaje > 0) {
      totales.push({ etiqueta: 'Base gravable', valor: dinero.format(d.base) });
      totales.push({ etiqueta: `IVA (${d.ivaPorcentaje} %)${d.preciosIncluyenIva ? ' incluido' : ''}`, valor: dinero.format(d.ivaValor) });
    }
    totales.push({ etiqueta: esNota ? 'TOTAL ACREDITADO' : 'TOTAL', valor: dinero.format(d.total), fuerte: true });

    const datos = [
      { etiqueta: 'Fecha de emisión', valor: fecha(d.createdAt) },
      ...(esNota ? [{ etiqueta: 'Factura afectada', valor: d.numeroOrigen ?? '-' }] : []),
      ...(esFactura ? [{ etiqueta: 'Forma de pago', valor: d.formaPago === 'credito' ? 'Crédito' : 'Contado' }] : []),
      ...(d.fechaVencimiento ? [{ etiqueta: 'Vence', valor: fecha(d.fechaVencimiento) }] : [])
    ];

    await this.generar({
      titulo: esFactura ? 'FACTURA DE VENTA' : esNota ? 'NOTA CRÉDITO' : 'REMISIÓN',
      numero: d.numero,
      emisor: { nombre: d.empresa.nombreEmpresa, lineas: lineasEmpresa },
      receptorTitulo: 'Cliente',
      receptor: { nombre: d.cliente.nombre, lineas: lineasCliente },
      datos,
      columnas: [
        { encabezado: 'Código', alinear: 'left', peso: 1.4 }, { encabezado: 'Descripción', alinear: 'left', peso: 4 },
        { encabezado: 'Cant.', alinear: 'right', peso: 0.9 }, { encabezado: 'Precio unit.', alinear: 'right', peso: 1.7 }, { encabezado: 'Subtotal', alinear: 'right', peso: 1.7 }
      ],
      filas: d.items.map((i) => [i.sku, i.descripcion, String(i.cantidad), dinero.format(i.precioUnitario), dinero.format(i.subtotal)]),
      totales,
      notas: d.notas,
      pie: d.notaLegal,
      anulado: d.estado === 'anulada' ? d.motivoAnulacion || 'Documento anulado' : undefined,
      archivo: d.numero
    });
  }

  async ordenCompra(o: OrdenCompra, config: Configuracion | null): Promise<void> {
    const nombreProducto = (p: any) => (typeof p === 'string' ? p : p.nombre);
    const skuProducto = (p: any) => (typeof p === 'string' ? '' : p.sku);
    await this.generar({
      titulo: 'ORDEN DE COMPRA',
      numero: o.numero,
      emisor: {
        nombre: config?.nombreEmpresa ?? 'Mi Empresa',
        lineas: [config?.nit && `NIT ${config.nit}`, [config?.direccion, config?.ciudad].filter(Boolean).join(', '), [config?.telefono, config?.email].filter(Boolean).join('  |  ')].filter(Boolean) as string[]
      },
      receptorTitulo: 'Proveedor',
      receptor: { nombre: o.proveedor.nombre, lineas: [o.proveedor.contacto && `Atención: ${o.proveedor.contacto}`, [o.proveedor.telefono, o.proveedor.email].filter(Boolean).join('  |  ')].filter(Boolean) as string[] },
      datos: [
        { etiqueta: 'Fecha', valor: fecha(o.createdAt) },
        ...(o.fechaEsperada ? [{ etiqueta: 'Entrega esperada', valor: fecha(o.fechaEsperada) }] : [])
      ],
      columnas: [
        { encabezado: 'Código', alinear: 'left', peso: 1.4 }, { encabezado: 'Producto', alinear: 'left', peso: 4 },
        { encabezado: 'Cant.', alinear: 'right', peso: 0.9 }, { encabezado: 'Costo unit.', alinear: 'right', peso: 1.7 }, { encabezado: 'Subtotal', alinear: 'right', peso: 1.7 }
      ],
      filas: o.items.map((i) => [skuProducto(i.producto), nombreProducto(i.producto), String(i.cantidad), dinero.format(i.costoUnitario), dinero.format(i.cantidad * i.costoUnitario)]),
      totales: [{ etiqueta: 'TOTAL', valor: dinero.format(o.total), fuerte: true }],
      notas: o.notas,
      anulado: o.estado === 'cancelada' ? 'Orden cancelada' : undefined,
      archivo: o.numero
    });
  }

  /** Recibo de caja (abono de un cliente) o comprobante de egreso (pago a un proveedor). */
  async recibo(p: Pago, config: Configuracion | null): Promise<void> {
    const cobro = p.tipo === 'cobro';
    const reembolso = p.tipo === 'reembolso';
    const emisor = {
      nombre: config?.nombreEmpresa ?? 'Mi Empresa',
      lineas: [config?.nit && `NIT ${config.nit}`, [config?.direccion, config?.ciudad].filter(Boolean).join(', '), [config?.telefono, config?.email].filter(Boolean).join('  |  ')].filter(Boolean) as string[]
    };
    const totales: Documento['totales'] = [{ etiqueta: cobro ? 'VALOR RECIBIDO' : reembolso ? 'VALOR REEMBOLSADO' : 'VALOR PAGADO', valor: dinero.format(p.monto), fuerte: true }];
    if (p.cuenta && p.estado === 'vigente' && !reembolso) totales.push({ etiqueta: `Saldo actual de ${p.cuenta.numero}`, valor: dinero.format(p.cuenta.saldo) });
    await this.generar({
      titulo: cobro ? 'RECIBO DE CAJA' : reembolso ? 'COMPROBANTE DE REEMBOLSO' : 'COMPROBANTE DE EGRESO',
      numero: p.numero,
      emisor,
      receptorTitulo: cobro ? 'Recibido de' : reembolso ? 'Reembolsado a' : 'Pagado a',
      receptor: { nombre: p.contraparte, lineas: [] },
      datos: [
        { etiqueta: 'Fecha', valor: fecha(p.fecha) },
        { etiqueta: 'Forma de pago', valor: ETIQUETA_METODO[p.metodo] + (p.referencia ? ` (${p.referencia})` : '') }
      ],
      columnas: [{ encabezado: 'Concepto', alinear: 'left', peso: 5 }, { encabezado: 'Valor', alinear: 'right', peso: 1.8 }],
      filas: [[`${cobro ? 'Abono a la factura' : reembolso ? 'Reembolso por devolución (factura' : 'Pago de la orden de compra'} ${p.referenciaDocumento}${reembolso ? ')' : ''}`, dinero.format(p.monto)]],
      totales,
      notas: p.nota,
      pie: cobro ? 'Este recibo certifica el abono registrado. No es una factura.' : reembolso ? 'Este comprobante certifica el dinero devuelto al cliente.' : undefined,
      anulado: p.estado === 'anulado' ? p.motivoAnulacion || 'Pago anulado' : undefined,
      archivo: p.numero
    });
  }

  /** Estado de cuenta de un cliente: sus facturas pendientes y lo que debe. */
  async estadoCuenta(ec: EstadoCuenta, config: Configuracion | null): Promise<void> {
    const c = ec.cliente;
    const hoy = new Date();
    const totales: Documento['totales'] = [
      { etiqueta: 'Vencido', valor: dinero.format(ec.resumen.vencido) },
      { etiqueta: 'Por vencer (7 días)', valor: dinero.format(ec.resumen.porVencer) }
    ];
    if (ec.resumen.cupo > 0) totales.push({ etiqueta: 'Cupo de crédito', valor: dinero.format(ec.resumen.cupo) });
    totales.push({ etiqueta: 'TOTAL ADEUDADO', valor: dinero.format(ec.resumen.total), fuerte: true });
    await this.generar({
      titulo: 'ESTADO DE CUENTA',
      numero: hoy.toLocaleDateString(LOCALE),
      emisor: {
        nombre: config?.nombreEmpresa ?? 'Mi Empresa',
        lineas: [config?.nit && `NIT ${config.nit}`, [config?.direccion, config?.ciudad].filter(Boolean).join(', '), [config?.telefono, config?.email].filter(Boolean).join('  |  ')].filter(Boolean) as string[]
      },
      receptorTitulo: 'Cliente',
      receptor: {
        nombre: c.nombre,
        lineas: [c.documento && `${c.tipoDocumento} ${c.documento}`, [c.direccion, c.ciudad].filter(Boolean).join(', '), [c.telefono, c.email].filter(Boolean).join('  |  ')].filter(Boolean) as string[]
      },
      datos: [{ etiqueta: 'Fecha de corte', valor: fecha(hoy) }],
      columnas: [
        { encabezado: 'Factura', alinear: 'left', peso: 1.4 }, { encabezado: 'Emisión', alinear: 'left', peso: 1.5 }, { encabezado: 'Vence', alinear: 'left', peso: 1.5 },
        { encabezado: 'Mora', alinear: 'right', peso: 1 }, { encabezado: 'Total', alinear: 'right', peso: 1.5 }, { encabezado: 'Saldo', alinear: 'right', peso: 1.5 }
      ],
      filas: ec.facturas.length
        ? ec.facturas.map((f) => [f.numero, fecha(f.fecha), f.fechaVencimiento ? fecha(f.fechaVencimiento) : '-', f.mora > 0 ? `${f.mora} d` : '-', dinero.format(f.total), dinero.format(f.saldo)])
        : [['Sin facturas pendientes', '', '', '', '', dinero.format(0)]],
      totales,
      pie: 'Documento informativo generado por Inventario PYME. Si ya realizaste un pago reciente, es posible que aún no esté reflejado.',
      archivo: `estado-de-cuenta-${c.nombre.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}`
    });
  }

  private async generar(doc: Documento): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 42;

    // Cabecera: empresa a la izquierda, tipo y número a la derecha
    pdf.setFillColor(...TINTA); pdf.rect(0, 0, ancho, 96, 'F');
    pdf.setFillColor(242, 176, 30); pdf.rect(0, 96, ancho, 4, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    pdf.text(doc.emisor.nombre, margen, 38, { maxWidth: ancho / 2 - margen });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(190, 208, 210);
    doc.emisor.lineas.slice(0, 3).forEach((l, i) => pdf.text(l, margen, 54 + i * 12, { maxWidth: ancho / 2 }));
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
    pdf.text(doc.titulo, ancho - margen, 38, { align: 'right' });
    pdf.setFontSize(20); pdf.setTextColor(242, 176, 30);
    pdf.text(doc.numero, ancho - margen, 64, { align: 'right' });

    // Receptor y datos del documento
    let y = 126;
    pdf.setTextColor(79, 104, 107); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
    pdf.text(doc.receptorTitulo.toUpperCase(), margen, y);
    pdf.setTextColor(...TINTA); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
    pdf.text(doc.receptor.nombre, margen, y + 16, { maxWidth: ancho / 2 });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(60, 80, 83);
    doc.receptor.lineas.forEach((l, i) => pdf.text(l, margen, y + 31 + i * 12, { maxWidth: ancho / 2 }));

    doc.datos.forEach((d, i) => {
      pdf.setFontSize(8.5); pdf.setTextColor(79, 104, 107); pdf.text(d.etiqueta, ancho - margen - 130, y + i * 26);
      pdf.setFontSize(10.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...TINTA); pdf.text(d.valor, ancho - margen - 130, y + 13 + i * 26);
      pdf.setFont('helvetica', 'normal');
    });
    y += Math.max(doc.receptor.lineas.length * 12 + 44, doc.datos.length * 26 + 20);

    // Tabla de líneas
    const util = ancho - margen * 2;
    const suma = doc.columnas.reduce((s, c) => s + c.peso, 0);
    autoTable(pdf, {
      startY: y,
      margin: { left: margen, right: margen, bottom: 90 },
      head: [doc.columnas.map((c) => c.encabezado)],
      body: doc.filas,
      theme: 'striped',
      tableWidth: util,
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: [27, 48, 51], lineColor: [221, 229, 227] },
      headStyles: { fillColor: PRIMARIO, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      columnStyles: Object.fromEntries(doc.columnas.map((c, i) => [i, { cellWidth: (util * c.peso) / suma, halign: c.alinear }])) as any,
      didParseCell: (d: any) => { if (d.section === 'head') d.cell.styles.halign = doc.columnas[d.column.index].alinear; }
    });
    y = ((pdf as any).lastAutoTable?.finalY ?? y) + 18;

    // Totales (alineados a la derecha) 
    const altoTotales = doc.totales.length * 20 + 6;
    if (y + altoTotales > alto - 100) { pdf.addPage(); y = 60; }
    const xEtiqueta = ancho - margen - 230;
    doc.totales.forEach((t, i) => {
      const yy = y + i * 20;
      if (t.fuerte) { pdf.setFillColor(...GRIS); pdf.roundedRect(xEtiqueta - 10, yy - 14, 240 + 10, 22, 4, 4, 'F'); }
      pdf.setFont('helvetica', t.fuerte ? 'bold' : 'normal'); pdf.setFontSize(t.fuerte ? 12 : 9.5); pdf.setTextColor(...(t.fuerte ? TINTA : ([60, 80, 83] as [number, number, number])));
      pdf.text(t.etiqueta, xEtiqueta, yy); pdf.text(t.valor, ancho - margen, yy, { align: 'right' });
    });
    y += altoTotales + 14;

    if (doc.notas) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...TINTA); pdf.text('Observaciones', margen, y);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(60, 80, 83);
      pdf.text(pdf.splitTextToSize(doc.notas, util), margen, y + 13);
    }

    // Marca de agua si está anulado + pie de página en todas las hojas
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      if (doc.anulado) {
        pdf.setTextColor(179, 38, 30); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(80);
        pdf.saveGraphicsState?.();
        pdf.setGState?.(new (pdf as any).GState({ opacity: 0.18 }));
        pdf.text('ANULADA', ancho / 2, alto / 2 + 30, { align: 'center', angle: 30 });
        pdf.restoreGraphicsState?.();
      }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(127, 147, 149);
      if (doc.pie) pdf.text(pdf.splitTextToSize(doc.pie, util), margen, alto - 40);
      pdf.text(`Página ${p} de ${paginas}`, ancho - margen, alto - 20, { align: 'right' });
    }
    pdf.save(`${doc.archivo}.pdf`);
  }
}
