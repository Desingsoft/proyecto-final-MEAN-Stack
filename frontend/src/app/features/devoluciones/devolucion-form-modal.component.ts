import { nuevaClaveIdempotencia } from '../../core/utils/idempotencia';
/**
 * Archivo: devolucion-form-modal.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { obtenerMensajeApi } from '../../core/utils/api-error';
import { FormsModule } from '@angular/forms';
import { DevolucionService } from '../../core/services/devolucion.service';
import { Pedido } from '../../core/models/pedido.model';
import { Devolucion, ETIQUETA_METODO, ETIQUETA_MOTIVO, METODOS_PAGO, MOTIVOS_DEVOLUCION, MetodoPago, MotivoDevolucion } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { ModalComponent } from '../../shared/components/modal/modal.component';

/** Factura vigente del pedido, con lo necesario para mostrar el efecto de la devolución. */
export interface FacturaDelPedido {
  numero: string; total: number; saldo: number; saldoAFavor: number; ivaPorcentaje?: number; preciosIncluyenIva?: boolean;
}

interface Linea { id: string; nombre: string; sku: string; vendida: number; devuelta: number; disponible: number; precio: number; }

/** Ventana para devolver productos de un pedido: elige qué y cuántos, en qué estado vuelven, y por qué. */
@Component({
  selector: 'app-devolucion-form-modal',
  standalone: true,
  imports: [FormsModule, DineroPipe, ModalComponent],
  template: `
    <app-modal titulo="Registrar devolución" [descripcion]="'Pedido de ' + pedido.cliente" [extra]="true" (cerrar)="cerrar.emit()">
      <div class="tabla-wrap"><table>
        <thead><tr><th>Producto</th><th class="num">Vendidas</th><th class="num">Ya devueltas</th><th class="num">Devolver</th><th>Estado en que vuelve</th></tr></thead>
        <tbody>
          @for (l of lineas(); track l.id) {
            <tr>
              <td><span class="celda-doble"><span class="principal">{{ l.nombre }}</span><span class="secundaria codigo">{{ l.sku }}</span></span></td>
              <td class="num">{{ l.vendida }}</td>
              <td class="num">{{ l.devuelta }}</td>
              <td class="num"><input type="number" min="0" [max]="l.disponible" step="1" class="cantidad-pedir" [ngModel]="cantidadDe(l.id)" (ngModelChange)="cambiar(l, $event)" [attr.aria-label]="'Unidades a devolver de ' + l.nombre" /></td>
              <td>
                <select [ngModel]="estadoDe(l.id)" (ngModelChange)="cambiarEstado(l.id, $event)" [disabled]="cantidadDe(l.id) <= 0" style="min-height: 34px; font-size: 0.85rem" [attr.aria-label]="'Estado de ' + l.nombre">
                  <option value="bueno">Buen estado: al inventario</option>
                  <option value="danado">Dañado: se descarta</option>
                </select>
              </td>
            </tr>
          }
        </tbody>
      </table></div>

      <div class="form-row" style="margin-top: 1rem">
        <div class="form-group">
          <label for="dv-motivo">Motivo</label>
          <select id="dv-motivo" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)">
            <option value="" disabled>Elige un motivo…</option>
            @for (m of motivos; track m) { <option [value]="m">{{ etiquetaMotivo[m] }}</option> }
          </select>
        </div>
        <div class="form-group">
          <label for="dv-nota">Nota (opcional)</label>
          <input id="dv-nota" type="text" [ngModel]="nota()" (ngModelChange)="nota.set($event)" placeholder="Ej. Llegó con la caja rota" />
        </div>
      </div>

      <!-- Efecto de la devolución -->
      <div class="panel sin-margen" style="background: var(--superficie-2); margin-top: 0.25rem">
        <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem">
          <span style="color: var(--texto-suave)">Valor que se le reconoce al cliente</span>
          <strong style="font-family: var(--fuente-titulo); font-size: 1.35rem">{{ valor() | dinero }}</strong>
        </div>
        @if (unidades() > 0) {
          @if (factura) {
            <p style="margin: 0.6rem 0 0; font-size: 0.88rem; color: var(--texto-suave)">
              Se emitirá una <strong>nota crédito</strong> sobre la factura {{ factura.numero }}.
              @if (nuevoSaldo() > 0) { Lo que debe el cliente pasa de {{ factura.saldo | dinero }} a <strong>{{ nuevoSaldo() | dinero }}</strong>. }
              @else if (nuevoAFavor() > 0) { El cliente ya había pagado, así que quedará con <strong style="color: var(--critico-texto)">{{ nuevoAFavor() | dinero }} a su favor</strong>. }
              @else { La factura queda saldada. }
            </p>
          } @else {
            <p style="margin: 0.6rem 0 0; font-size: 0.88rem; color: var(--texto-suave)">Este pedido no tiene factura, por lo que no se emite nota crédito: solo se registra la devolución y vuelve el inventario.</p>
          }
          <p style="margin: 0.35rem 0 0; font-size: 0.8rem; color: var(--texto-tenue)">
            {{ unidadesBuenas() }} unidades vuelven al inventario@if (unidadesDanadas() > 0) { y {{ unidadesDanadas() }} se descartan }. El valor es una estimación: el definitivo se calcula al registrar.
          </p>
        }
      </div>

      @if (factura && nuevoAFavor() > 0 && unidades() > 0) {
        <label style="display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 0.9rem; cursor: pointer; font-size: 0.9rem">
          <input type="checkbox" [checked]="reembolsar()" (change)="reembolsar.set(!reembolsar())" style="margin-top: 3px" />
          <span>Devolverle el dinero ahora <span style="display: block; font-size: 0.8rem; color: var(--texto-suave)">Si no, queda como saldo a favor y lo puedes reembolsar después desde Cartera.</span></span>
        </label>
        @if (reembolsar()) {
          <div class="form-row" style="margin-top: 0.6rem">
            <div class="form-group"><label for="dv-monto">Monto a reembolsar</label><input id="dv-monto" type="number" min="1" [max]="nuevoAFavor()" [ngModel]="montoReembolso() || nuevoAFavor()" (ngModelChange)="montoReembolso.set($event)" /></div>
            <div class="form-group"><label for="dv-metodo">Forma</label><select id="dv-metodo" [ngModel]="metodo()" (ngModelChange)="metodo.set($event)">@for (m of metodosPago; track m) { <option [value]="m">{{ etiquetaMetodo[m] }}</option> }</select></div>
          </div>
        }
      }

      @if (errorMsg()) { <div class="error-alert" role="alert">{{ errorMsg() }}</div> }
      <div pie>
        <button type="button" class="btn-secondary" (click)="cerrar.emit()" [disabled]="guardando()">Cancelar</button>
        <button type="button" class="btn-primary" (click)="guardar()" [disabled]="(!valido() && !datosPendientes) || guardando()">
          {{ guardando() ? 'Registrando…' : 'Registrar devolución' }}
        </button>
      </div>
    </app-modal>
  `
})
export class DevolucionFormModalComponent implements OnInit {
  private devolucionService = inject(DevolucionService);

