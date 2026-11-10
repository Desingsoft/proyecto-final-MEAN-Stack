/**
 * Archivo: exportar.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { LOCALE, MONEDA } from '../../core/config/formato';

export type TipoColumna = 'texto' | 'numero' | 'dinero' | 'fecha';

export interface ColumnaExport<T = any> {
  encabezado: string;
  tipo?: TipoColumna;
  /** Obtiene el valor de la celda. Para fechas devuelve un ISO string o Date. */
  valor: (fila: T) => string | number | Date | null | undefined;
  /** Ancho aproximado en caracteres (Excel). */
  ancho?: number;
}

export interface SeccionExport<T = any> {
  titulo: string;
  columnas: ColumnaExport<T>[];
  filas: T[];
}

export interface DocumentoExport {
  nombreArchivo: string;
  titulo: string;
  subtitulo?: string;
  resumen?: { etiqueta: string; valor: string | number }[];
  secciones: SeccionExport[];
  horizontal?: boolean;
}

const dinero = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: MONEDA, maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat(LOCALE);
const fechaHora = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'short', timeStyle: 'short' });

const TINTA: [number, number, number] = [16, 41, 44];
const PRIMARIO: [number, number, number] = [11, 122, 117];
const GRIS_CLARO: [number, number, number] = [241, 244, 242];

@Injectable({ providedIn: 'root' })
export class ExportarService {
  private marcaDeTiempo(): string {
    const f = new Date();
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  }

  private texto(valor: unknown, tipo: TipoColumna | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '-';
    if (tipo === 'dinero') return dinero.format(Number(valor));
    if (tipo === 'numero') return numero.format(Number(valor));
    if (tipo === 'fecha') return fechaHora.format(new Date(valor as string | Date));
    return String(valor);
  }

  /** Excel: una hoja "Resumen" y una hoja por sección, con números y fechas reales (se pueden sumar y filtrar). */
  async excel(doc: DocumentoExport): Promise<void> {
    const XLSX = await import('xlsx');
    const libro = XLSX.utils.book_new();

    const resumen: (string | number)[][] = [[doc.titulo]];
    if (doc.subtitulo) resumen.push([doc.subtitulo]);
    resumen.push([`Generado el ${fechaHora.format(new Date())}`], []);
    for (const r of doc.resumen ?? []) resumen.push([r.etiqueta, r.valor]);
    const hojaResumen = XLSX.utils.aoa_to_sheet(resumen);
    hojaResumen['!cols'] = [{ wch: 34 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

    const nombresUsados = new Set<string>(['Resumen']);
    for (const seccion of doc.secciones) {
      const encabezados = seccion.columnas.map((c) => c.encabezado);
      const filas = seccion.filas.map((fila) =>
        seccion.columnas.map((c) => {
          const v = c.valor(fila);
          if (c.tipo === 'fecha' && v) return new Date(v as string | Date);
          return v ?? '';
        })
      );
      const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas], { cellDates: true });

      seccion.columnas.forEach((col, indiceCol) => {
        const formato = col.tipo === 'dinero' ? '"$"#,##0' : col.tipo === 'numero' ? '#,##0' : col.tipo === 'fecha' ? 'dd/mm/yyyy hh:mm' : null;
        if (!formato) return;
        for (let r = 1; r <= filas.length; r++) {
          const celda = hoja[XLSX.utils.encode_cell({ r, c: indiceCol })];
          if (celda) celda.z = formato;
        }
      });
      hoja['!cols'] = seccion.columnas.map((c) => ({ wch: c.ancho ?? Math.max(c.encabezado.length + 4, 14) }));

      // Los nombres de hoja de Excel: máx. 31 caracteres, sin : \ / ? * [ ] y únicos.
      let nombre = seccion.titulo.replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31).trim() || 'Datos';
      let n = 2;
      while (nombresUsados.has(nombre)) nombre = `${nombre.slice(0, 28)} ${n++}`;
      nombresUsados.add(nombre);
      XLSX.utils.book_append_sheet(libro, hoja, nombre);
    }

