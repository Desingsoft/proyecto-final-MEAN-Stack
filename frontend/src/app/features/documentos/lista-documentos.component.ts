/**
 * Archivo: lista-documentos.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DocumentoService } from '../../core/services/documento.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { DocumentoResumen } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-lista-documentos',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Facturas y remisiones</h1>
        <p class="subtitulo">Documentos emitidos a tus clientes. Se generan desde el detalle de cada pedido.</p>
      </div>
      <a routerLink="/pedidos" class="btn-secondary">Ir a pedidos</a>
    </header>

    <section class="panel">
      <div class="barra-filtros">
        <label class="buscador">
          <span class="sr-only">Buscar documentos</span>
          <app-icon name="buscar" [size]="17" />
          <input type="search" placeholder="Buscar por número, cliente o documento" [ngModel]="buscar()" (ngModelChange)="busqueda$.next($event.trim())" />
        </label>
        <div class="filtro-chips" role="group" aria-label="Tipo de documento">
          <button type="button" class="filtro-chip" [class.activo]="tipo() === ''" (click)="cambiarTipo('')">Todos</button>
          <button type="button" class="filtro-chip" [class.activo]="tipo() === 'factura'" (click)="cambiarTipo('factura')">Facturas</button>
          <button type="button" class="filtro-chip" [class.activo]="tipo() === 'remision'" (click)="cambiarTipo('remision')">Remisiones</button>
          <button type="button" class="filtro-chip" [class.activo]="tipo() === 'nota_credito'" (click)="cambiarTipo('nota_credito')">Notas crédito</button>
        </div>
        <label>
          <span class="sr-only">Estado</span>
          <select [ngModel]="estado()" (ngModelChange)="cambiarEstado($event)">
            <option value="">Vigentes y anulados</option>
            <option value="emitida">Solo vigentes</option>
            <option value="anulada">Solo anulados</option>
          </select>
        </label>
      </div>

      @if (cargando() && documentos().length === 0) {
        <div class="skeleton" style="height: 300px"></div>
      } @else if (documentos().length === 0) {
        <div class="vacio">
          <span class="icono-vacio"><app-icon name="pdf" [size]="26" /></span>
          <strong>No hay documentos para mostrar</strong>
          <p>Abre un pedido y emite su remisión o su factura.</p>
        </div>
      } @else {
        <div class="tabla-wrap" [style.opacity]="cargando() ? 0.55 : 1" style="transition: opacity 0.15s">
          <table>
            <thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Pago</th><th class="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              @for (d of documentos(); track d._id) {
                <tr [style.opacity]="d.estado === 'anulada' ? 0.6 : 1">
                  <td>
                    <span class="celda-doble">
                      <a [routerLink]="['/documentos', d._id]" class="principal">{{ d.numero }}</a>
                      <span class="secundaria">{{ d.tipo === 'factura' ? 'Factura de venta' : d.tipo === 'nota_credito' ? 'Nota crédito · afecta ' + (d.numeroOrigen ?? '') : 'Remisión' }}</span>
                    </span>
                  </td>
                  <td>{{ d.cliente.nombre }}</td>
                  <td>{{ d.createdAt | date:'d MMM y' }}</td>
                  <td>
                    @if (d.tipo === 'nota_credito') { <span style="color: var(--texto-tenue)">Devolución</span> } @else if (d.tipo === 'factura') {
                      <span class="celda-doble">
                        <span>{{ d.formaPago === 'credito' ? 'Crédito' : 'Contado' }}@if (d.estado === 'emitida' && d.estadoPago) { <span [class]="'chip ' + chipPago(d.estadoPago)" style="margin-left: 0.35rem">{{ etiquetaPago(d.estadoPago) }}</span> }</span>
                        @if (d.fechaVencimiento) { <span class="secundaria">vence {{ d.fechaVencimiento | date:'d MMM y' }}</span> }
                      </span>
                    } @else { — }
                  </td>
                  <td class="num" [style.color]="d.tipo === 'nota_credito' ? 'var(--critico-texto)' : 'inherit'">{{ d.tipo === 'nota_credito' ? '− ' : '' }}{{ d.total | dinero }}</td>
                  <td><span [class]="'chip ' + (d.estado === 'anulada' ? 'chip-agotado' : 'chip-ok')">{{ d.estado === 'anulada' ? 'Anulada' : 'Vigente' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginacion">
          <button type="button" (click)="cambiarPagina(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
          <span>Página {{ pagina() }} de {{ paginas() }}, {{ total() }} documentos</span>
          <button type="button" (click)="cambiarPagina(pagina() + 1)" [disabled]="pagina() === paginas()">Siguiente</button>
        </div>
      }
    </section>
  `
})
export class ListaDocumentosComponent implements OnInit {
  private documentoService = inject(DocumentoService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  documentos = signal<DocumentoResumen[]>([]);
  total = signal(0);
  pagina = signal(1);
  paginas = signal(1);
  tipo = signal('');
  estado = signal('');
  buscar = signal('');
  cargando = signal(true);
  busqueda$ = new Subject<string>();

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((t) => { this.buscar.set(t); this.pagina.set(1); this.cargar(); });
    this.tiempoReal.alCambiar('documentos', 'pagos').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
    this.cargar();
  }

  cargar(): void {
    this.documentoService.listar(this.pagina(), this.tipo(), this.estado(), this.buscar()).subscribe({
      next: (r) => { this.documentos.set(r.documentos); this.total.set(r.total); this.paginas.set(Math.max(r.paginas, 1)); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  chipPago(e?: string): string { return e === 'pagada' ? 'chip-ok' : e === 'parcial' ? 'chip-aviso' : e === 'acreditada' ? 'chip-neutro' : 'chip-info'; }
  etiquetaPago(e?: string): string { return e === 'pagada' ? 'Pagada' : e === 'parcial' ? 'Abonada' : e === 'acreditada' ? 'Acreditada' : 'Pendiente'; }
  cambiarTipo(t: string): void { this.tipo.set(t); this.pagina.set(1); this.cargar(); }
  cambiarEstado(e: string): void { this.estado.set(e); this.pagina.set(1); this.cargar(); }
  cambiarPagina(p: number): void { if (p >= 1 && p <= this.paginas()) { this.pagina.set(p); this.cargar(); } }
}