  @Input({ required: true }) pedido!: Pedido;
  @Input() devuelto: Record<string, number> = {};
  @Input() factura: FacturaDelPedido | null = null;
  @Output() registrada = new EventEmitter<Devolucion>();
  @Output() cerrar = new EventEmitter<void>();

  readonly motivos = MOTIVOS_DEVOLUCION;
  readonly etiquetaMotivo = ETIQUETA_MOTIVO;
  readonly metodosPago = METODOS_PAGO;
  readonly etiquetaMetodo = ETIQUETA_METODO;

  cantidades = signal<Record<string, number>>({});
  estados = signal<Record<string, 'bueno' | 'danado'>>({});
  motivo = signal<'' | MotivoDevolucion>('');
  nota = signal('');
  reembolsar = signal(false);
  montoReembolso = signal(0);
  metodo = signal<MetodoPago>('efectivo');
  guardando = signal(false);
  /** Se conserva tras errores de red; no generar otra clave hasta confirmar la operación. */
  private claveDevolucion: string | null = null;
  /** Solicitud congelada junto con su clave: nunca se recalcula durante un reintento. */
  datosPendientes: Parameters<DevolucionService['crear']>[0] | null = null;
  errorMsg = signal('');
  private base = signal<Linea[]>([]);

  lineas = computed(() => this.base());
  unidades = computed(() => this.base().reduce((s, l) => s + (this.cantidades()[l.id] ?? 0), 0));
  unidadesDanadas = computed(() => this.base().reduce((s, l) => s + ((this.estados()[l.id] ?? 'bueno') === 'danado' ? this.cantidades()[l.id] ?? 0 : 0), 0));
  unidadesBuenas = computed(() => this.unidades() - this.unidadesDanadas());

