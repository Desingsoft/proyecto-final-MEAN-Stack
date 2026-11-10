/**
 * Archivo: cliente-detalle.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ClienteService } from '../../core/services/cliente.service';
import { CarteraService } from '../../core/services/cartera.service';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { DocumentosPdfService } from '../../shared/services/documentos-pdf.service';
import { EstadoCuenta } from '../../core/models/negocio.model';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { ClienteFicha } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CLASE_ESTADO_PEDIDO } from '../../shared/utils/stock';
import { ClienteFormModalComponent } from './cliente-form-modal.component';

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [RouterLink, DatePipe, DineroPipe, IconComponent, ClienteFormModalComponent],
  template: `
    <a routerLink="/clientes" class="volver"><app-icon name="atras" [size]="14" /> Volver a clientes</a>

    @if (cargando()) {
      <div class="skeleton" style="height: 320px; margin-top: 1rem"></div>
    } @else {
      @if (cliente(); as c) {
      <header class="page-header" style="margin-top: 0.75rem">
        <div>
          <h1>{{ c.nombre }}</h1>
          <p class="subtitulo">{{ c.documento ? c.tipoDocumento + ' ' + c.documento : 'Sin documento registrado' }}</p>
        </div>
        <div class="page-header-acciones">
          <button type="button" class="btn-secondary" (click)="editando.set(true)"><app-icon name="editar" [size]="16" /> Editar</button>
          <a routerLink="/pedidos/nuevo" [queryParams]="{ cliente: c._id }" class="btn-primary"><app-icon name="mas" [size]="18" /> Nuevo pedido</a>
        </div>
      </header>

      <div class="kpis">
        <div class="kpi"><span class="kpi-etiqueta">Pedidos</span><span class="kpi-valor">{{ c.estadisticas.pedidos }}</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Total comprado</span><span class="kpi-valor" [attr.title]="(c.estadisticas.totalComprado | dinero)">{{ c.estadisticas.totalComprado | dinero:true }}</span><span class="kpi-pie">sin contar pedidos cancelados</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Ticket promedio</span><span class="kpi-valor" [attr.title]="(c.estadisticas.ticketPromedio | dinero)">{{ c.estadisticas.ticketPromedio | dinero:true }}</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Última compra</span><span class="kpi-valor" style="font-size: 1.35rem">{{ c.estadisticas.ultimaCompra ? (c.estadisticas.ultimaCompra | date:'d MMM y') : 'Ninguna' }}</span></div>
      </div>

      @if (cuenta(); as e) {
        <section class="panel">
          <div class="panel-header">
            <div><h2>Cartera</h2><p class="nota">Lo que debe este cliente por sus facturas a crédito.</p></div>
            <div class="page-header-acciones">
              <a routerLink="/cartera/cobrar" [queryParams]="{ buscar: c.nombre }" class="btn-secondary btn-sm">Ver facturas</a>
              <button type="button" class="btn-primary btn-sm" (click)="estadoCuenta()" [disabled]="generando()"><app-icon name="pdf" [size]="15" /> {{ generando() ? 'Generando…' : 'Estado de cuenta' }}</button>
            </div>
          </div>
          <div style="display: flex; gap: 2.5rem; flex-wrap: wrap">
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Saldo por cobrar</span><br /><strong style="font-family: var(--fuente-titulo); font-size: 1.5rem">{{ e.resumen.total | dinero }}</strong></div>
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Vencido</span><br /><strong style="font-family: var(--fuente-titulo); font-size: 1.5rem" [style.color]="e.resumen.vencido > 0 ? 'var(--agotado)' : 'inherit'">{{ e.resumen.vencido | dinero }}</strong></div>
            @if (e.resumen.cupo > 0) {
              <div><span style="color: var(--texto-suave); font-size: 0.82rem">Cupo disponible</span><br /><strong style="font-family: var(--fuente-titulo); font-size: 1.5rem">{{ (e.resumen.disponible ?? 0) | dinero }}</strong> <span style="color: var(--texto-tenue)">de {{ e.resumen.cupo | dinero:true }}</span></div>
            } @else { <div><span style="color: var(--texto-suave); font-size: 0.82rem">Cupo de crédito</span><br /><strong>Sin límite</strong></div> }
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Plazo</span><br /><strong>{{ c.diasCredito != null ? c.diasCredito + ' días' : 'Estándar' }}</strong></div>
          </div>
        </section>
      }

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><h2>Datos de contacto</h2></div></div>
          <dl style="display: grid; grid-template-columns: 8rem 1fr; gap: 0.6rem 1rem; margin: 0">
            <dt style="color: var(--texto-suave)">Teléfono</dt><dd style="margin: 0">{{ c.telefono || '—' }}</dd>
            <dt style="color: var(--texto-suave)">Correo</dt><dd style="margin: 0">{{ c.email || '—' }}</dd>
            <dt style="color: var(--texto-suave)">Dirección</dt><dd style="margin: 0">{{ c.direccion || '—' }}</dd>
            <dt style="color: var(--texto-suave)">Ciudad</dt><dd style="margin: 0">{{ c.ciudad || '—' }}</dd>
            @if (c.notas) { <dt style="color: var(--texto-suave)">Notas</dt><dd style="margin: 0">{{ c.notas }}</dd> }
          </dl>
        </section>

        <section class="panel">
          <div class="panel-header"><div><h2>Documentos recientes</h2></div><a routerLink="/documentos">Ver todos</a></div>
          @if (c.documentos.length === 0) { <p class="sin-datos">Aún no se han emitido facturas ni remisiones.</p> } @else {
            <div class="tabla-wrap"><table>
              <thead><tr><th>Número</th><th>Estado</th><th class="num">Total</th></tr></thead>
              <tbody>
                @for (d of c.documentos; track d._id) {
                  <tr>
                    <td><a [routerLink]="['/documentos', d._id]">{{ d.numero }}</a></td>
                    <td><span [class]="'chip ' + (d.estado === 'anulada' ? 'chip-agotado' : d.tipo === 'factura' ? 'chip-primario' : 'chip-neutro')">{{ d.estado === 'anulada' ? 'Anulada' : d.tipo === 'factura' ? 'Factura' : 'Remisión' }}</span></td>
                    <td class="num">{{ d.total | dinero }}</td>
                  </tr>
                }
              </tbody>
            </table></div>
          }
        </section>
      </div>

      <section class="panel">
        <div class="panel-header"><div><h2>Pedidos recientes</h2></div></div>
        @if (c.pedidos.length === 0) { <p class="sin-datos">Este cliente todavía no tiene pedidos registrados con su ficha.</p> } @else {
          <div class="tabla-wrap"><table>
            <thead><tr><th>Fecha</th><th>Estado</th><th class="num">Unidades</th><th class="num">Total</th></tr></thead>
            <tbody>
              @for (p of c.pedidos; track p._id) {
                <tr>
                  <td><a [routerLink]="['/pedidos', p._id]">{{ p.createdAt | date:'d MMM y, h:mm a' }}</a></td>
                  <td><span [class]="'badge ' + (estados[p.estado] || 'badge-secondary')">{{ p.estado }}</span></td>
                  <td class="num">{{ p.unidades }}</td>
                  <td class="num">{{ p.total | dinero }}</td>
                </tr>
              }
            </tbody>
          </table></div>
        }
      </section>

      @if (editando()) {
        <app-cliente-form-modal [cliente]="c" (guardado)="alGuardar()" (cerrar)="editando.set(false)" />
      }
    } @else {
      <div class="panel vacio" style="margin-top: 1rem">
        <span class="icono-vacio"><app-icon name="alerta" [size]="26" /></span>
        <strong>No encontramos este cliente</strong>
        <a routerLink="/clientes" class="btn-secondary">Volver a la lista</a>
      </div>
    }
    }
  `
})
export class ClienteDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private clienteService = inject(ClienteService);
  private carteraService = inject(CarteraService);
  private configService = inject(ConfiguracionService);
  private pdf = inject(DocumentosPdfService);
  private notificacion = inject(NotificacionService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  readonly estados = CLASE_ESTADO_PEDIDO;
  cuenta = signal<EstadoCuenta | null>(null);
  generando = signal(false);
  cliente = signal<ClienteFicha | null>(null);
  cargando = signal(true);
  editando = signal(false);

  ngOnInit(): void {
    this.configService.obtener().subscribe({ error: () => {} });
    this.cargar();
    this.tiempoReal.alCambiar('clientes', 'pedidos', 'documentos', 'pagos', 'cartera').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.clienteService.obtener(this.route.snapshot.paramMap.get('id')!).subscribe({
      next: (c) => { this.cliente.set(c); this.cargando.set(false); this.carteraService.estadoCuenta(c._id!).subscribe({ next: (e) => this.cuenta.set(e), error: () => {} }); },
      error: () => { this.cliente.set(null); this.cargando.set(false); }
    });
  }

  async estadoCuenta(): Promise<void> {
    const e = this.cuenta();
    if (!e) return;
    this.generando.set(true);
    try { await this.pdf.estadoCuenta(e, this.configService.actual()); } catch { this.notificacion.error('No se pudo generar el PDF'); }
    this.generando.set(false);
  }

  alGuardar(): void {
    this.editando.set(false);
    this.notificacion.exito('Cliente actualizado');
    this.cargar();
  }
}
