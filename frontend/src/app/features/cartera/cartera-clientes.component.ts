/**
 * Archivo: cartera-clientes.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CarteraService } from '../../core/services/cartera.service';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { DocumentosPdfService } from '../../shared/services/documentos-pdf.service';
import { SaldoCliente } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-cartera-clientes',
  standalone: true,
  imports: [RouterLink, DineroPipe, IconComponent],
  template: `
    <section class="panel">
      <div class="panel-header"><div><h2>Saldo por cliente</h2><p class="nota">Quién te debe, cuánto está vencido y cuánto cupo de crédito le queda.</p></div></div>
      @if (cargando()) { <div class="skeleton" style="height: 260px"></div> }
      @else if (clientes().length === 0) {
        <div class="vacio"><span class="icono-vacio"><app-icon name="check" [size]="26" /></span><strong>Ningún cliente tiene saldo pendiente</strong></div>
      } @else {
        <div class="tabla-wrap"><table>
          <thead><tr><th>Cliente</th><th class="num">Facturas</th><th class="num">Saldo</th><th class="num">Vencido</th><th>Cupo de crédito</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            @for (c of clientes(); track c.cliente) {
              <tr>
                <td><span class="celda-doble">
                  @if (c.clienteRef) { <a [routerLink]="['/clientes', c.clienteRef]" class="principal">{{ c.cliente }}</a> } @else { <span class="principal">{{ c.cliente }}</span> <span class="secundaria">Sin ficha de cliente</span> }
                  @if (c.mayorMora > 0) { <span class="secundaria" style="color: var(--critico-texto)">Mora máxima: {{ c.mayorMora }} días</span> }
                </span></td>
                <td class="num">{{ c.facturas }}</td>
                <td class="num"><strong>{{ c.saldo | dinero }}</strong></td>
                <td class="num" [style.color]="c.vencido > 0 ? 'var(--agotado)' : 'inherit'">{{ c.vencido | dinero }}</td>
                <td style="min-width: 170px">
                  @if (c.cupo > 0) {
                    <span class="medidor" style="min-width: 0"><span class="medidor-barra"><span class="medidor-relleno" [class]="'medidor-relleno ' + (c.saldo / c.cupo > 0.9 ? 'nivel-agotado' : c.saldo / c.cupo > 0.7 ? 'nivel-bajo' : 'nivel-saludable')" [style.width.%]="min(c.saldo / c.cupo * 100)"></span></span></span>
                    <span style="font-size: 0.78rem; color: var(--texto-suave)">Disponible {{ (c.disponible ?? 0) | dinero:true }} de {{ c.cupo | dinero:true }}</span>
                  } @else { <span style="color: var(--texto-tenue)">Sin límite</span> }
                </td>
                <td>
                  <span class="acciones" style="justify-content: flex-end">
                    <a [routerLink]="['/cartera/cobrar']" [queryParams]="{ buscar: c.cliente }" class="btn-secondary btn-sm">Ver facturas</a>
                    @if (c.clienteRef) { <button type="button" class="btn-secondary btn-sm" (click)="estadoCuenta(c)" [disabled]="generando() === c.clienteRef"><app-icon name="pdf" [size]="15" /> Estado de cuenta</button> }
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table></div>
      }
    </section>
  `
})
export class CarteraClientesComponent implements OnInit {
  private cartera = inject(CarteraService);
  private configService = inject(ConfiguracionService);
  private notificacion = inject(NotificacionService);
  private tiempoReal = inject(TiempoRealService);
  private pdf = inject(DocumentosPdfService);
  private destroyRef = inject(DestroyRef);

  clientes = signal<SaldoCliente[]>([]);
  cargando = signal(true);
  generando = signal<string | null>(null);
  min = (n: number) => Math.min(n, 100);

  ngOnInit(): void {
    this.configService.obtener().subscribe({ error: () => {} });
    this.cargar();
    this.tiempoReal.alCambiar('cartera', 'pagos', 'documentos', 'clientes').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void { this.cartera.porCliente().subscribe({ next: (c) => { this.clientes.set(c); this.cargando.set(false); }, error: () => this.cargando.set(false) }); }

  estadoCuenta(c: SaldoCliente): void {
    if (!c.clienteRef) return;
    this.generando.set(c.clienteRef);
    this.cartera.estadoCuenta(c.clienteRef).subscribe({
      next: async (ec) => {
        try { await this.pdf.estadoCuenta(ec, this.configService.actual()); } catch { this.notificacion.error('No se pudo generar el PDF'); }
        this.generando.set(null);
      },
      error: () => { this.generando.set(null); this.notificacion.error('No se pudo obtener el estado de cuenta'); }
    });
  }
}
