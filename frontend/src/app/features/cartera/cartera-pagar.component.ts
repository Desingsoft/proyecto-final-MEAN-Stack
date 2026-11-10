/**
 * Archivo: cartera-pagar.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CarteraService } from '../../core/services/cartera.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { ExportarService, DocumentoExport } from '../../shared/services/exportar.service';
import { FilaPagar, Pago, ResumenCartera, Situacion } from '../../core/models/negocio.model';
import { DineroPipe, formatearDinero } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DestinoPago, PagoModalComponent } from './pago-modal.component';
import { CLASE_TRAMO, textoMora } from './mora';

@Component({
  selector: 'app-cartera-pagar',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, PagoModalComponent],
  template: `
    @if (resumen(); as r) {
      <div class="kpis">
        <div class="kpi acento"><span class="kpi-etiqueta">Por pagar a proveedores</span><span class="kpi-valor" [attr.title]="(r.totales.total | dinero)">{{ r.totales.total | dinero:true }}</span><span class="kpi-pie">{{ r.totales.documentos }} órdenes con saldo</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Vencido</span><span class="kpi-valor" style="color: var(--agotado)" [attr.title]="(r.totales.vencido | dinero)">{{ r.totales.vencido | dinero:true }}</span><span class="kpi-pie">{{ r.totales.documentosVencidos }} en mora</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Vence en 7 días</span><span class="kpi-valor" [attr.title]="(r.totales.porVencer | dinero)">{{ r.totales.porVencer | dinero:true }}</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Pagado este mes</span><span class="kpi-valor" [attr.title]="((r.totales.pagadoMes ?? 0) | dinero)">{{ (r.totales.pagadoMes ?? 0) | dinero:true }}</span></div>
      </div>
      <div class="grid-dash">
        <section class="panel">
          <div class="panel-header"><div><h2>Antigüedad de lo que debes</h2><p class="nota">Se debe el valor de la mercancía ya recibida.</p></div></div>
          <div class="cinta" role="group">
            @for (t of r.antiguedad; track t.clave) {
              <button type="button" [class]="'cinta-seg ' + clase[t.clave] + (t.monto === 0 ? ' vacio-seg' : '')" [style.--peso]="t.monto" [attr.title]="t.cantidad + ' órdenes'">
                <span class="n" style="font-size: 1.05rem">{{ t.monto | dinero:true }}</span><span class="t">{{ t.etiqueta }}</span>
              </button>
            }
          </div>
          <div class="tabla-wrap" style="margin-top: 1rem"><table class="tabla-tramos">
            <thead><tr><th>Tramo de mora</th><th class="num">Órdenes</th><th class="num">Saldo</th><th class="num">Del total</th></tr></thead>
            <tbody>
              @for (t of r.antiguedad; track t.clave) {
                <tr><td>{{ t.etiqueta }}</td><td class="num">{{ t.cantidad }}</td><td class="num">{{ t.monto | dinero }}</td><td class="num">{{ porc(t.monto, r) }} %</td></tr>
              }
            </tbody>
          </table></div>
        </section>
        <section class="panel">
          <div class="panel-header"><div><h2>A quién le debes más</h2></div></div>
          @if ((r.acreedores ?? []).length === 0) { <p class="sin-datos">No debes nada.</p> } @else {
            <ol class="hbars">
              @for (a of r.acreedores; track a.clave) {
                <li class="hbar-fila"><span class="hbar-nombre">{{ a.nombre }}</span><span class="hbar-valor">{{ a.saldo | dinero:true }}</span>
                  <span class="hbar-pista"><span class="hbar-relleno" [style.width.%]="a.saldo / maxAcreedor(r) * 100" [style.background]="a.vencido > 0 ? 'var(--critico)' : 'var(--primario)'"></span></span>
                  <span class="hbar-detalle">{{ a.documentos }} órdenes</span></li>
              }
            </ol>
          }
        </section>
      </div>
    }

    <section class="panel">
      <div class="barra-filtros">
        <label class="buscador"><span class="sr-only">Buscar</span><app-icon name="buscar" [size]="17" />
          <input type="search" placeholder="Buscar por orden, proveedor o factura" [ngModel]="buscar()" (ngModelChange)="busqueda$.next($event.trim())" /></label>
        <div class="filtro-chips" role="group" aria-label="Situación">
          <button type="button" class="filtro-chip" [class.activo]="situacion() === ''" (click)="cambiarSituacion('')">Todas</button>
          <button type="button" class="filtro-chip" [class.activo]="situacion() === 'vencida'" (click)="cambiarSituacion('vencida')">Vencidas</button>
          <button type="button" class="filtro-chip" [class.activo]="situacion() === 'porVencer'" (click)="cambiarSituacion('porVencer')">Vencen pronto</button>
        </div>
        <span class="espaciador"></span>
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('excel')" [disabled]="exportando()"><app-icon name="excel" [size]="16" /> Excel</button>
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('pdf')" [disabled]="exportando()"><app-icon name="pdf" [size]="16" /> PDF</button>
      </div>
      @if (cargando() && filas().length === 0) { <div class="skeleton" style="height: 240px"></div> }
      @else if (filas().length === 0) {
        <div class="vacio"><span class="icono-vacio"><app-icon name="check" [size]="26" /></span><strong>No tienes cuentas por pagar</strong>
          <p>Aparecen cuando recibes mercancía de una orden de compra.</p><a routerLink="/ordenes-compra" class="btn-secondary">Ver órdenes de compra</a></div>
      } @else {
        <div class="tabla-wrap" [style.opacity]="cargando() ? 0.55 : 1">
          <table>
            <thead><tr><th>Orden</th><th>Proveedor</th><th>Vencimiento</th><th class="num">Recibido</th><th class="num">Pagado</th><th class="num">Saldo</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              @for (o of filas(); track o._id) {
                <tr>
                  <td><span class="celda-doble"><a [routerLink]="['/ordenes-compra', o._id]" class="principal">{{ o.numero }}</a>@if (o.facturaProveedor) { <span class="secundaria">Factura {{ o.facturaProveedor }}</span> }</span></td>
                  <td>{{ o.proveedor }}</td>
                  <td><span class="celda-doble"><span>{{ o.fechaVencimiento ? (o.fechaVencimiento | date:'d MMM y') : '—' }}</span>
                    <span [class]="'chip chip-mora ' + mora(o).clase" style="align-self: flex-start; margin-top: 0.15rem">{{ mora(o).texto }}</span></span></td>
                  <td class="num">{{ o.total | dinero }}</td><td class="num">{{ o.pagado | dinero }}</td><td class="num"><strong>{{ o.saldo | dinero }}</strong></td>
                  <td><button type="button" class="btn-primary btn-sm" (click)="pagar(o)"><app-icon name="entrada" [size]="15" /> Pagar</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginacion">
          <button type="button" (click)="cambiarPagina(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
          <span>Página {{ pagina() }} de {{ paginas() }}, saldo {{ saldoFiltrado() | dinero }}</span>
          <button type="button" (click)="cambiarPagina(pagina() + 1)" [disabled]="pagina() === paginas()">Siguiente</button>
        </div>
      }
    </section>
    @if (destino(); as d) { <app-pago-modal modo="egreso" [destino]="d" (registrado)="alPagar($event)" (cerrar)="destino.set(null)" /> }
  `
})
export class CarteraPagarComponent implements OnInit {
  private cartera = inject(CarteraService);
  private notificacion = inject(NotificacionService);
  private tiempoReal = inject(TiempoRealService);
  private exportador = inject(ExportarService);
  private destroyRef = inject(DestroyRef);

  readonly clase = CLASE_TRAMO;
  porc(monto: number, r: ResumenCartera): number { return r.totales.total > 0 ? Math.round((monto / r.totales.total) * 100) : 0; }
  readonly mora = (o: FilaPagar) => textoMora(o.mora, o.fechaVencimiento);
  resumen = signal<ResumenCartera | null>(null);
  filas = signal<FilaPagar[]>([]);
  paginas = signal(1); pagina = signal(1); saldoFiltrado = signal(0);
  situacion = signal<'' | Situacion>(''); buscar = signal('');
  cargando = signal(true); exportando = signal(false);
  destino = signal<DestinoPago | null>(null);
  busqueda$ = new Subject<string>();
  maxAcreedor = (r: ResumenCartera) => Math.max(...(r.acreedores ?? []).map((a) => a.saldo), 1);

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((t) => { this.buscar.set(t); this.pagina.set(1); this.cargarLista(); });
    this.tiempoReal.alCambiar('cartera', 'pagos', 'ordenes-compra').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarTodo());
    this.cargarTodo();
  }
  cargarTodo(): void { this.cartera.resumenPagar().subscribe({ next: (r) => this.resumen.set(r), error: () => {} }); this.cargarLista(); }
  cargarLista(): void {
    this.cartera.listaPagar(this.pagina(), this.situacion(), this.buscar()).subscribe({
      next: (r) => { this.filas.set(r.ordenes); this.paginas.set(Math.max(r.paginas, 1)); this.saldoFiltrado.set(r.saldoFiltrado); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }
  cambiarSituacion(s: '' | Situacion): void { this.situacion.set(s); this.pagina.set(1); this.cargarLista(); }
  cambiarPagina(p: number): void { if (p >= 1 && p <= this.paginas()) { this.pagina.set(p); this.cargarLista(); } }
  pagar(o: FilaPagar): void { this.destino.set({ id: o._id, referencia: o.numero, contraparte: o.proveedor, saldo: o.saldo }); }
  alPagar(p: Pago): void { this.destino.set(null); this.notificacion.exito(`Pago registrado: ${p.numero}`); this.cargarTodo(); }

  async exportar(formato: 'excel' | 'pdf'): Promise<void> {
    this.exportando.set(true);
    try {
      const todas = await new Promise<FilaPagar[]>((ok, mal) => this.cartera.listaPagar(1, this.situacion(), this.buscar(), 1000).subscribe({ next: (r) => ok(r.ordenes), error: mal }));
      const r = this.resumen();
      const doc: DocumentoExport = {
        nombreArchivo: 'cuentas-por-pagar', titulo: 'Cuentas por pagar', subtitulo: `Corte al ${new Date().toLocaleDateString('es-CO')}`, horizontal: true,
        resumen: r ? [{ etiqueta: 'Por pagar', valor: formatearDinero(r.totales.total) }, { etiqueta: 'Vencido', valor: formatearDinero(r.totales.vencido) }, { etiqueta: 'Órdenes con saldo', valor: r.totales.documentos }] : [],
        secciones: [{ titulo: 'Órdenes por pagar', filas: todas, columnas: [
          { encabezado: 'Orden', valor: (o: FilaPagar) => o.numero, ancho: 14 }, { encabezado: 'Proveedor', valor: (o: FilaPagar) => o.proveedor, ancho: 30 },
          { encabezado: 'Factura proveedor', valor: (o: FilaPagar) => o.facturaProveedor, ancho: 18 }, { encabezado: 'Vencimiento', tipo: 'fecha', valor: (o: FilaPagar) => o.fechaVencimiento, ancho: 18 },
          { encabezado: 'Días de mora', tipo: 'numero', valor: (o: FilaPagar) => Math.max(o.mora, 0) }, { encabezado: 'Recibido', tipo: 'dinero', valor: (o: FilaPagar) => o.total },
          { encabezado: 'Pagado', tipo: 'dinero', valor: (o: FilaPagar) => o.pagado }, { encabezado: 'Saldo', tipo: 'dinero', valor: (o: FilaPagar) => o.saldo }
        ] }]
      };
      if (formato === 'excel') await this.exportador.excel(doc); else await this.exportador.pdf(doc);
      this.notificacion.exito(formato === 'excel' ? 'Descargado en Excel' : 'Descargado en PDF');
    } catch { this.notificacion.error('No se pudo generar el archivo.'); }
    finally { this.exportando.set(false); }
  }
}
