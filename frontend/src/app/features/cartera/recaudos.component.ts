/**
 * Archivo: recaudos.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarteraService } from '../../core/services/cartera.service';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { ExportarService, DocumentoExport } from '../../shared/services/exportar.service';
import { DocumentosPdfService } from '../../shared/services/documentos-pdf.service';
import { ETIQUETA_METODO, METODOS_PAGO, MetodoPago, Pago, RecaudosResponse } from '../../core/models/negocio.model';
import { DineroPipe, formatearDinero } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RangoFechas, RangoFechasComponent } from '../../shared/components/rango-fechas/rango-fechas.component';
import { GraficoDonaComponent, SegmentoDona } from '../../shared/components/graficos/grafico-dona.component';

const COLORES: Record<MetodoPago, string> = { efectivo: '#3e9b6a', transferencia: '#2f6fb5', tarjeta: '#6f5bc2', cheque: '#dc9506', otro: '#a8b6b5' };
const POR_PAGINA = 12;

/** Lista de pagos. Según la ruta muestra los recaudos (cobros a clientes) o los pagos realizados a proveedores. */
@Component({
  selector: 'app-recaudos',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, ModalComponent, RangoFechasComponent, GraficoDonaComponent],
  template: `
    <div class="barra-filtros" style="justify-content: space-between">
      <app-rango-fechas inicial="30d" (cambio)="onRango($event)" />
      <span style="display: flex; gap: 0.5rem">
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('excel')" [disabled]="!datos() || exportando()"><app-icon name="excel" [size]="16" /> Excel</button>
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('pdf')" [disabled]="!datos() || exportando()"><app-icon name="pdf" [size]="16" /> PDF</button>
      </span>
    </div>
    @if (error()) { <div class="error-alert" role="alert">{{ error() }}</div> }

    @if (cargando() && !datos()) { <div class="skeleton" style="height: 300px"></div> }
    @else {
      @if (datos(); as d) {
        <div class="grid-dash" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr)">
          <div class="kpis" style="grid-template-columns: 1fr 1fr; align-content: start; margin: 0">
            <div class="kpi acento" style="grid-column: 1 / -1"><span class="kpi-etiqueta">{{ cobro() ? 'Total recaudado' : 'Total pagado a proveedores' }}</span><span class="kpi-valor" [attr.title]="(d.resumen.total | dinero)">{{ d.resumen.total | dinero:true }}</span><span class="kpi-pie">del {{ d.rango.desde }} al {{ d.rango.hasta }}@if ((d.resumen.reembolsos ?? 0) > 0) {, menos {{ (d.resumen.reembolsos ?? 0) | dinero:true }} reembolsados}</span></div>
            <div class="kpi"><span class="kpi-etiqueta">Pagos</span><span class="kpi-valor">{{ d.resumen.cantidad }}</span></div>
            <div class="kpi"><span class="kpi-etiqueta">Anulados</span><span class="kpi-valor" [style.color]="d.resumen.anulados ? 'var(--agotado)' : 'inherit'">{{ d.resumen.anulados }}</span></div>
          </div>
          <section class="panel sin-margen">
            <div class="panel-header"><div><h2>Por forma de pago</h2><p class="nota">Toca una para filtrar la tabla</p></div></div>
            <app-grafico-dona [segmentos]="segmentos()" textoTotal="pagos" descripcion="Pagos por forma de pago" (seleccion)="filtrarMetodo($any($event))" />
          </section>
        </div>

        <section class="panel" style="margin-top: 1.25rem">
          <div class="filtro-chips" style="margin-bottom: 1rem">
            <button type="button" class="filtro-chip" [class.activo]="metodo() === ''" (click)="filtrarMetodo('')">Todos</button>
            @for (m of metodos; track m) { <button type="button" class="filtro-chip" [class.activo]="metodo() === m" (click)="filtrarMetodo(m)">{{ etiqueta[m] }}</button> }
          </div>
          @if (filtrados().length === 0) { <p class="sin-datos">No hay pagos en este periodo.</p> } @else {
            <div class="tabla-wrap"><table>
              <thead><tr><th>Recibo</th><th>Fecha</th><th>{{ cobro() ? 'Cliente' : 'Proveedor' }}</th><th>{{ cobro() ? 'Factura' : 'Orden' }}</th><th>Forma</th><th class="num">Monto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                @for (p of pagina$(); track p._id) {
                  <tr [style.opacity]="p.estado === 'anulado' ? 0.55 : 1">
                    <td><span class="celda-doble"><span class="principal">{{ p.numero }}@if (p.tipo === 'reembolso') { <span class="chip chip-critico sin-punto" style="margin-left: 0.3rem">Reembolso</span> }</span>@if (p.estado === 'anulado') { <span class="secundaria" style="color: var(--agotado-texto)">Anulado</span> }</span></td>
                    <td>{{ p.fecha | date:'d MMM y' }}</td>
                    <td>{{ p.contraparte }}</td>
                    <td>@if (p.documento) { <a [routerLink]="['/documentos', p.documento]">{{ p.referenciaDocumento }}</a> } @else if (p.orden) { <a [routerLink]="['/ordenes-compra', p.orden]">{{ p.referenciaDocumento }}</a> } @else { {{ p.referenciaDocumento }} }</td>
                    <td><span class="celda-doble"><span>{{ etiqueta[p.metodo] }}</span>@if (p.referencia) { <span class="secundaria">{{ p.referencia }}</span> }</span></td>
                    <td class="num"><strong [style.text-decoration]="p.estado === 'anulado' ? 'line-through' : 'none'" [style.color]="p.tipo === 'reembolso' ? 'var(--critico-texto)' : 'inherit'">{{ p.tipo === 'reembolso' ? '− ' : '' }}{{ p.monto | dinero }}</strong></td>
                    <td><span class="acciones" style="justify-content: flex-end">
                      <button type="button" class="btn-icono" (click)="descargar(p)" title="Descargar recibo" [attr.aria-label]="'Descargar ' + p.numero"><app-icon name="pdf" [size]="17" /></button>
                      @if (p.estado === 'vigente' && esAdmin()) { <button type="button" class="btn-icono peligro" (click)="anulando.set(p)" title="Anular pago" [attr.aria-label]="'Anular ' + p.numero"><app-icon name="papelera" [size]="17" /></button> }
                    </span></td>
                  </tr>
                }
              </tbody>
            </table></div>
            <div class="paginacion">
              <button type="button" (click)="pagina.set(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
              <span>Página {{ pagina() }} de {{ totalPaginas() }}</span>
              <button type="button" (click)="pagina.set(pagina() + 1)" [disabled]="pagina() === totalPaginas()">Siguiente</button>
            </div>
          }
        </section>
      }
    }

    @if (anulando(); as p) {
      <app-modal titulo="Anular pago" [descripcion]="p.numero + ' · ' + (p.monto | dinero) + ' · ' + p.contraparte" (cerrar)="anulando.set(null)">
        <p style="color: var(--texto-suave); margin-bottom: 1rem">El saldo de {{ p.referenciaDocumento }} se restituye. El recibo queda registrado como anulado.</p>
        <div class="form-group"><label for="ap-motivo">Motivo</label>
          <input id="ap-motivo" type="text" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)" placeholder="Ej. Cheque devuelto por el banco" (keydown.enter)="anular()" /></div>
        @if (errorAnular()) { <div class="error-alert" role="alert">{{ errorAnular() }}</div> }
        <div pie>
          <button type="button" class="btn-secondary" (click)="anulando.set(null)">Cancelar</button>
          <button type="button" class="btn-danger" style="min-height: 40px; font-size: 0.9rem" (click)="anular()" [disabled]="motivo().trim().length < 5 || guardando()">{{ guardando() ? 'Anulando…' : 'Anular pago' }}</button>
        </div>
      </app-modal>
    }
  `
})
export class RecaudosComponent {
  private cartera = inject(CarteraService);
  private configService = inject(ConfiguracionService);
  private notificacion = inject(NotificacionService);
  private tiempoReal = inject(TiempoRealService);
  private exportador = inject(ExportarService);
  private pdf = inject(DocumentosPdfService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  readonly metodos = METODOS_PAGO;
  readonly etiqueta = ETIQUETA_METODO;

  tipo = (this.route.snapshot.data['tipo'] as 'cobro' | 'egreso') ?? 'cobro';
  cobro = () => this.tipo === 'cobro';
  esAdmin = computed(() => { this.auth.usuarioActual(); return this.auth.tieneRol(['admin']); });

  rango = signal<RangoFechas | null>(null);
  datos = signal<RecaudosResponse | null>(null);
  cargando = signal(true);
  error = signal('');
  exportando = signal(false);
  metodo = signal<'' | MetodoPago>('');
  pagina = signal(1);
  anulando = signal<Pago | null>(null);
  motivo = signal('');
  errorAnular = signal('');
  guardando = signal(false);

  segmentos = computed<SegmentoDona[]>(() => (this.datos()?.resumen.porMetodo ?? []).map((m) => ({ clave: m.metodo, etiqueta: ETIQUETA_METODO[m.metodo], valor: Math.max(m.monto, 0), color: COLORES[m.metodo] })));
  filtrados = computed(() => (this.datos()?.pagos ?? []).filter((p) => !this.metodo() || p.metodo === this.metodo()));
  totalPaginas = computed(() => Math.max(Math.ceil(this.filtrados().length / POR_PAGINA), 1));
  pagina$ = computed(() => this.filtrados().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA));

