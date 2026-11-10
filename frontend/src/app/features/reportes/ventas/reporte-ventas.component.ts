/**
 * Archivo: reporte-ventas.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReporteService } from '../../../core/services/reporte.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { ExportarService, DocumentoExport } from '../../../shared/services/exportar.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { ReporteVentas } from '../../../core/models/reportes.model';
import { DineroPipe, formatearDinero } from '../../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RangoFechas, RangoFechasComponent } from '../../../shared/components/rango-fechas/rango-fechas.component';
import { GraficoSeriesComponent } from '../../../shared/components/graficos/grafico-series.component';
import { GraficoDonaComponent, SegmentoDona } from '../../../shared/components/graficos/grafico-dona.component';
import { CLASE_ESTADO_PEDIDO, COLOR_ESTADO_PEDIDO } from '../../../shared/utils/stock';
import { etiquetaCorta, etiquetaLarga } from '../../../shared/utils/fechas';

const POR_PAGINA = 10;

@Component({
  selector: 'app-reporte-ventas',
  standalone: true,
  imports: [DatePipe, RouterLink, DineroPipe, IconComponent, RangoFechasComponent, GraficoSeriesComponent, GraficoDonaComponent],
  templateUrl: './reporte-ventas.component.html'
})
export class ReporteVentasComponent {
  private reportes = inject(ReporteService);
  private notificacion = inject(NotificacionService);
  private exportar = inject(ExportarService);
  private tiempoReal = inject(TiempoRealService);

  readonly formatoDinero = (n: number) => formatearDinero(n);
  readonly formatoEje = (n: number) => formatearDinero(n, true);
  readonly claseEstado = CLASE_ESTADO_PEDIDO;
  readonly estados = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];

  rango = signal<RangoFechas | null>(null);
  datos = signal<ReporteVentas | null>(null);
  cargando = signal(true);
  error = signal('');
  exportando = signal(false);
  pagina = signal(1);
  filtroEstado = signal('');
  verTodosProductos = signal(false);

  etiquetas = computed(() => (this.datos()?.porDia ?? []).map((d) => etiquetaCorta(d.fecha)));
  claves = computed(() => (this.datos()?.porDia ?? []).map((d) => etiquetaLarga(d.fecha)));
  series = computed(() => [{ nombre: 'Ventas', color: '#0b7a75', valores: (this.datos()?.porDia ?? []).map((d) => d.total) }]);

  segmentos = computed<SegmentoDona[]>(() =>
    (this.datos()?.porEstado ?? []).map((e) => ({ clave: e.estado, etiqueta: e.estado, valor: e.cantidad, color: COLOR_ESTADO_PEDIDO[e.estado] }))
  );

  productosVisibles = computed(() => {
    const lista = this.datos()?.porProducto ?? [];
    return this.verTodosProductos() ? lista : lista.slice(0, 8);
  });

  pedidosFiltrados = computed(() => {
    const lista = this.datos()?.pedidos ?? [];
    return this.filtroEstado() ? lista.filter((p) => p.estado === this.filtroEstado()) : lista;
  });
  totalPaginas = computed(() => Math.max(Math.ceil(this.pedidosFiltrados().length / POR_PAGINA), 1));
  pedidosPagina = computed(() => this.pedidosFiltrados().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA));

  maxVendedor = computed(() => Math.max(...(this.datos()?.porVendedor ?? []).map((v) => v.ventas), 1));
  margenPorcentaje = computed(() => {
    const r = this.datos()?.resumen;
    return r && r.ventas > 0 ? (r.margenEstimado / r.ventas) * 100 : 0;
  });

  constructor() {
    this.tiempoReal.alCambiar('pedidos').pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.cargar(true));
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
    this.reportes.ventas(rango.desde, rango.hasta).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.error.set('');
        this.cargando.set(false);
        if (this.pagina() > this.totalPaginas()) this.pagina.set(1);
      },
      error: (err) => {
        this.error.set(err.error?.mensaje || 'No se pudo generar el reporte');
        this.cargando.set(false);
      }
    });
  }

  cambiarFiltro(estado: string): void {
    this.filtroEstado.set(estado);
    this.pagina.set(1);
  }

  variacion(): { clase: string; icono: string; texto: string } | null {
    const v = this.datos()?.resumen.variacion;
    if (v === null || v === undefined) return null;
    const texto = `${Math.abs(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
    if (v > 0.05) return { clase: 'delta-sube', icono: 'sube', texto };
    if (v < -0.05) return { clase: 'delta-baja', icono: 'baja', texto };
    return { clase: 'delta-neutro', icono: 'sube', texto: '0 %' };
  }

  private documento(d: ReporteVentas): DocumentoExport {
    return {
      nombreArchivo: `reporte-ventas-${d.rango.desde}-a-${d.rango.hasta}`,
      titulo: 'Reporte de ventas',
      subtitulo: `Del ${d.rango.desde} al ${d.rango.hasta} (${d.rango.dias} días)`,
      resumen: [
        { etiqueta: 'Ventas netas', valor: formatearDinero(d.resumen.ventas) },
        { etiqueta: 'Devoluciones', valor: formatearDinero(d.resumen.devoluciones ?? 0) },
        { etiqueta: 'Pedidos', valor: d.resumen.pedidos },
        { etiqueta: 'Ticket promedio', valor: formatearDinero(d.resumen.ticketPromedio) },
        { etiqueta: 'Unidades vendidas', valor: d.resumen.unidades },
        { etiqueta: 'Margen estimado', valor: formatearDinero(d.resumen.margenEstimado) },
        { etiqueta: 'Pedidos cancelados', valor: d.resumen.cancelados }
      ],
      secciones: [
        {
          titulo: 'Productos vendidos',
          filas: d.porProducto,
          columnas: [
            { encabezado: 'SKU', valor: (f) => f.sku, ancho: 14 },
            { encabezado: 'Producto', valor: (f) => f.nombre, ancho: 36 },
            { encabezado: 'Categoría', valor: (f) => f.categoria, ancho: 16 },
            { encabezado: 'Unidades', tipo: 'numero', valor: (f) => f.unidades },
            { encabezado: 'Ingresos', tipo: 'dinero', valor: (f) => f.ingresos },
            { encabezado: 'Margen estimado', tipo: 'dinero', valor: (f) => f.margen }
          ]
        },
        {
          titulo: 'Pedidos',
          filas: d.pedidos,
          columnas: [
            { encabezado: 'Fecha', tipo: 'fecha', valor: (f) => f.fecha, ancho: 20 },
            { encabezado: 'Cliente', valor: (f) => f.cliente, ancho: 30 },
            { encabezado: 'Estado', valor: (f) => f.estado },
            { encabezado: 'Unidades', tipo: 'numero', valor: (f) => f.unidades },
            { encabezado: 'Total', tipo: 'dinero', valor: (f) => f.total },
            { encabezado: 'Vendedor', valor: (f) => f.vendedor, ancho: 20 }
          ]
        },
        {
          titulo: 'Ventas por día',
          filas: d.porDia,
          columnas: [
            { encabezado: 'Fecha', valor: (f) => f.fecha },
            { encabezado: 'Pedidos', tipo: 'numero', valor: (f) => f.pedidos },
            { encabezado: 'Ventas', tipo: 'dinero', valor: (f) => f.total }
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

  porcentajeVendedor(v: number): number {
    return (v / this.maxVendedor()) * 100;
  }
}
