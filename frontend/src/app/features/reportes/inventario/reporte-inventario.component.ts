/**
 * Archivo: reporte-inventario.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ReporteService } from '../../../core/services/reporte.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { ExportarService, DocumentoExport } from '../../../shared/services/exportar.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { ReporteInventario } from '../../../core/models/reportes.model';
import { DineroPipe, formatearDinero } from '../../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StockMeterComponent } from '../../../shared/components/stock-meter/stock-meter.component';
import { GraficoDonaComponent, SegmentoDona } from '../../../shared/components/graficos/grafico-dona.component';
import { CLASE_CHIP_NIVEL, COLOR_NIVEL, ETIQUETA_NIVEL, NivelStock } from '../../../shared/utils/stock';

type Fila = ReporteInventario['productos'][number];
type Columna = 'nombre' | 'categoria' | 'stock' | 'valorCosto' | 'valorVenta';

const POR_PAGINA = 12;

@Component({
  selector: 'app-reporte-inventario',
  standalone: true,
  imports: [FormsModule, DineroPipe, IconComponent, StockMeterComponent, GraficoDonaComponent],
  templateUrl: './reporte-inventario.component.html'
})
export class ReporteInventarioComponent implements OnInit {
  private reportes = inject(ReporteService);
  private notificacion = inject(NotificacionService);
  private exportar = inject(ExportarService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  readonly etiquetaNivel = ETIQUETA_NIVEL;
  readonly chipNivel = CLASE_CHIP_NIVEL;
  readonly niveles: NivelStock[] = ['agotado', 'critico', 'bajo', 'saludable'];

  datos = signal<ReporteInventario | null>(null);
  cargando = signal(true);
  error = signal(false);
  exportando = signal(false);

  buscar = signal('');
  filtroNivel = signal<'' | NivelStock>('');
  filtroCategoria = signal('');
  orden = signal<{ columna: Columna; asc: boolean }>({ columna: 'nombre', asc: true });
  pagina = signal(1);

  categorias = computed(() => (this.datos()?.porCategoria ?? []).map((c) => c.categoria));

  segmentos = computed<SegmentoDona[]>(() => {
    const n = this.datos()?.resumen.porNivel;
    return n ? this.niveles.map((nivel) => ({ clave: nivel, etiqueta: ETIQUETA_NIVEL[nivel], valor: n[nivel], color: COLOR_NIVEL[nivel] })) : [];
  });

  filas = computed(() => {
    const texto = this.buscar().trim().toLowerCase();
    const { columna, asc } = this.orden();
    const lista = (this.datos()?.productos ?? []).filter(
      (p) =>
        (!texto || p.nombre.toLowerCase().includes(texto) || p.sku.toLowerCase().includes(texto)) &&
        (!this.filtroNivel() || p.nivel === this.filtroNivel()) &&
        (!this.filtroCategoria() || (p.categoria ?? 'Sin categoría') === this.filtroCategoria())
    );
    return [...lista].sort((a, b) => {
      const x = (a as any)[columna] ?? '';
      const y = (b as any)[columna] ?? '';
      const r = typeof x === 'number' ? x - (y as number) : String(x).localeCompare(String(y), 'es');
      return asc ? r : -r;
    });
  });

  totalPaginas = computed(() => Math.max(Math.ceil(this.filas().length / POR_PAGINA), 1));
  filasPagina = computed(() => this.filas().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA));
  maxCategoria = computed(() => Math.max(...(this.datos()?.porCategoria ?? []).map((c) => c.valorCosto), 1));

  ngOnInit(): void {
    this.cargar();
    this.tiempoReal.alCambiar('productos', 'inventario').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.reportes.inventario().subscribe({
      next: (d) => { this.datos.set(d); this.cargando.set(false); this.error.set(false); },
      error: () => { this.cargando.set(false); this.error.set(true); }
    });
  }

  ordenarPor(columna: Columna): void {
    const actual = this.orden();
    this.orden.set({ columna, asc: actual.columna === columna ? !actual.asc : columna === 'nombre' || columna === 'categoria' });
    this.pagina.set(1);
  }

  flecha(columna: Columna): string {
    const o = this.orden();
    return o.columna === columna ? (o.asc ? '▲' : '▼') : '↕';
  }

  alFiltrar(): void { this.pagina.set(1); }

  porcentajeCategoria(v: number): number { return (v / this.maxCategoria()) * 100; }

  private documento(d: ReporteInventario): DocumentoExport {
    return {
      nombreArchivo: 'reporte-inventario',
      titulo: 'Reporte de inventario',
      subtitulo: 'Existencias valoradas al costo y al precio de venta',
      resumen: [
        { etiqueta: 'Productos', valor: d.resumen.productos },
        { etiqueta: 'Unidades en bodega', valor: d.resumen.unidades },
        { etiqueta: 'Valor a costo', valor: formatearDinero(d.resumen.valorCosto) },
        { etiqueta: 'Valor a precio de venta', valor: formatearDinero(d.resumen.valorVenta) },
        { etiqueta: 'Margen potencial', valor: formatearDinero(d.resumen.margenPotencial) },
        { etiqueta: 'Por reponer', valor: d.resumen.porNivel.agotado + d.resumen.porNivel.critico + d.resumen.porNivel.bajo }
      ],
      horizontal: true,
      secciones: [
        {
          titulo: 'Productos',
          filas: this.filas(),
          columnas: [
            { encabezado: 'SKU', valor: (f: Fila) => f.sku, ancho: 14 },
            { encabezado: 'Producto', valor: (f: Fila) => f.nombre, ancho: 34 },
            { encabezado: 'Categoría', valor: (f: Fila) => f.categoria, ancho: 16 },
            { encabezado: 'Proveedor', valor: (f: Fila) => f.proveedor, ancho: 22 },
            { encabezado: 'Stock', tipo: 'numero', valor: (f: Fila) => f.stock },
            { encabezado: 'Mínimo', tipo: 'numero', valor: (f: Fila) => f.stockMinimo },
            { encabezado: 'Nivel', valor: (f: Fila) => ETIQUETA_NIVEL[f.nivel] },
            { encabezado: 'Valor a costo', tipo: 'dinero', valor: (f: Fila) => f.valorCosto },
            { encabezado: 'Valor a venta', tipo: 'dinero', valor: (f: Fila) => f.valorVenta }
          ]
        },
        {
          titulo: 'Por categoría',
          filas: d.porCategoria,
          columnas: [
            { encabezado: 'Categoría', valor: (f) => f.categoria, ancho: 22 },
            { encabezado: 'Productos', tipo: 'numero', valor: (f) => f.productos },
            { encabezado: 'Unidades', tipo: 'numero', valor: (f) => f.unidades },
            { encabezado: 'Valor a costo', tipo: 'dinero', valor: (f) => f.valorCosto },
            { encabezado: 'Valor a venta', tipo: 'dinero', valor: (f) => f.valorVenta }
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