    XLSX.writeFile(libro, `${doc.nombreArchivo}-${this.marcaDeTiempo()}.xlsx`);
  }

  /** PDF: encabezado con el título, cifras clave y una tabla por sección, con numeración de páginas. */
  async pdf(doc: DocumentoExport): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const pdf = new jsPDF({ orientation: doc.horizontal ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    const ancho = pdf.internal.pageSize.getWidth();
    const margen = 40;

    // Cabecera
    pdf.setFillColor(...TINTA);
    pdf.rect(0, 0, ancho, 78, 'F');
    pdf.setFillColor(242, 176, 30);
    pdf.rect(0, 78, ancho, 4, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(19);
    pdf.text(doc.titulo, margen, 38);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(190, 208, 210);
    pdf.text([doc.subtitulo, `Generado el ${fechaHora.format(new Date())}`].filter(Boolean).join('   |   '), margen, 58);

    let y = 104;

    // Cifras clave en cajas
    const resumen = doc.resumen ?? [];
    if (resumen.length) {
      const porFila = Math.min(resumen.length, doc.horizontal ? 5 : 4);
      const separacion = 8;
      const anchoCaja = (ancho - margen * 2 - separacion * (porFila - 1)) / porFila;
      resumen.forEach((r, i) => {
        const col = i % porFila;
        const fila = Math.floor(i / porFila);
        const x = margen + col * (anchoCaja + separacion);
        const top = y + fila * 52;
        pdf.setFillColor(...GRIS_CLARO);
        pdf.roundedRect(x, top, anchoCaja, 44, 5, 5, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(79, 104, 107);
        pdf.text(r.etiqueta, x + 9, top + 15);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12.5);
        pdf.setTextColor(...TINTA);
        pdf.text(String(r.valor), x + 9, top + 34, { maxWidth: anchoCaja - 14 });
      });
      y += Math.ceil(resumen.length / porFila) * 52 + 10;
    }

    // Una tabla por sección
    for (const seccion of doc.secciones) {
      if (y > pdf.internal.pageSize.getHeight() - 120) { pdf.addPage(); y = 50; }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(...TINTA);
      pdf.text(seccion.titulo, margen, y + 12);

      const anchoUtil = ancho - margen * 2;
      const pesos = seccion.columnas.map((c) =>
        c.tipo === 'dinero' || c.tipo === 'numero' ? 1.3 : c.tipo === 'fecha' ? 1.8 : (c.ancho ?? 16) >= 30 ? 3 : 1.8
      );
      const sumaPesos = pesos.reduce((a, b) => a + b, 0);
      const alinear = (c: ColumnaExport) => (c.tipo === 'dinero' || c.tipo === 'numero' ? 'right' : 'left');

      autoTable(pdf, {
        startY: y + 20,
        margin: { left: margen, right: margen, bottom: 46 },
        head: [seccion.columnas.map((c) => c.encabezado)],
        body: seccion.filas.map((fila) => seccion.columnas.map((c) => this.texto(c.valor(fila), c.tipo))),
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [27, 48, 51], lineColor: [221, 229, 227] },
        headStyles: { fillColor: PRIMARIO, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [247, 249, 248] },
        // Anchos proporcionales y estables: las tablas con las mismas columnas quedan idénticas entre secciones.
        tableWidth: anchoUtil,
        columnStyles: Object.fromEntries(
          seccion.columnas.map((c, i) => [i, { cellWidth: (anchoUtil * pesos[i]) / sumaPesos, halign: alinear(c) }])
        ) as any,
        didParseCell: (datos: any) => {
          if (datos.section === 'head') datos.cell.styles.halign = alinear(seccion.columnas[datos.column.index]);
        }
      });
      y = ((pdf as any).lastAutoTable?.finalY ?? y) + 28;
    }

    // Pie con número de página
    const paginas = pdf.getNumberOfPages();
    const alto = pdf.internal.pageSize.getHeight();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(127, 147, 149);
      pdf.text('Inventario PYME', margen, alto - 22);
      pdf.text(`Página ${p} de ${paginas}`, ancho - margen, alto - 22, { align: 'right' });
    }

    pdf.save(`${doc.nombreArchivo}-${this.marcaDeTiempo()}.pdf`);
  }
}
