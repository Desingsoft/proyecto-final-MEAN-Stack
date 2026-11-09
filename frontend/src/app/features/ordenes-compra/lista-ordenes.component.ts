/**
 * Archivo: lista-ordenes.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { OrdenCompraService } from '../../core/services/orden-compra.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { EstadoOrden, OrdenCompra } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CHIP_ORDEN, ESTADOS_ORDEN, ETIQUETA_ORDEN } from './estado-orden';

@Component({
  selector: 'app-lista-ordenes',
  standalone: true,
  imports: [RouterLink, DatePipe, DineroPipe, IconComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Órdenes de compra</h1>
        <p class="subtitulo">Lo que pides a tus proveedores. Al recibir la mercancía, el stock sube solo y queda el movimiento registrado.</p>
      </div>
      <div class="page-header-acciones">
        <a routerLink="/reposicion" class="btn-secondary">Ver reposición</a>
        <a routerLink="/ordenes-compra/nueva" class="btn-primary"><app-icon name="mas" [size]="18" /> Nueva orden</a>
      </div>
    </header>

    <section class="panel">
      <div class="filtro-chips" role="group" aria-label="Estado de la orden" style="margin-bottom: 1rem">
        <button type="button" class="filtro-chip" [class.activo]="estado() === ''" (click)="filtrar('')">Todas</button>
        @for (e of estados; track e) {
          <button type="button" class="filtro-chip" [class.activo]="estado() === e" (click)="filtrar(e)">
            {{ etiqueta[e] }} <span class="conteo">{{ conteos()[e] ?? 0 }}</span>
          </button>
        }
      </div>

      @if (cargando() && ordenes().length === 0) {
        <div class="skeleton" style="height: 300px"></div>
      } @else if (ordenes().length === 0) {
        <div class="vacio">
          <span class="icono-vacio"><app-icon name="camion" [size]="26" /></span>
          <strong>No hay órdenes {{ estado() ? 'con este estado' : 'todavía' }}</strong>
          <p>Crea una orden a mano o genera borradores desde la pantalla de Reposición.</p>
          <a routerLink="/ordenes-compra/nueva" class="btn-primary">Crear una orden</a>
        </div>
      } @else {
        <div class="tabla-wrap" [style.opacity]="cargando() ? 0.55 : 1" style="transition: opacity 0.15s">
          <table>
            <thead><tr><th>Orden</th><th>Proveedor</th><th>Estado</th><th>Recepción</th><th class="num">Total</th><th>Entrega esperada</th></tr></thead>
            <tbody>
              @for (o of ordenes(); track o._id) {
                <tr>
                  <td>
                    <span class="celda-doble">
                      <a [routerLink]="['/ordenes-compra', o._id]" class="principal">{{ o.numero }}</a>
                      <span class="secundaria">{{ o.createdAt | date:'d MMM y' }}</span>
                    </span>
                  </td>
                  <td>{{ o.proveedor.nombre }}</td>
                  <td><span [class]="'chip ' + chip[o.estado]">{{ etiqueta[o.estado] }}</span></td>
                  <td style="min-width: 150px">
                    <div class="medidor" style="min-width: 0">
                      <div class="medidor-barra"><div class="medidor-relleno nivel-saludable" [style.width.%]="progreso(o)"></div></div>
                      <span style="font-size: 0.8rem; color: var(--texto-suave); white-space: nowrap">{{ o.unidadesRecibidas }}/{{ o.unidades }}</span>
                    </div>
                  </td>
                  <td class="num">{{ o.total | dinero }}</td>
                  <td>{{ o.fechaEsperada ? (o.fechaEsperada | date:'d MMM y') : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginacion">
          <button type="button" (click)="cambiarPagina(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
          <span>Página {{ pagina() }} de {{ paginas() }}</span>
          <button type="button" (click)="cambiarPagina(pagina() + 1)" [disabled]="pagina() === paginas()">Siguiente</button>
        </div>
      }
    </section>
  `
})
export class ListaOrdenesComponent implements OnInit {
  private ordenService = inject(OrdenCompraService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  readonly estados = ESTADOS_ORDEN;
  readonly etiqueta = ETIQUETA_ORDEN;
  readonly chip = CHIP_ORDEN;

  ordenes = signal<OrdenCompra[]>([]);
  conteos = signal<Partial<Record<EstadoOrden, number>>>({});
  estado = signal<'' | EstadoOrden>('');
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(true);

  ngOnInit(): void {
    this.cargar();
    this.tiempoReal.alCambiar('ordenes-compra').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.ordenService.listar(this.pagina(), this.estado()).subscribe({
      next: (r) => { this.ordenes.set(r.ordenes); this.conteos.set(r.conteos); this.paginas.set(Math.max(r.paginas, 1)); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  filtrar(e: '' | EstadoOrden): void { this.estado.set(e); this.pagina.set(1); this.cargar(); }
  cambiarPagina(p: number): void { if (p >= 1 && p <= this.paginas()) { this.pagina.set(p); this.cargar(); } }
  progreso(o: OrdenCompra): number { return o.unidades ? Math.round(((o.unidadesRecibidas ?? 0) / o.unidades) * 100) : 0; }
}
