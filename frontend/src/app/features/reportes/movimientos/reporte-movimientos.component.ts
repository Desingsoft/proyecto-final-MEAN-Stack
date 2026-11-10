/**
 * Archivo: reporte-movimientos.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ReporteService } from '../../../core/services/reporte.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { ExportarService, DocumentoExport } from '../../../shared/services/exportar.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { ReporteMovimientos } from '../../../core/models/reportes.model';
import { formatearNumero } from '../../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RangoFechas, RangoFechasComponent } from '../../../shared/components/rango-fechas/rango-fechas.component';
import { GraficoSeriesComponent } from '../../../shared/components/graficos/grafico-series.component';
import { etiquetaCorta, etiquetaLarga } from '../../../shared/utils/fechas';

const POR_PAGINA = 12;

@Component({
  selector: 'app-reporte-movimientos',
  standalone: true,
  imports: [DatePipe, IconComponent, RangoFechasComponent, GraficoSeriesComponent],
  templateUrl: './reporte-movimientos.component.html'
})
export class ReporteMovimientosComponent {
  private reportes = inject(ReporteService);
  private notificacion = inject(NotificacionService);
  private exportar = inject(ExportarService);
  private tiempoReal = inject(TiempoRealService);

  readonly formatoUnidades = (n: number) => `${formatearNumero(n)} u.`;
  readonly formatoEje = (n: number) => formatearNumero(n);

  rango = signal<RangoFechas | null>(null);
  datos = signal<ReporteMovimientos | null>(null);
  cargando = signal(true);
  error = signal('');
  exportando = signal(false);
  filtroTipo = signal<'' | 'entrada' | 'salida'>('');
  pagina = signal(1);

  etiquetas = computed(() => (this.datos()?.porDia ?? []).map((d) => etiquetaCorta(d.fecha)));
  claves = computed(() => (this.datos()?.porDia ?? []).map((d) => etiquetaLarga(d.fecha)));
  series = computed(() => {
    const dias = this.datos()?.porDia ?? [];
    return [
      { nombre: 'Entradas', color: '#3e9b6a', valores: dias.map((d) => d.entradas) },
      { nombre: 'Salidas', color: '#d8572a', valores: dias.map((d) => d.salidas) }
    ];
  });

  filtrados = computed(() => {
    const lista = this.datos()?.movimientos ?? [];
    return this.filtroTipo() ? lista.filter((m) => m.tipo === this.filtroTipo()) : lista;
  });
  totalPaginas = computed(() => Math.max(Math.ceil(this.filtrados().length / POR_PAGINA), 1));
  pagina$ = computed(() => this.filtrados().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA));

  constructor() {
    this.tiempoReal.alCambiar('inventario').pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.cargar(true));
  }

  onRango(rango: RangoFechas): void {
    this.rango.set(rango);
    this.pagina.set(1);
    this.cargar();
  }

  cargar(silencioso = false): void {
    const rango = this.rango();
    if (!rango) return;
    if (!silencioso) this.cargando.set(true);
    this.reportes.movimientos(rango.desde, rango.hasta).subscribe({
      next: (d) => { this.datos.set(d); this.error.set(''); this.cargando.set(false); if (this.pagina() > this.totalPaginas()) this.pagina.set(1); },
      error: (err) => { this.error.set(err.error?.mensaje || 'No se pudo generar el reporte'); this.cargando.set(false); }
    });
  }

  cambiarTipo(tipo: '' | 'entrada' | 'salida'): void {
    this.filtroTipo.set(tipo);
    this.pagina.set(1);
  }

  private documento(d: ReporteMovimientos): DocumentoExport {
    return {
      nombreArchivo: `reporte-movimientos-${d.rango.desde}-a-${d.rango.hasta}`,
      titulo: 'Reporte de movimientos de inventario',
      subtitulo: `Del ${d.rango.desde} al ${d.rango.hasta} (${d.rango.dias} días)`,
      resumen: [
        { etiqueta: 'Movimientos', valor: d.resumen.movimientos },
        { etiqueta: 'Unidades que entraron', valor: d.resumen.unidadesEntrada },
        { etiqueta: 'Unidades que salieron', valor: d.resumen.unidadesSalida },
        { etiqueta: 'Variación neta', valor: d.resumen.neto }
      ],
      horizontal: true,
      secciones: [
        {
          titulo: 'Movimientos',
          filas: d.movimientos,
          columnas: [
            { encabezado: 'Fecha', tipo: 'fecha', valor: (f) => f.fecha, ancho: 20 },
            { encabezado: 'SKU', valor: (f) => f.sku, ancho: 14 },
            { encabezado: 'Producto', valor: (f) => f.producto, ancho: 34 },
            { encabezado: 'Tipo', valor: (f) => (f.tipo === 'entrada' ? 'Entrada' : 'Salida') },
            { encabezado: 'Cantidad', tipo: 'numero', valor: (f) => f.cantidad },
            { encabezado: 'Motivo', valor: (f) => f.motivo, ancho: 22 },
            { encabezado: 'Registrado por', valor: (f) => f.registradoPor, ancho: 20 }
          ]
        },
        {
          titulo: 'Por motivo',
          filas: d.porMotivo,
          columnas: [
            { encabezado: 'Motivo', valor: (f) => f.motivo, ancho: 24 },
            { encabezado: 'Movimientos', tipo: 'numero', valor: (f) => f.movimientos },
            { encabezado: 'Unidades que entraron', tipo: 'numero', valor: (f) => f.entradas },
            { encabezado: 'Unidades que salieron', tipo: 'numero', valor: (f) => f.salidas }
          ]
        },
        {
          titulo: 'Por día',
          filas: d.porDia,
          columnas: [
            { encabezado: 'Fecha', valor: (f) => f.fecha },
            { encabezado: 'Entradas', tipo: 'numero', valor: (f) => f.entradas },
            { encabezado: 'Salidas', tipo: 'numero', valor: (f) => f.salidas }
          ]
        }
      ]
    };
  }

  async exportarComo(formato: 'excel' | 'pdf'): Promise<void> {
    const d = this.datos();
    if (!d) return;
    this.exportando.set(true);
    try {
      if (formato === 'excel') await this.exportar.excel(this.documento(d));
      else await this.exportar.pdf(this.documento(d));
      this.notificacion.exito(formato === 'excel' ? 'Reporte descargado en Excel' : 'Reporte descargado en PDF');
    } catch {
      this.notificacion.error('No se pudo generar el archivo. Inténtalo de nuevo.');
    } finally {
      this.exportando.set(false);
    }
  }
}
