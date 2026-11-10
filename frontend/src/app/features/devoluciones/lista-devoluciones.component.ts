/**
 * Archivo: lista-devoluciones.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevolucionService } from '../../core/services/devolucion.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { ExportarService, DocumentoExport } from '../../shared/services/exportar.service';
import { ETIQUETA_MOTIVO, FilaDevolucion, ListaDevoluciones, MOTIVOS_DEVOLUCION, MotivoDevolucion } from '../../core/models/negocio.model';
import { DineroPipe, formatearDinero } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RangoFechas, RangoFechasComponent } from '../../shared/components/rango-fechas/rango-fechas.component';

const POR_PAGINA = 12;

@Component({
  selector: 'app-lista-devoluciones',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, ModalComponent, RangoFechasComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Devoluciones</h1>
        <p class="subtitulo">Productos que tus clientes devolvieron. Se registran desde el detalle de cada pedido y, si tiene factura, generan su nota crédito.</p>
      </div>
      <div class="page-header-acciones">
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('excel')" [disabled]="!datos() || exportando()"><app-icon name="excel" [size]="16" /> Excel</button>
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('pdf')" [disabled]="!datos() || exportando()"><app-icon name="pdf" [size]="16" /> PDF</button>
      </div>
    </header>

    <div class="barra-filtros"><app-rango-fechas inicial="30d" (cambio)="onRango($event)" /></div>
    @if (error()) { <div class="error-alert" role="alert">{{ error() }}</div> }

    @if (cargando() && !datos()) {
      <div class="kpis">@for (i of [1, 2, 3, 4]; track i) { <div class="skeleton" style="height: 104px"></div> }</div>
      <div class="skeleton" style="height: 300px"></div>
    } @else {
      @if (datos(); as d) {
        <div class="kpis">
          <div class="kpi acento"><span class="kpi-etiqueta">Valor devuelto</span><span class="kpi-valor" [attr.title]="(d.resumen.valor | dinero)">{{ d.resumen.valor | dinero:true }}</span><span class="kpi-pie">del {{ d.rango.desde }} al {{ d.rango.hasta }}</span></div>
          <div class="kpi"><span class="kpi-etiqueta">Devoluciones</span><span class="kpi-valor">{{ d.resumen.cantidad }}</span><span class="kpi-pie">@if (d.resumen.anuladas > 0) { {{ d.resumen.anuladas }} anuladas } @else { sin anuladas }</span></div>
          <div class="kpi"><span class="kpi-etiqueta">Volvieron al inventario</span><span class="kpi-valor" style="color: var(--ok-texto)">{{ d.resumen.reintegradas }}</span><span class="kpi-pie">unidades en buen estado</span></div>
          <div class="kpi"><span class="kpi-etiqueta">Se descartaron</span><span class="kpi-valor" [style.color]="d.resumen.descartadas ? 'var(--agotado)' : 'inherit'">{{ d.resumen.descartadas }}</span><span class="kpi-pie">unidades dañadas</span></div>
        </div>

        @if (d.resumen.cantidad > 0) {
          <div class="grid-2">
            <section class="panel">
              <div class="panel-header"><div><h2>Por motivo</h2><p class="nota">Por qué devuelven tus clientes. Toca uno para filtrar.</p></div></div>
              <ul class="hbars">
                @for (m of d.porMotivo; track m.motivo) {
                  <li class="hbar-fila">
                    <button type="button" class="hbar-nombre" style="background: none; border: 0; padding: 0; text-align: left; cursor: pointer; font: inherit; color: inherit" (click)="filtrarMotivo(m.motivo)">{{ etiquetaMotivo[m.motivo] }}</button>
                    <span class="hbar-valor">{{ m.valor | dinero:true }}</span>
                    <span class="hbar-pista"><span class="hbar-relleno" [style.width.%]="m.valor / maxMotivo() * 100" style="background: var(--critico)"></span></span>
                    <span class="hbar-detalle">{{ m.cantidad }} {{ m.cantidad === 1 ? 'devolución' : 'devoluciones' }}</span>
                  </li>
                }
              </ul>
            </section>
            <section class="panel">
              <div class="panel-header"><div><h2>Productos más devueltos</h2><p class="nota">Los que más conviene revisar con el proveedor.</p></div></div>
              <ol class="hbars">
                @for (p of d.topProductos; track p.sku) {
                  <li class="hbar-fila"><span class="hbar-nombre">{{ p.descripcion }}</span><span class="hbar-valor">{{ p.unidades }} u.</span>
                    <span class="hbar-pista"><span class="hbar-relleno" [style.width.%]="p.unidades / maxProducto() * 100"></span></span>
                    <span class="hbar-detalle codigo">{{ p.sku }}, {{ p.valor | dinero:true }}</span></li>
                }
              </ol>
            </section>
          </div>
        }

        <section class="panel">
          <div class="barra-filtros">
            <div class="filtro-chips" role="group" aria-label="Motivo">
              <button type="button" class="filtro-chip" [class.activo]="motivo() === ''" (click)="filtrarMotivo('')">Todos</button>
              @for (m of motivos; track m) { <button type="button" class="filtro-chip" [class.activo]="motivo() === m" (click)="filtrarMotivo(m)">{{ etiquetaMotivo[m] }}</button> }
            </div>
            <label><span class="sr-only">Estado</span>
              <select [ngModel]="estado()" (ngModelChange)="estado.set($event); pagina.set(1)">
                <option value="">Vigentes y anuladas</option><option value="vigente">Solo vigentes</option><option value="anulada">Solo anuladas</option>
              </select></label>
          </div>

          @if (filtradas().length === 0) {
            <div class="vacio"><span class="icono-vacio"><app-icon name="refrescar" [size]="26" /></span><strong>No hay devoluciones en este periodo</strong>
              <p>Para registrar una, abre un pedido enviado o completado y usa "Registrar devolución".</p><a routerLink="/pedidos" class="btn-secondary">Ir a pedidos</a></div>
          } @else {
            <div class="tabla-wrap"><table>
              <thead><tr><th>Devolución</th><th>Cliente</th><th>Motivo</th><th class="num">Unidades</th><th>Nota crédito</th><th class="num">Valor</th><th><span class="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                @for (f of pagina$(); track f._id) {
                  <tr [style.opacity]="f.estado === 'anulada' ? 0.55 : 1">
                    <td><span class="celda-doble"><a [routerLink]="['/pedidos', f.pedido]" class="principal">{{ f.numero }}</a><span class="secundaria">{{ f.fecha | date:'d MMM y, h:mm a' }}@if (f.estado === 'anulada') { · anulada }</span></span></td>
                    <td>{{ f.cliente }}</td>
                    <td>{{ etiquetaMotivo[f.motivo] }}</td>
                    <td class="num">{{ f.unidades }}</td>
                    <td>@if (f.notaCredito) { <a [routerLink]="['/documentos', f.notaCredito._id]">{{ f.notaCredito.numero }}</a> } @else { <span style="color: var(--texto-tenue)">Sin factura</span> }</td>
                    <td class="num"><strong [style.text-decoration]="f.estado === 'anulada' ? 'line-through' : 'none'">{{ f.valor | dinero }}</strong></td>
                    <td>@if (f.estado === 'vigente' && esAdmin()) { <button type="button" class="btn-icono peligro" (click)="anulando.set(f)" title="Anular devolución" [attr.aria-label]="'Anular ' + f.numero"><app-icon name="papelera" [size]="17" /></button> }</td>
                  </tr>
                }
              </tbody>
            </table></div>
            <div class="paginacion">
              <button type="button" (click)="pagina.set(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
              <span>Página {{ pagina() }} de {{ totalPaginas() }}, {{ filtradas().length }} devoluciones</span>
              <button type="button" (click)="pagina.set(pagina() + 1)" [disabled]="pagina() === totalPaginas()">Siguiente</button>
            </div>
          }
        </section>
      }
    }

    @if (anulando(); as a) {
      <app-modal titulo="Anular devolución" [descripcion]="a.numero + ' · ' + (a.valor | dinero)" (cerrar)="anulando.set(null)">
        <p style="color: var(--texto-suave); margin-bottom: 1rem">Lo que volvió al inventario saldrá de nuevo y la nota crédito se anula. La factura recupera lo que se había acreditado.</p>
        <div class="form-group"><label for="ld-motivo">Motivo</label><input id="ld-motivo" type="text" [ngModel]="motivoAnular()" (ngModelChange)="motivoAnular.set($event)" (keydown.enter)="anular()" placeholder="Ej. La devolución estaba mal registrada" /></div>
        @if (errorAnular()) { <div class="error-alert" role="alert">{{ errorAnular() }}</div> }
        <div pie>
          <button type="button" class="btn-secondary" (click)="anulando.set(null)">Cancelar</button>
          <button type="button" class="btn-danger" style="min-height: 40px; font-size: 0.9rem" (click)="anular()" [disabled]="motivoAnular().trim().length < 5 || guardando()">{{ guardando() ? 'Anulando…' : 'Anular devolución' }}</button>
        </div>
      </app-modal>
    }
  `
})
export class ListaDevolucionesComponent {
  private devolucionService = inject(DevolucionService);
  private notificacion = inject(NotificacionService);
  private exportador = inject(ExportarService);
  private tiempoReal = inject(TiempoRealService);
  private auth = inject(AuthService);

  readonly motivos = MOTIVOS_DEVOLUCION;
  readonly etiquetaMotivo = ETIQUETA_MOTIVO;

  rango = signal<RangoFechas | null>(null);
  datos = signal<ListaDevoluciones | null>(null);
  cargando = signal(true);
  error = signal('');
  exportando = signal(false);
  motivo = signal<'' | MotivoDevolucion>('');
  estado = signal('');
  pagina = signal(1);
  anulando = signal<FilaDevolucion | null>(null);
  motivoAnular = signal('');
  errorAnular = signal('');
  guardando = signal(false);

  esAdmin = computed(() => { this.auth.usuarioActual(); return this.auth.tieneRol(['admin']); });
  maxMotivo = computed(() => Math.max(...(this.datos()?.porMotivo ?? []).map((m) => m.valor), 1));
  maxProducto = computed(() => Math.max(...(this.datos()?.topProductos ?? []).map((p) => p.unidades), 1));
  filtradas = computed(() => (this.datos()?.devoluciones ?? []).filter((d) => (!this.motivo() || d.motivo === this.motivo()) && (!this.estado() || d.estado === this.estado())));
  totalPaginas = computed(() => Math.max(Math.ceil(this.filtradas().length / POR_PAGINA), 1));
  pagina$ = computed(() => this.filtradas().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA));

  constructor() {
    this.tiempoReal.alCambiar('devoluciones').pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => this.cargar(true));
  }

  onRango(r: RangoFechas): void { this.rango.set(r); this.pagina.set(1); this.cargar(); }
  filtrarMotivo(m: '' | MotivoDevolucion): void { this.motivo.set(m); this.pagina.set(1); }

  cargar(silencioso = false): void {
    const r = this.rango();
    if (!r) return;
    if (!silencioso) this.cargando.set(true);
    this.devolucionService.listar(r.desde, r.hasta).subscribe({
      next: (d) => { this.datos.set(d); this.error.set(''); this.cargando.set(false); },
      error: (err) => { this.error.set(err.error?.mensaje || 'No se pudo cargar las devoluciones'); this.cargando.set(false); }
    });
  }

  anular(): void {
    const f = this.anulando();
    if (!f || this.motivoAnular().trim().length < 5) return;
    this.guardando.set(true);
    this.errorAnular.set('');
    this.devolucionService.anular(f._id, this.motivoAnular().trim()).subscribe({
      next: () => { this.guardando.set(false); this.anulando.set(null); this.motivoAnular.set(''); this.notificacion.exito('Devolución anulada'); this.cargar(true); },
      error: (err) => { this.guardando.set(false); this.errorAnular.set(err.error?.mensaje || 'No se pudo anular la devolución'); }
    });
  }

  async exportar(formato: 'excel' | 'pdf'): Promise<void> {
    const d = this.datos();
    if (!d) return;
    this.exportando.set(true);
    try {
      const doc: DocumentoExport = {
        nombreArchivo: `devoluciones-${d.rango.desde}-a-${d.rango.hasta}`, titulo: 'Devoluciones', subtitulo: `Del ${d.rango.desde} al ${d.rango.hasta}`, horizontal: true,
        resumen: [
          { etiqueta: 'Valor devuelto', valor: formatearDinero(d.resumen.valor) }, { etiqueta: 'Devoluciones', valor: d.resumen.cantidad },
          { etiqueta: 'Unidades al inventario', valor: d.resumen.reintegradas }, { etiqueta: 'Unidades descartadas', valor: d.resumen.descartadas }
        ],
        secciones: [
          { titulo: 'Devoluciones', filas: this.filtradas(), columnas: [
            { encabezado: 'Devolución', valor: (f: FilaDevolucion) => f.numero, ancho: 14 }, { encabezado: 'Fecha', tipo: 'fecha', valor: (f: FilaDevolucion) => f.fecha, ancho: 18 },
            { encabezado: 'Cliente', valor: (f: FilaDevolucion) => f.cliente, ancho: 30 }, { encabezado: 'Motivo', valor: (f: FilaDevolucion) => ETIQUETA_MOTIVO[f.motivo], ancho: 22 },
            { encabezado: 'Unidades', tipo: 'numero', valor: (f: FilaDevolucion) => f.unidades }, { encabezado: 'Nota crédito', valor: (f: FilaDevolucion) => f.notaCredito?.numero ?? 'Sin factura' },
            { encabezado: 'Estado', valor: (f: FilaDevolucion) => (f.estado === 'anulada' ? 'Anulada' : 'Vigente') }, { encabezado: 'Valor', tipo: 'dinero', valor: (f: FilaDevolucion) => f.valor }
          ] },
          { titulo: 'Por motivo', filas: d.porMotivo, columnas: [
            { encabezado: 'Motivo', valor: (m: any) => ETIQUETA_MOTIVO[m.motivo as MotivoDevolucion], ancho: 24 }, { encabezado: 'Devoluciones', tipo: 'numero', valor: (m: any) => m.cantidad }, { encabezado: 'Valor', tipo: 'dinero', valor: (m: any) => m.valor }
          ] }
        ]
      };
      if (formato === 'excel') await this.exportador.excel(doc); else await this.exportador.pdf(doc);
      this.notificacion.exito(formato === 'excel' ? 'Descargado en Excel' : 'Descargado en PDF');
    } catch { this.notificacion.error('No se pudo generar el archivo.'); }
    finally { this.exportando.set(false); }
  }
}