  /** Valor estimado: el precio vendido, con el descuento del pedido y (si la factura lo suma aparte) el IVA. */
  valor = computed(() => {
    const bruto = this.base().reduce((s, l) => s + (this.cantidades()[l.id] ?? 0) * l.precio, 0);
    const neto = bruto - Math.round((bruto * (this.pedido.descuentoPorcentaje || 0)) / 100);
    const f = this.factura;
    return f && f.preciosIncluyenIva === false && f.ivaPorcentaje ? neto + Math.round((neto * f.ivaPorcentaje) / 100) : neto;
  });
  private posicion = computed(() => (this.factura ? this.factura.saldo - this.factura.saldoAFavor - this.valor() : 0));
  nuevoSaldo = computed(() => Math.max(this.posicion(), 0));
  nuevoAFavor = computed(() => Math.max(-this.posicion(), 0));
  /** Validación de interfaz: el backend debe comprobar cantidades y saldos en una transacción. */
  valido = computed(() => this.unidades() > 0 && !!this.motivo() &&
    this.base().every(l => Number.isInteger(this.cantidades()[l.id] ?? 0) && (this.cantidades()[l.id] ?? 0) <= l.disponible) &&
    (!this.reembolsar() || (Number.isInteger(Number(this.montoReembolso() || this.nuevoAFavor())) &&
      Number(this.montoReembolso() || this.nuevoAFavor()) > 0 && Number(this.montoReembolso() || this.nuevoAFavor()) <= this.nuevoAFavor())));

  ngOnInit(): void {
    this.base.set(
      this.pedido.items.map((i: any) => {
        const id = typeof i.producto === 'object' ? i.producto._id : i.producto;
        const devuelta = this.devuelto[id] ?? 0;
        return {
          id, nombre: typeof i.producto === 'object' ? i.producto.nombre : id, sku: typeof i.producto === 'object' ? i.producto.sku : '',
          vendida: i.cantidad, devuelta, disponible: i.cantidad - devuelta, precio: i.precioUnitario
        };
      }).filter((l: Linea) => l.disponible > 0)
    );
  }

  cantidadDe(id: string): number { return this.cantidades()[id] ?? 0; }
  estadoDe(id: string): 'bueno' | 'danado' { return this.estados()[id] ?? 'bueno'; }

  cambiar(l: Linea, valor: string | number): void {
    const n = Math.min(Math.max(Math.floor(Number(valor)) || 0, 0), l.disponible);
    this.cantidades.update((c) => ({ ...c, [l.id]: n }));
  }
  cambiarEstado(id: string, estado: 'bueno' | 'danado'): void { this.estados.update((e) => ({ ...e, [id]: estado })); }

  guardar(): void {
    if ((!this.valido() && !this.datosPendientes) || this.guardando()) return;
    this.guardando.set(true);
    try { this.claveDevolucion ??= nuevaClaveIdempotencia(); }
    catch { this.guardando.set(false); this.errorMsg.set('Se requiere HTTPS o localhost para crear una clave segura.'); return; }
    this.errorMsg.set('');
    const reembolsoMonto = Number(this.montoReembolso() || this.nuevoAFavor());
    const datos = this.datosPendientes ?? {
      pedidoId: this.pedido._id!,
      motivo: this.motivo() as MotivoDevolucion,
      nota: this.nota(),
      items: this.base().filter((l) => (this.cantidades()[l.id] ?? 0) > 0).map((l) => ({
        producto: l.id, cantidad: this.cantidades()[l.id], reintegrar: (this.estados()[l.id] ?? 'bueno') === 'bueno'
      })),
      ...(this.reembolsar() && this.factura && this.nuevoAFavor() > 0 ? { reembolso: { monto: reembolsoMonto, metodo: this.metodo() } } : {})
    };
    this.datosPendientes = datos;
    this.devolucionService.crear(datos, this.claveDevolucion).subscribe({
      next: (d) => { this.datosPendientes = null; this.claveDevolucion = null; this.guardando.set(false); this.registrada.emit(d); },
      error: (err) => { this.guardando.set(false); this.errorMsg.set(obtenerMensajeApi(err, 'No se pudo registrar la devolución. Verifica los movimientos antes de reintentar.')); }
    });
  }
}
