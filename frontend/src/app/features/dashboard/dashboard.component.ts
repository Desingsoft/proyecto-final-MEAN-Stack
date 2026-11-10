/**
 * Archivo: dashboard.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReporteService } from '../../core/services/reporte.service';
import { PedidoService } from '../../core/services/pedido.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertasService } from '../../shared/services/alertas.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardResponse } from '../../core/models/reportes.model';
import { Pedido } from '../../core/models/pedido.model';
import { DineroPipe, formatearDinero } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StockMeterComponent } from '../../shared/components/stock-meter/stock-meter.component';
import { GraficoSeriesComponent } from '../../shared/components/graficos/grafico-series.component';
import { GraficoDonaComponent, SegmentoDona } from '../../shared/components/graficos/grafico-dona.component';
import { SparklineComponent } from '../../shared/components/graficos/sparkline.component';
import { CLASE_CHIP_NIVEL, CLASE_ESTADO_PEDIDO, COLOR_ESTADO_PEDIDO, ETIQUETA_NIVEL, NivelStock } from '../../shared/utils/stock';
import { aClave, etiquetaCorta, etiquetaLarga, hace, saludoSegunHora } from '../../shared/utils/fechas';

const REFRESCO_MS = 60_000;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe, RouterLink, DineroPipe, IconComponent, StockMeterComponent,
    GraficoSeriesComponent, GraficoDonaComponent, SparklineComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private reportes = inject(ReporteService);
  private pedidoService = inject(PedidoService);
  private alertas = inject(AlertasService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  tiempoReal = inject(TiempoRealService);
  authService = inject(AuthService);

  readonly periodos = [7, 14, 30, 90];
  readonly formatoDinero = (n: number) => formatearDinero(n);
  readonly formatoEje = (n: number) => formatearDinero(n, true);
  readonly etiquetaNivel = ETIQUETA_NIVEL;
  readonly chipNivel = CLASE_CHIP_NIVEL;

  datos = signal<DashboardResponse | null>(null);
  pedidosRecientes = signal<Pedido[]>([]);
  dias = signal(14);
  cargando = signal(true);
  actualizando = signal(false);
  error = signal(false);
  ultimaActualizacion = signal<Date | null>(null);
  private reloj = signal(Date.now());
  private temporizadores: ReturnType<typeof setInterval>[] = [];

  nombre = computed(() => (this.authService.usuarioActual()?.nombre ?? '').split(' ')[0]);
  saludo = saludoSegunHora();
  fechaHoy = etiquetaLarga(aClave(new Date()));
  hace = computed(() => { this.reloj(); return hace(this.ultimaActualizacion()); });

  puedeReponer = computed(() => { this.authService.usuarioActual(); return this.authService.tieneRol(['admin', 'bodeguero']); });
  verVentas = computed(() => this.datos()?.kpis.ventasPeriodo !== null && this.datos()?.kpis.ventasPeriodo !== undefined);

  // --- Datos derivados para gráficos ---
  etiquetasSerie = computed(() => (this.datos()?.ventasPorDia ?? []).map((d) => etiquetaCorta(d.fecha)));
  clavesSerie = computed(() => (this.datos()?.ventasPorDia ?? []).map((d) => etiquetaLarga(d.fecha)));
  seriesVentas = computed(() => [{ nombre: 'Ventas', color: '#0b7a75', valores: (this.datos()?.ventasPorDia ?? []).map((d) => d.total) }]);
  valoresPedidosDia = computed(() => (this.datos()?.ventasPorDia ?? []).map((d) => d.pedidos));
  valoresVentasDia = computed(() => (this.datos()?.ventasPorDia ?? []).map((d) => d.total));

  segmentosEstado = computed<SegmentoDona[]>(() =>
    (this.datos()?.pedidosPorEstado ?? []).map((e) => ({
      clave: e.estado, etiqueta: e.estado, valor: e.cantidad, color: COLOR_ESTADO_PEDIDO[e.estado] ?? '#a8b6b5'
    }))
  );

  cinta = computed(() => {
    const estado = this.datos()?.estadoInventario;
    if (!estado) return [];
    const orden: { nivel: NivelStock; texto: string }[] = [
      { nivel: 'agotado', texto: 'Agotados' },
      { nivel: 'critico', texto: 'Críticos' },
      { nivel: 'bajo', texto: 'Bajos' },
      { nivel: 'saludable', texto: 'Saludables' }
    ];
    return orden.map((o) => ({ ...o, cantidad: estado[o.nivel] }));
  });

  maxTop = computed(() => Math.max(...(this.datos()?.topProductos ?? []).map((p) => p.ingresos), 1));

  ngOnInit(): void {
    this.cargar();
    // Tiempo real: se recarga apenas alguien crea un pedido o cambia el stock.
    this.tiempoReal.alCambiar('pedidos', 'productos', 'inventario', 'pagos', 'documentos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar(true));
    this.temporizadores.push(
      // Respaldo: solo si el canal en vivo no está conectado.
      setInterval(() => { if (!document.hidden && !this.tiempoReal.conectado()) this.cargar(true); }, REFRESCO_MS),
      setInterval(() => this.reloj.set(Date.now()), 15_000)
    );
  }

  ngOnDestroy(): void {
    this.temporizadores.forEach(clearInterval);
  }

  cargar(silencioso = false): void {
    if (silencioso || this.datos()) this.actualizando.set(true);
    else this.cargando.set(true);

    this.reportes.dashboard(this.dias()).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.error.set(false);
        this.cargando.set(false);
        this.actualizando.set(false);
        this.ultimaActualizacion.set(new Date());
        this.alertas.refrescar();
      },
      error: () => {
        this.cargando.set(false);
        this.actualizando.set(false);
        if (!this.datos()) this.error.set(true);
      }
    });

    this.pedidoService.getTodos(1).subscribe({
      next: (res) => this.pedidosRecientes.set(res.pedidos.slice(0, 6)),
      error: () => {}
    });
  }

  cambiarPeriodo(dias: number): void {
    if (dias === this.dias()) return;
    this.dias.set(dias);
    this.cargar();
  }

  irANivel(nivel: NivelStock): void {
    if (nivel === 'saludable') this.router.navigate(['/productos']);
    else if (this.puedeReponer()) this.router.navigate(['/reposicion'], { queryParams: { nivel } });
    else this.router.navigate(['/productos'], { queryParams: { estado: nivel === 'bajo' ? 'bajo' : nivel } });
  }

  irAEstado(estado: string): void {
    this.router.navigate(['/pedidos'], { queryParams: { estado } });
  }

  variacion(): { clase: string; icono: string; texto: string } | null {
    const v = this.datos()?.kpis.variacionVentas;
    if (v === null || v === undefined) return null;
    const texto = `${Math.abs(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
    if (v > 0.05) return { clase: 'delta-sube', icono: 'sube', texto };
    if (v < -0.05) return { clase: 'delta-baja', icono: 'baja', texto };
    return { clase: 'delta-neutro', icono: 'sube', texto: '0 %' };
  }

  claseEstado(estado: string): string {
    return CLASE_ESTADO_PEDIDO[estado] || 'badge-secondary';
  }

  porcentajeTop(valor: number): number {
    return (valor / this.maxTop()) * 100;
  }
}
