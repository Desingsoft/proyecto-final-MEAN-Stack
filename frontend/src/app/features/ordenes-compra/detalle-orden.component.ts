/**
 * Archivo: detalle-orden.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdenCompraService } from '../../core/services/orden-compra.service';
import { CarteraService } from '../../core/services/cartera.service';
import { AuthService } from '../../core/services/auth.service';
import { ETIQUETA_METODO, Pago } from '../../core/models/negocio.model';
import { PagoModalComponent } from '../cartera/pago-modal.component';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { DocumentosPdfService } from '../../shared/services/documentos-pdf.service';
import { EstadoOrden, ItemOrden, OrdenCompra } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { CHIP_ORDEN, ETIQUETA_ORDEN } from './estado-orden';

interface Recepcion { item: ItemOrden; id: string; nombre: string; sku: string; pendiente: number; cantidad: number; }

@Component({
  selector: 'app-detalle-orden',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, ModalComponent, PagoModalComponent],
  template: `
    <a routerLink="/ordenes-compra" class="volver"><app-icon name="atras" [size]="14" /> Volver a órdenes de compra</a>

    @if (cargando()) {
      <div class="skeleton" style="height: 380px; margin-top: 1rem"></div>
    } @else {
      @if (orden(); as o) {
      <header class="page-header" style="margin-top: 0.75rem">
        <div>
          <h1>Orden {{ o.numero }} <span [class]="'chip ' + chip[o.estado]" style="vertical-align: middle; margin-left: 0.5rem">{{ etiqueta[o.estado] }}</span></h1>
          <p class="subtitulo">Para <strong>{{ o.proveedor.nombre }}</strong>, creada el {{ o.createdAt | date:'d MMM y' }}@if (o.creadoPor) { por {{ o.creadoPor.nombre }} }</p>
        </div>
        <div class="page-header-acciones">
          <button type="button" class="btn-secondary" (click)="descargar()" [disabled]="generando()"><app-icon name="descargar" [size]="16" /> {{ generando() ? 'Generando…' : 'PDF' }}</button>
          @if (o.estado === 'borrador') {
            <a [routerLink]="['/ordenes-compra/editar', o._id]" class="btn-secondary"><app-icon name="editar" [size]="16" /> Editar</a>
            <button type="button" class="btn-primary" (click)="cambiarEstado('enviada')"><app-icon name="camion" [size]="16" /> Marcar como enviada</button>
          }
          @if (o.estado === 'enviada' || o.estado === 'parcial') {
            <button type="button" class="btn-primary" (click)="abrirRecepcion()"><app-icon name="entrada" [size]="16" /> Registrar recepción</button>
          }
        </div>
      </header>

      <div class="kpis">
        <div class="kpi"><span class="kpi-etiqueta">Total de la orden</span><span class="kpi-valor" [attr.title]="(o.total | dinero)">{{ o.total | dinero:true }}</span></div>
        <div class="kpi"><span class="kpi-etiqueta">Unidades recibidas</span><span class="kpi-valor">{{ recibidas() }}<small>de {{ pedidas() }}</small></span>
          <span class="kpi-pie"><span class="medidor" style="min-width: 0; width: 100%"><span class="medidor-barra"><span class="medidor-relleno nivel-saludable" [style.width.%]="pedidas() ? recibidas() / pedidas() * 100 : 0"></span></span></span></span></div>
        <div class="kpi"><span class="kpi-etiqueta">Entrega esperada</span><span class="kpi-valor" style="font-size: 1.35rem">{{ o.fechaEsperada ? (o.fechaEsperada | date:'d MMM y') : 'Sin fecha' }}</span>
          @if (o.enviadaEn) { <span class="kpi-pie">enviada el {{ o.enviadaEn | date:'d MMM y' }}</span> }</div>
        <div class="kpi"><span class="kpi-etiqueta">Proveedor</span><span class="kpi-valor" style="font-size: 1.1rem">{{ o.proveedor.nombre }}</span>
          <span class="kpi-pie">{{ o.proveedor.telefono || o.proveedor.email || o.proveedor.contacto || '' }}</span></div>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div><h2>Productos</h2>@if (o.notas) { <p class="nota">Notas: {{ o.notas }}</p> }</div>
          @if (o.estado === 'parcial') { <button type="button" class="btn-ghost btn-sm" (click)="cambiarEstado('recibida')">Cerrar sin esperar el resto</button> }
          @if (o.estado === 'borrador' || o.estado === 'enviada') { <button type="button" class="btn-ghost btn-sm" style="color: var(--agotado)" (click)="cambiarEstado('cancelada')">Cancelar orden</button> }
        </div>
        <div class="tabla-wrap"><table>
          <thead><tr><th>Producto</th><th class="num">Costo unit.</th><th class="num">Pedido</th><th>Recibido</th><th class="num">Subtotal</th></tr></thead>
          <tbody>
            @for (i of o.items; track $index) {
              <tr>
                <td><span class="celda-doble"><span class="principal">{{ nombre(i) }}</span><span class="secundaria codigo">{{ sku(i) }}</span></span></td>
                <td class="num">{{ i.costoUnitario | dinero }}</td>
                <td class="num">{{ i.cantidad }}</td>
                <td>
                  <span class="medidor" style="min-width: 130px">
                    <span class="medidor-barra"><span class="medidor-relleno" [class]="'medidor-relleno ' + (i.cantidadRecibida >= i.cantidad ? 'nivel-saludable' : 'nivel-bajo')" [style.width.%]="i.cantidadRecibida / i.cantidad * 100"></span></span>
                    <span style="font-size: 0.82rem; white-space: nowrap">{{ i.cantidadRecibida }}/{{ i.cantidad }}</span>
                  </span>
                </td>
                <td class="num">{{ i.cantidad * i.costoUnitario | dinero }}</td>
              </tr>
            }
          </tbody>
        </table></div>
      </section>

      @if (o.recepciones.length > 0) {
        <section class="panel">
          <div class="panel-header"><div><h2>Historial de recepciones</h2></div></div>
          <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.9rem">
            @for (r of o.recepciones; track $index) {
              <li style="padding-left: 1rem; border-left: 3px solid var(--ok)">
                <strong>{{ r.fecha | date:'d MMM y, h:mm a' }}</strong>@if (r.usuario) { <span style="color: var(--texto-suave)"> por {{ r.usuario.nombre }}</span> }
                @if (r.nota) { <div style="color: var(--texto-suave); font-size: 0.88rem">{{ r.nota }}</div> }
                <div style="font-size: 0.9rem; margin-top: 0.2rem">
                  @for (it of r.items; track $index) { <span class="chip chip-ok sin-punto" style="margin: 0 0.35rem 0.25rem 0; text-transform: none">+{{ it.cantidad }} {{ nombreRecepcion(it.producto) }}</span> }
                </div>
              </li>
            }
          </ul>
        </section>
      }

      @if (esAdmin() && o.estado !== 'borrador' && o.estado !== 'cancelada') {
        <section class="panel">
          <div class="panel-header">
            <div><h2>Pago al proveedor</h2><p class="nota">Se debe el valor de la mercancía ya recibida.</p></div>
            <div class="page-header-acciones">
              <button type="button" class="btn-secondary btn-sm" (click)="abrirFactura()">Factura del proveedor</button>
              @if ((o.saldoPorPagar ?? 0) > 0) { <button type="button" class="btn-primary btn-sm" (click)="pagando.set(true)"><app-icon name="entrada" [size]="15" /> Registrar pago</button> }
            </div>
          </div>
          <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1rem">
            <div><span class="hoja-etiqueta" style="color: var(--texto-suave); font-size: 0.82rem">Recibido</span><br /><strong>{{ (o.valorRecibido ?? 0) | dinero }}</strong></div>
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Pagado</span><br /><strong style="color: var(--ok-texto)">{{ (o.pagado ?? 0) | dinero }}</strong></div>
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Saldo por pagar</span><br /><strong [style.color]="(o.saldoPorPagar ?? 0) > 0 ? 'var(--critico-texto)' : 'inherit'">{{ (o.saldoPorPagar ?? 0) | dinero }}</strong></div>
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Factura del proveedor</span><br /><strong>{{ o.facturaProveedor || '—' }}</strong></div>
            <div><span style="color: var(--texto-suave); font-size: 0.82rem">Vence el</span><br /><strong>{{ o.fechaVencimientoPago ? (o.fechaVencimientoPago | date:'d MMM y') : 'Al recibir' }}</strong></div>
          </div>
          @if (pagos().length > 0) {
            <div class="tabla-wrap"><table>
              <thead><tr><th>Comprobante</th><th>Fecha</th><th>Forma</th><th class="num">Monto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                @for (p of pagos(); track p._id) {
                  <tr [style.opacity]="p.estado === 'anulado' ? 0.55 : 1">
                    <td><span class="celda-doble"><span class="principal">{{ p.numero }}</span>@if (p.estado === 'anulado') { <span class="secundaria" style="color: var(--agotado-texto)">Anulado: {{ p.motivoAnulacion }}</span> }</span></td>
                    <td>{{ p.fecha | date:'d MMM y' }}</td>
                    <td>{{ etiquetaMetodo[p.metodo] }}</td>
                    <td class="num"><strong [style.text-decoration]="p.estado === 'anulado' ? 'line-through' : 'none'">{{ p.monto | dinero }}</strong></td>
                    <td><span class="acciones" style="justify-content: flex-end">
                      <button type="button" class="btn-icono" (click)="comprobante(p)" title="Descargar comprobante" [attr.aria-label]="'Descargar ' + p.numero"><app-icon name="pdf" [size]="17" /></button>
                      @if (p.estado === 'vigente') { <button type="button" class="btn-icono peligro" (click)="anulandoPago.set(p)" title="Anular pago" [attr.aria-label]="'Anular ' + p.numero"><app-icon name="papelera" [size]="17" /></button> }
                    </span></td>
                  </tr>
                }
              </tbody>
            </table></div>
          }
        </section>

        @if (pagando()) { <app-pago-modal modo="egreso" [destino]="{ id: o._id, referencia: o.numero, contraparte: o.proveedor.nombre, saldo: o.saldoPorPagar ?? 0 }" (registrado)="alPagar($event)" (cerrar)="pagando.set(false)" /> }
        @if (editandoFactura()) {
          <app-modal titulo="Factura del proveedor" [descripcion]="'Orden ' + o.numero" (cerrar)="editandoFactura.set(false)">
            <div class="form-group"><label for="fp-num">Número de la factura</label><input id="fp-num" type="text" [ngModel]="facturaProv()" (ngModelChange)="facturaProv.set($event)" /></div>
            <div class="form-group"><label for="fp-venc">Fecha de vencimiento del pago</label><input id="fp-venc" type="date" [ngModel]="vencimientoProv()" (ngModelChange)="vencimientoProv.set($event)" /><span class="ayuda">Si la dejas vacía se calcula con el plazo del proveedor.</span></div>
            <div pie><button type="button" class="btn-secondary" (click)="editandoFactura.set(false)">Cancelar</button><button type="button" class="btn-primary" (click)="guardarFactura()">Guardar</button></div>
          </app-modal>
        }
        @if (anulandoPago(); as ap) {
          <app-modal titulo="Anular pago" [descripcion]="ap.numero + ' · ' + (ap.monto | dinero)" (cerrar)="anulandoPago.set(null)">
            <div class="form-group"><label for="apo-motivo">Motivo</label><input id="apo-motivo" type="text" [ngModel]="motivoPago()" (ngModelChange)="motivoPago.set($event)" (keydown.enter)="anularPago()" /></div>
            @if (errorPago()) { <div class="error-alert" role="alert">{{ errorPago() }}</div> }
            <div pie><button type="button" class="btn-secondary" (click)="anulandoPago.set(null)">Cancelar</button>
              <button type="button" class="btn-danger" style="min-height: 40px; font-size: 0.9rem" (click)="anularPago()" [disabled]="motivoPago().trim().length < 5 || guardando()">Anular pago</button></div>
          </app-modal>
        }
      }

      @if (recibiendo()) {
        <app-modal titulo="Registrar recepción" [descripcion]="'Orden ' + o.numero + ': indica las unidades que llegaron'" [ancho]="true" (cerrar)="cerrarRecepcion()">
          <div class="tabla-wrap"><table>
            <thead><tr><th>Producto</th><th class="num">Pendiente</th><th class="num">Llegó</th></tr></thead>
            <tbody>
              @for (r of lineasRecepcion(); track r.id) {
                <tr>
                  <td><span class="celda-doble"><span class="principal">{{ r.nombre }}</span><span class="secundaria codigo">{{ r.sku }}</span></span></td>
                  <td class="num">{{ r.pendiente }}</td>
                  <td class="num"><input type="number" min="0" [max]="r.pendiente" step="1" class="cantidad-pedir" [ngModel]="r.cantidad" (ngModelChange)="ajustar(r, $event)" [attr.aria-label]="'Unidades recibidas de ' + r.nombre" /></td>
                </tr>
              }
            </tbody>
          </table></div>
          <div class="form-group" style="margin-top: 1rem">
            <label for="rc-nota">Nota (opcional)</label>
            <input id="rc-nota" type="text" [ngModel]="notaRecepcion()" (ngModelChange)="notaRecepcion.set($event)" placeholder="Ej. Factura del proveedor #1234, una caja llegó golpeada" />
          </div>
          <label style="display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; font-size: 0.9rem">
            <input type="checkbox" [checked]="actualizarCosto()" (change)="actualizarCosto.set(!actualizarCosto())" style="margin-top: 3px" />
            <span>Actualizar el costo de los productos con el de esta orden <span style="display: block; font-size: 0.8rem; color: var(--texto-suave)">Úsalo si el proveedor cambió el precio; afecta el margen de tus reportes.</span></span>
          </label>
          @if (errorRecepcion()) { <div class="error-alert" role="alert">{{ errorRecepcion() }}</div> }
          <div pie>
            <button type="button" class="btn-secondary" (click)="cerrarRecepcion()" [disabled]="guardando()">Cancelar</button>
            <button type="button" class="btn-primary" (click)="confirmarRecepcion()" [disabled]="guardando() || totalLlego() === 0">
              {{ guardando() ? 'Guardando…' : 'Recibir ' + totalLlego() + ' unidades' }}
            </button>
          </div>
        </app-modal>
      }
    } @else {
      <div class="panel vacio" style="margin-top: 1rem">
        <span class="icono-vacio"><app-icon name="alerta" [size]="26" /></span>
        <strong>No encontramos esta orden</strong>
        <a routerLink="/ordenes-compra" class="btn-secondary">Volver a la lista</a>
      </div>
    }
    }
  `
})
export class DetalleOrdenComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ordenService = inject(OrdenCompraService);
  private configService = inject(ConfiguracionService);
  private notificacion = inject(NotificacionService);
  private confirmService = inject(ConfirmService);
  private tiempoReal = inject(TiempoRealService);
  private pdf = inject(DocumentosPdfService);
  private destroyRef = inject(DestroyRef);
  private carteraService = inject(CarteraService);
  private auth = inject(AuthService);

  readonly etiquetaMetodo = ETIQUETA_METODO;
  pagos = signal<Pago[]>([]);
  pagando = signal(false);
  editandoFactura = signal(false);
  facturaProv = signal('');
  vencimientoProv = signal('');
  anulandoPago = signal<Pago | null>(null);
  motivoPago = signal('');
  errorPago = signal('');
  esAdmin = computed(() => { this.auth.usuarioActual(); return this.auth.tieneRol(['admin']); });
  readonly etiqueta = ETIQUETA_ORDEN;
  readonly chip = CHIP_ORDEN;

  orden = signal<OrdenCompra | null>(null);
  cargando = signal(true);
  generando = signal(false);
  guardando = signal(false);

  recibiendo = signal(false);
  lineasRecepcion = signal<Recepcion[]>([]);
  notaRecepcion = signal('');
  actualizarCosto = signal(false);
  errorRecepcion = signal('');

  pedidas = computed(() => this.orden()?.items.reduce((s, i) => s + i.cantidad, 0) ?? 0);
  recibidas = computed(() => this.orden()?.items.reduce((s, i) => s + i.cantidadRecibida, 0) ?? 0);
  totalLlego = computed(() => this.lineasRecepcion().reduce((s, r) => s + r.cantidad, 0));

  ngOnInit(): void {
    this.configService.obtener().subscribe({ error: () => {} });
    this.cargar();
    this.tiempoReal.alCambiar('ordenes-compra', 'pagos').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { if (!this.recibiendo()) this.cargar(); });
  }

  cargar(): void {
    this.ordenService.obtener(this.route.snapshot.paramMap.get('id')!).subscribe({
      next: (o) => { this.orden.set(o); this.cargando.set(false); if (this.esAdmin() && o.estado !== 'borrador' && o.estado !== 'cancelada') this.carteraService.pagosDeOrden(o._id).subscribe({ next: (p) => this.pagos.set(p), error: () => {} }); },
      error: () => { this.orden.set(null); this.cargando.set(false); }
    });
  }

  abrirFactura(): void {
    const o = this.orden();
    this.facturaProv.set(o?.facturaProveedor ?? '');
    this.vencimientoProv.set(o?.fechaVencimientoPago ? o.fechaVencimientoPago.slice(0, 10) : '');
    this.editandoFactura.set(true);
  }

  guardarFactura(): void {
    const o = this.orden();
    if (!o) return;
    this.ordenService.actualizarFacturacion(o._id, { facturaProveedor: this.facturaProv(), fechaVencimientoPago: this.vencimientoProv() || null }).subscribe({
      next: (actualizada) => { this.orden.set(actualizada); this.editandoFactura.set(false); this.notificacion.exito('Datos del proveedor guardados'); },
      error: (err) => this.notificacion.error(err.error?.mensaje || 'No se pudo guardar')
    });
  }

  alPagar(p: Pago): void { this.pagando.set(false); this.notificacion.exito(`Pago registrado: ${p.numero}`); this.cargar(); }

  async comprobante(p: Pago): Promise<void> {
    this.carteraService.obtenerPago(p._id).subscribe({
      next: async (completo) => { try { await this.pdf.recibo(completo, this.configService.actual()); } catch { this.notificacion.error('No se pudo generar el PDF'); } },
      error: () => this.notificacion.error('No se pudo obtener el comprobante')
    });
  }

  anularPago(): void {
    const p = this.anulandoPago();
    if (!p || this.motivoPago().trim().length < 5) return;
    this.guardando.set(true);
    this.errorPago.set('');
    this.carteraService.anularPago(p._id, this.motivoPago().trim()).subscribe({
      next: () => { this.guardando.set(false); this.anulandoPago.set(null); this.motivoPago.set(''); this.notificacion.exito('Pago anulado'); this.cargar(); },
      error: (err) => { this.guardando.set(false); this.errorPago.set(err.error?.mensaje || 'No se pudo anular el pago'); }
    });
  }

  nombre(i: ItemOrden): string { return typeof i.producto === 'string' ? i.producto : i.producto.nombre; }
  sku(i: ItemOrden): string { return typeof i.producto === 'string' ? '' : i.producto.sku; }
  nombreRecepcion(p: any): string { return typeof p === 'string' ? p : p?.nombre ?? ''; }

  async cambiarEstado(estado: EstadoOrden): Promise<void> {
    const o = this.orden();
    if (!o) return;
    const textos: Partial<Record<EstadoOrden, { titulo: string; mensaje: string; boton: string; peligro?: boolean }>> = {
      enviada: { titulo: 'Marcar como enviada', mensaje: `La orden ${o.numero} ya no se podrá editar y quedará lista para registrar la llegada de la mercancía.`, boton: 'Marcar como enviada' },
      cancelada: { titulo: 'Cancelar orden', mensaje: `La orden ${o.numero} se cancelará. Esta acción no se puede deshacer.`, boton: 'Cancelar orden', peligro: true },
      recibida: { titulo: 'Cerrar orden', mensaje: `Se dará por completada aunque falten unidades por llegar. Lo ya recibido se conserva en el inventario.`, boton: 'Cerrar orden' }
    };
    const t = textos[estado]!;
    if (!(await this.confirmService.confirmar({ titulo: t.titulo, mensaje: t.mensaje, confirmar: t.boton, cancelar: 'Volver', peligro: t.peligro }))) return;
    this.ordenService.cambiarEstado(o._id, estado).subscribe({
      next: (actualizada) => { this.orden.set(actualizada); this.notificacion.exito(`Orden ${actualizada.numero}: ${this.etiqueta[estado].toLowerCase()}`); },
      error: (err) => this.notificacion.error(err.error?.mensaje || 'No se pudo cambiar el estado')
    });
  }

  abrirRecepcion(): void {
    const o = this.orden();
    if (!o) return;
    this.lineasRecepcion.set(
      o.items
        .filter((i) => i.cantidad - i.cantidadRecibida > 0)
        .map((i) => {
          const id = typeof i.producto === 'string' ? i.producto : i.producto._id;
          const pendiente = i.cantidad - i.cantidadRecibida;
          return { item: i, id, nombre: this.nombre(i), sku: this.sku(i), pendiente, cantidad: pendiente };
        })
    );
    this.notaRecepcion.set('');
    this.actualizarCosto.set(false);
    this.errorRecepcion.set('');
    this.recibiendo.set(true);
  }

  cerrarRecepcion(): void { if (!this.guardando()) this.recibiendo.set(false); }

  ajustar(r: Recepcion, valor: string | number): void {
    const n = Math.min(Math.max(Math.floor(Number(valor)) || 0, 0), r.pendiente);
    this.lineasRecepcion.update((ls) => ls.map((x) => (x.id === r.id ? { ...x, cantidad: n } : x)));
  }

  confirmarRecepcion(): void {
    const o = this.orden();
    if (!o || this.totalLlego() === 0) return;
    this.guardando.set(true);
    this.errorRecepcion.set('');
    const items = this.lineasRecepcion().filter((r) => r.cantidad > 0).map((r) => ({ producto: r.id, cantidad: r.cantidad }));
    this.ordenService.recibir(o._id, items, this.actualizarCosto(), this.notaRecepcion()).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.recibiendo.set(false);
        this.orden.set(actualizada);
        this.notificacion.exito(actualizada.estado === 'recibida' ? `Orden ${actualizada.numero} recibida por completo` : 'Recepción registrada: el stock ya está actualizado');
      },
      error: (err) => { this.guardando.set(false); this.errorRecepcion.set(err.error?.mensaje || 'No se pudo registrar la recepción'); }
    });
  }

  async descargar(): Promise<void> {
    const o = this.orden();
    if (!o) return;
    this.generando.set(true);
    try { await this.pdf.ordenCompra(o, this.configService.actual()); }
    catch { this.notificacion.error('No se pudo generar el PDF. Inténtalo de nuevo.'); }
    finally { this.generando.set(false); }
  }
}