  constructor() {
    this.configService.obtener().subscribe({ error: () => {} });
    this.tiempoReal.alCambiar('pagos', 'cartera').pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.cargar(true));
  }

  onRango(r: RangoFechas): void { this.rango.set(r); this.pagina.set(1); this.cargar(); }
  cargar(silencioso = false): void {
    const r = this.rango();
    if (!r) return;
    if (!silencioso) this.cargando.set(true);
    this.cartera.recaudos(this.tipo, r.desde, r.hasta).subscribe({
      next: (d) => { this.datos.set(d); this.error.set(''); this.cargando.set(false); },
      error: (err) => { this.error.set(err.error?.mensaje || 'No se pudo cargar'); this.cargando.set(false); }
    });
  }
  filtrarMetodo(m: '' | MetodoPago): void { this.metodo.set(m); this.pagina.set(1); }

  descargar(p: Pago): void {
    this.cartera.obtenerPago(p._id).subscribe({
      next: async (completo) => { try { await this.pdf.recibo(completo, this.configService.actual()); } catch { this.notificacion.error('No se pudo generar el PDF'); } },
      error: () => this.notificacion.error('No se pudo obtener el recibo')
    });
  }

  anular(): void {
    const p = this.anulando();
    if (!p || this.motivo().trim().length < 5) return;
    this.guardando.set(true);
    this.errorAnular.set('');
    this.cartera.anularPago(p._id, this.motivo().trim()).subscribe({
      next: () => { this.guardando.set(false); this.anulando.set(null); this.motivo.set(''); this.notificacion.exito('Pago anulado'); this.cargar(true); },
      error: (err) => { this.guardando.set(false); this.errorAnular.set(err.error?.mensaje || 'No se pudo anular el pago'); }
    });
  }

  async exportar(formato: 'excel' | 'pdf'): Promise<void> {
    const d = this.datos();
    if (!d) return;
    this.exportando.set(true);
    try {
      const doc: DocumentoExport = {
        nombreArchivo: this.cobro() ? `recaudos-${d.rango.desde}-a-${d.rango.hasta}` : `pagos-proveedores-${d.rango.desde}-a-${d.rango.hasta}`,
        titulo: this.cobro() ? 'Recaudos' : 'Pagos a proveedores', subtitulo: `Del ${d.rango.desde} al ${d.rango.hasta}`, horizontal: true,
        resumen: [{ etiqueta: 'Total', valor: formatearDinero(d.resumen.total) }, { etiqueta: 'Pagos', valor: d.resumen.cantidad }, ...d.resumen.porMetodo.map((m) => ({ etiqueta: ETIQUETA_METODO[m.metodo], valor: formatearDinero(m.monto) }))],
        secciones: [{ titulo: 'Pagos', filas: d.pagos, columnas: [
          { encabezado: 'Recibo', valor: (p: Pago) => p.numero, ancho: 14 }, { encabezado: 'Fecha', tipo: 'fecha', valor: (p: Pago) => p.fecha, ancho: 18 },
          { encabezado: this.cobro() ? 'Cliente' : 'Proveedor', valor: (p: Pago) => p.contraparte, ancho: 30 }, { encabezado: this.cobro() ? 'Factura' : 'Orden', valor: (p: Pago) => p.referenciaDocumento, ancho: 14 },
          { encabezado: 'Forma', valor: (p: Pago) => ETIQUETA_METODO[p.metodo] }, { encabezado: 'Referencia', valor: (p: Pago) => p.referencia, ancho: 18 },
          { encabezado: 'Tipo', valor: (p: Pago) => (p.tipo === 'reembolso' ? 'Reembolso' : this.cobro() ? 'Pago' : 'Egreso') }, { encabezado: 'Estado', valor: (p: Pago) => (p.estado === 'anulado' ? 'Anulado' : 'Vigente') }, { encabezado: 'Monto', tipo: 'dinero', valor: (p: Pago) => (p.tipo === 'reembolso' ? -p.monto : p.monto) }
        ] }]
      };
      if (formato === 'excel') await this.exportador.excel(doc); else await this.exportador.pdf(doc);
      this.notificacion.exito(formato === 'excel' ? 'Descargado en Excel' : 'Descargado en PDF');
    } catch { this.notificacion.error('No se pudo generar el archivo.'); }
    finally { this.exportando.set(false); }
  }
}
