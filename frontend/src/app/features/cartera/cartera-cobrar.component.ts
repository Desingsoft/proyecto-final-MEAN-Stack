/**
 * Archivo: cartera-cobrar.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CarteraService } from '../../core/services/cartera.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { ExportarService, DocumentoExport } from '../../shared/services/exportar.service';
import { FilaAFavor, FilaCobrar, Pago, ResumenCartera, Situacion } from '../../core/models/negocio.model';
import { DineroPipe, formatearDinero } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DestinoPago, PagoModalComponent } from './pago-modal.component';
import { CLASE_TRAMO, textoMora } from './mora';

@Component({
  selector: 'app-cartera-cobrar',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, PagoModalComponent],
  template: `
    @if (resumen(); as r) {
      <div class="kpis">
        <div class="kpi acento"><span class="kpi-etiqueta">Por cobrar</span><span class="kpi-valor" [attr.title]="(r.totales.total | dinero)">{{ r.totales.total | dinero:true }}</span><span class="kpi-pie">{{ r.totales.documentos }} facturas con saldo</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Vencido</span><span class="kpi-valor" style="color: var(--agotado)" [attr.title]="(r.totales.vencido | dinero)">{{ r.totales.vencido | dinero:true }}</span><span class="kpi-pie">{{ r.totales.documentosVencidos }} facturas en mora</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Vence en 7 días</span><span class="kpi-valor" [attr.title]="(r.totales.porVencer | dinero)">{{ r.totales.porVencer | dinero:true }}</span><span class="kpi-pie">para gestionar ya</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Cobrado este mes</span><span class="kpi-valor" style="color: var(--ok-texto)" [attr.title]="((r.totales.cobradoMes ?? 0) | dinero)">{{ (r.totales.cobradoMes ?? 0) | dinero:true }}</span><span class="kpi-pie">cobros menos reembolsos</span></div>
        @if ((r.aFavor?.facturas ?? 0) > 0) { <div class="kpi"><span class="kpi-etiqueta">A favor de clientes</span><span class="kpi-valor" style="color: var(--critico-texto)" [attr.title]="((r.aFavor?.total ?? 0) | dinero)">{{ (r.aFavor?.total ?? 0) | dinero:true }}</span><span class="kpi-pie">por devolver ({{ r.aFavor?.facturas }} facturas)</span></div> }
      </div>

      <div class="grid-dash">
        <section class="panel">
          <div class="panel-header"><div><h2>Antigüedad de la cartera</h2><p class="nota">Cuánto llevan vencidas las deudas. Toca un tramo para ver esas facturas.</p></div></div>
          <div class="cinta" role="group" aria-label="Cartera por antigüedad">
            @for (t of r.antiguedad; track t.clave) {
              <button type="button" [class]="'cinta-seg ' + clase[t.clave] + (t.monto === 0 ? ' vacio-seg' : '')" [style.--peso]="t.monto" (click)="filtrarTramo(t.clave)" [attr.title]="t.cantidad + ' facturas'">
                <span class="n" style="font-size: 1.05rem">{{ t.monto | dinero:true }}</span><span class="t">{{ t.etiqueta }}</span>
              </button>
            }
          </div>
          <div class="tabla-wrap" style="margin-top: 1rem"><table class="tabla-tramos">
            <thead><tr><th>Tramo de mora</th><th class="num">Facturas</th><th class="num">Saldo</th><th class="num">Del total</th></tr></thead>
            <tbody>
              @for (t of r.antiguedad; track t.clave) {
                <tr><td>{{ t.etiqueta }}</td><td class="num">{{ t.cantidad }}</td><td class="num">{{ t.monto | dinero }}</td><td class="num">{{ porc(t.monto, r) }} %</td></tr>
              }
            </tbody>
          </table></div>
        </section>

        <section class="panel">
          <div class="panel-header"><div><h2>Quienes más deben</h2></div><a routerLink="/cartera/clientes">Ver todos</a></div>
          @if ((r.deudores ?? []).length === 0) { <p class="sin-datos">Nadie te debe nada.</p> } @else {
            <ol class="hbars">
              @for (d of r.deudores; track d.clave) {
                <li class="hbar-fila">
                  <span class="hbar-nombre" [attr.title]="d.nombre">{{ d.nombre }}</span><span class="hbar-valor">{{ d.saldo | dinero:true }}</span>
                  <span class="hbar-pista"><span class="hbar-relleno" [style.width.%]="porcentaje(d.saldo, r)" [style.background]="d.vencido > 0 ? 'var(--critico)' : 'var(--primario)'"></span></span>
                  <span class="hbar-detalle">{{ d.documentos }} facturas{{ d.vencido > 0 ? ', ' + (d.vencido | dinero:true) + ' vencido' : '' }}</span>
                </li>
              }
            </ol>
          }
        </section>
      </div>
    }

    @if (aFavor().length > 0) {
      <section class="panel">
        <div class="panel-header"><div><h2>Saldos a favor de clientes</h2><p class="nota">Pagaron de más porque una devolución bajó el valor de su factura. Devuélveles el dinero o déjalo para su próxima compra.</p></div></div>
        <div class="tabla-wrap"><table>
          <thead><tr><th>Factura</th><th>Cliente</th><th class="num">Acreditado</th><th class="num">A favor del cliente</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            @for (f of aFavor(); track f._id) {
              <tr>
                <td><a [routerLink]="['/documentos', f._id]" class="principal">{{ f.numero }}</a></td>
                <td>@if (f.clienteRef) { <a [routerLink]="['/clientes', f.clienteRef]">{{ f.cliente }}</a> } @else { {{ f.cliente }} }</td>
                <td class="num">{{ f.acreditado | dinero }}</td>
                <td class="num"><strong style="color: var(--critico-texto)">{{ f.aFavor | dinero }}</strong></td>
                <td><button type="button" class="btn-primary btn-sm" (click)="reembolsar(f)">Reembolsar</button></td>
              </tr>
            }
          </tbody>
        </table></div>
      </section>
    }

    <section class="panel">
      <div class="barra-filtros">
        <label class="buscador"><span class="sr-only">Buscar</span><app-icon name="buscar" [size]="17" />
          <input type="search" placeholder="Buscar por factura o cliente" [ngModel]="buscar()" (ngModelChange)="busqueda$.next($event.trim())" /></label>
        <div class="filtro-chips" role="group" aria-label="Situación">
          <button type="button" class="filtro-chip" [class.activo]="situacion() === ''" (click)="cambiarSituacion('')">Todas</button>
          <button type="button" class="filtro-chip" [class.activo]="situacion() === 'vencida'" (click)="cambiarSituacion('vencida')">Vencidas</button>
          <button type="button" class="filtro-chip" [class.activo]="situacion() === 'porVencer'" (click)="cambiarSituacion('porVencer')">Vencen pronto</button>
          <button type="button" class="filtro-chip" [class.activo]="situacion() === 'vigente'" (click)="cambiarSituacion('vigente')">Al día</button>
        </div>
        <span class="espaciador"></span>
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('excel')" [disabled]="exportando()"><app-icon name="excel" [size]="16" /> Excel</button>
        <button type="button" class="btn-secondary btn-sm" (click)="exportar('pdf')" [disabled]="exportando()"><app-icon name="pdf" [size]="16" /> PDF</button>
      </div>

      @if (cargando() && filas().length === 0) { <div class="skeleton" style="height: 260px"></div> }
      @else if (filas().length === 0) {
        <div class="vacio"><span class="icono-vacio"><app-icon name="check" [size]="26" /></span>
          <strong>{{ buscar() || situacion() ? 'No hay facturas con este filtro' : 'No tienes cartera pendiente' }}</strong>
          <p>{{ buscar() || situacion() ? 'Prueba con otro filtro.' : 'Las facturas a crédito con saldo aparecerán aquí.' }}</p></div>
      } @else {
        <div class="tabla-wrap" [style.opacity]="cargando() ? 0.55 : 1" style="transition: opacity 0.15s">
          <table>
            <thead><tr><th>Factura</th><th>Cliente</th><th>Vencimiento</th><th class="num">Total</th><th class="num">Abonado</th><th class="num">Saldo</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              @for (f of filas(); track f._id) {
                <tr>
                  <td><span class="celda-doble"><a [routerLink]="['/documentos', f._id]" class="principal">{{ f.numero }}</a><span class="secundaria">{{ f.fecha | date:'d MMM y' }}</span></span></td>
                  <td>@if (f.clienteRef) { <a [routerLink]="['/clientes', f.clienteRef]">{{ f.cliente }}</a> } @else { {{ f.cliente }} }</td>
                  <td>
                    <span class="celda-doble">
                      <span>{{ f.fechaVencimiento ? (f.fechaVencimiento | date:'d MMM y') : '—' }}</span>
                      <span [class]="'chip chip-mora ' + mora(f).clase" style="align-self: flex-start; margin-top: 0.15rem">{{ mora(f).texto }}</span>
                    </span>
                  </td>
                  <td class="num">{{ f.total | dinero }}</td>
                  <td class="num">{{ f.pagado | dinero }}</td>
                  <td class="num"><strong>{{ f.saldo | dinero }}</strong></td>
                  <td><button type="button" class="btn-primary btn-sm" (click)="pagar(f)"><app-icon name="entrada" [size]="15" /> Registrar pago</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginacion">
          <button type="button" (click)="cambiarPagina(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
          <span>Página {{ pagina() }} de {{ paginas() }}, {{ total() }} facturas, saldo {{ saldoFiltrado() | dinero }}</span>
          <button type="button" (click)="cambiarPagina(pagina() + 1)" [disabled]="pagina() === paginas()">Siguiente</button>
        </div>
      }
    </section>

    @if (destinoReembolso(); as d) { <app-pago-modal modo="reembolso" [destino]="d" (registrado)="alReembolsar($event)" (cerrar)="destinoReembolso.set(null)" /> }
    @if (destino(); as d) { <app-pago-modal modo="cobro" [destino]="d" (registrado)="alPagar($event)" (cerrar)="destino.set(null)" /> }
  `
})
export class CarteraCobrarComponent implements OnInit {
  private cartera = inject(CarteraService);
  private notificacion = inject(NotificacionService);
  private tiempoReal = inject(TiempoRealService);
  private exportador = inject(ExportarService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  readonly clase = CLASE_TRAMO;
  porc(monto: number, r: ResumenCartera): number { return r.totales.total > 0 ? Math.round((monto / r.totales.total) * 100) : 0; }
  readonly mora = (f: FilaCobrar) => textoMora(f.mora, f.fechaVencimiento);

  resumen = signal<ResumenCartera | null>(null);
  filas = signal<FilaCobrar[]>([]);
  total = signal(0);
  paginas = signal(1);
  pagina = signal(1);
  saldoFiltrado = signal(0);
  situacion = signal<'' | Situacion>('');
  buscar = signal('');
  cargando = signal(true);
  exportando = signal(false);
  destino = signal<DestinoPago | null>(null);
  aFavor = signal<FilaAFavor[]>([]);
  destinoReembolso = signal<DestinoPago | null>(null);
  busqueda$ = new Subject<string>();

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('buscar')) this.buscar.set(q.get('buscar')!);
    const s = q.get('situacion');
    if (s === 'vencida' || s === 'porVencer' || s === 'vigente') this.situacion.set(s);

    this.busqueda$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((t) => { this.buscar.set(t); this.pagina.set(1); this.cargarLista(); });
    this.tiempoReal.alCambiar('cartera', 'pagos', 'documentos', 'devoluciones').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarTodo());
    this.cargarTodo();
  }

  cargarTodo(): void { this.cargarResumen(); this.cargarLista(); }
  cargarResumen(): void {
    this.cartera.resumenCobrar().subscribe({ next: (r) => this.resumen.set(r), error: () => {} });
    this.cartera.aFavor().subscribe({ next: (r) => this.aFavor.set(r.facturas), error: () => {} });
  }
  reembolsar(f: FilaAFavor): void { this.destinoReembolso.set({ id: f._id, referencia: f.numero, contraparte: f.cliente, saldo: f.aFavor }); }
  alReembolsar(p: Pago): void { this.destinoReembolso.set(null); this.notificacion.exito(`Reembolso registrado: ${p.numero}`); this.cargarTodo(); }
  cargarLista(): void {
    this.cartera.listaCobrar(this.pagina(), this.situacion(), this.buscar()).subscribe({
      next: (r) => { this.filas.set(r.facturas); this.total.set(r.total); this.paginas.set(Math.max(r.paginas, 1)); this.saldoFiltrado.set(r.saldoFiltrado); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  cambiarSituacion(s: '' | Situacion): void { this.situacion.set(s); this.pagina.set(1); this.cargarLista(); }
  cambiarPagina(p: number): void { if (p >= 1 && p <= this.paginas()) { this.pagina.set(p); this.cargarLista(); } }
  filtrarTramo(clave: string): void { this.cambiarSituacion(clave === 'alDia' ? '' : 'vencida'); }
  porcentaje(valor: number, r: ResumenCartera): number { return (valor / Math.max(...(r.deudores ?? []).map((d) => d.saldo), 1)) * 100; }

  pagar(f: FilaCobrar): void { this.destino.set({ id: f._id, referencia: f.numero, contraparte: f.cliente, saldo: f.saldo }); }
  alPagar(pago: Pago): void {
    this.destino.set(null);
    this.notificacion.exito(`Pago registrado: recibo ${pago.numero}`);
    this.cargarTodo();
  }

  async exportar(formato: 'excel' | 'pdf'): Promise<void> {
    this.exportando.set(true);
    try {
      const todas = await new Promise<FilaCobrar[]>((ok, mal) => this.cartera.listaCobrar(1, this.situacion(), this.buscar(), 1000).subscribe({ next: (r) => ok(r.facturas), error: mal }));
      const r = this.resumen();
      const doc: DocumentoExport = {
        nombreArchivo: 'cartera-por-cobrar', titulo: 'Cartera por cobrar', subtitulo: `Corte al ${new Date().toLocaleDateString('es-CO')}`, horizontal: true,
        resumen: r ? [
          { etiqueta: 'Por cobrar', valor: formatearDinero(r.totales.total) }, { etiqueta: 'Vencido', valor: formatearDinero(r.totales.vencido) },
          { etiqueta: 'Vence en 7 días', valor: formatearDinero(r.totales.porVencer) }, { etiqueta: 'Facturas con saldo', valor: r.totales.documentos }
        ] : [],
        secciones: [
          { titulo: 'Facturas por cobrar', filas: todas, columnas: [
            { encabezado: 'Factura', valor: (f: FilaCobrar) => f.numero, ancho: 14 }, { encabezado: 'Cliente', valor: (f: FilaCobrar) => f.cliente, ancho: 32 },
            { encabezado: 'Emisión', tipo: 'fecha', valor: (f: FilaCobrar) => f.fecha, ancho: 18 }, { encabezado: 'Vencimiento', tipo: 'fecha', valor: (f: FilaCobrar) => f.fechaVencimiento, ancho: 18 },
            { encabezado: 'Días de mora', tipo: 'numero', valor: (f: FilaCobrar) => Math.max(f.mora, 0) }, { encabezado: 'Total', tipo: 'dinero', valor: (f: FilaCobrar) => f.total },
            { encabezado: 'Abonado', tipo: 'dinero', valor: (f: FilaCobrar) => f.pagado }, { encabezado: 'Saldo', tipo: 'dinero', valor: (f: FilaCobrar) => f.saldo }
          ] },
          ...(r ? [{ titulo: 'Antigüedad', filas: r.antiguedad, columnas: [
            { encabezado: 'Tramo', valor: (t: any) => t.etiqueta, ancho: 20 }, { encabezado: 'Facturas', tipo: 'numero' as const, valor: (t: any) => t.cantidad }, { encabezado: 'Saldo', tipo: 'dinero' as const, valor: (t: any) => t.monto }
          ] }] : [])
        ]
      };
      if (formato === 'excel') await this.exportador.excel(doc); else await this.exportador.pdf(doc);
      this.notificacion.exito(formato === 'excel' ? 'Cartera descargada en Excel' : 'Cartera descargada en PDF');
    } catch { this.notificacion.error('No se pudo generar el archivo. Inténtalo de nuevo.'); }
    finally { this.exportando.set(false); }
  }
}
