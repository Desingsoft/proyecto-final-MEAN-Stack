/**
 * Archivo: pago-modal.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarteraService } from '../../core/services/cartera.service';
import { ETIQUETA_METODO, METODOS_PAGO, MetodoPago, Pago } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { obtenerMensajeApi } from '../../core/utils/api-error';
import { nuevaClaveIdempotencia } from '../../core/utils/idempotencia';
import { aClave } from '../../shared/utils/fechas';

export interface DestinoPago {
  id: string;
  referencia: string;     // FV-0001 u OC-0001
  contraparte: string;    // cliente o proveedor
  saldo: number;
}

/** Ventana para registrar un abono de un cliente (cobro) o un pago a un proveedor (egreso). */
@Component({
  selector: 'app-pago-modal',
  standalone: true,
  imports: [FormsModule, DineroPipe, ModalComponent],
  template: `
    <app-modal [titulo]="modo === 'cobro' ? 'Registrar pago' : modo === 'reembolso' ? 'Registrar reembolso' : 'Pagar al proveedor'"
      [descripcion]="destino.referencia + ' · ' + destino.contraparte" (cerrar)="cerrar.emit()">
      <div class="panel sin-margen" style="background: var(--superficie-2); display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem">
        <span style="color: var(--texto-suave)">{{ modo === 'reembolso' ? 'Saldo a favor del cliente' : 'Saldo pendiente' }}</span>
        <strong style="font-family: var(--fuente-titulo); font-size: 1.25rem">{{ destino.saldo | dinero }}</strong>
      </div>

      <div class="form-group">
        <label for="pg-monto">Monto</label>
        <div style="display: flex; gap: 0.5rem">
          <input id="pg-monto" type="number" min="1" step="1" style="flex: 1" [ngModel]="monto()" (ngModelChange)="monto.set($event)" [disabled]="!!clavePendiente" (keydown.enter)="guardar()" />
          <button type="button" class="btn-secondary" (click)="monto.set(destino.saldo)" [disabled]="!!clavePendiente">Total</button>
        </div>
        @if (monto() > destino.saldo) { <span class="error">Supera el saldo pendiente</span> }
        @else if (monto() > 0) { <span class="ayuda">Saldo después de este pago: <strong>{{ destino.saldo - monto() | dinero }}</strong></span> }
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="pg-metodo">Forma de pago</label>
          <select id="pg-metodo" [ngModel]="metodo()" (ngModelChange)="metodo.set($event)" [disabled]="!!clavePendiente">
            @for (m of metodos; track m) { <option [value]="m">{{ etiqueta[m] }}</option> }
          </select>
        </div>
        <div class="form-group">
          <label for="pg-fecha">Fecha</label>
          <input id="pg-fecha" type="date" [max]="hoy" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" [disabled]="!!clavePendiente" />
        </div>
      </div>
      <div class="form-group">
        <label for="pg-ref">Referencia (opcional)</label>
        <input id="pg-ref" type="text" [ngModel]="referencia()" (ngModelChange)="referencia.set($event)" [disabled]="!!clavePendiente" placeholder="N.º de transferencia, cheque, consignación…" />
      </div>
      <div class="form-group">
        <label for="pg-nota">Nota (opcional)</label>
        <input id="pg-nota" type="text" [ngModel]="nota()" (ngModelChange)="nota.set($event)" [disabled]="!!clavePendiente" />
      </div>

      @if (errorMsg()) { <div class="error-alert" role="alert">{{ errorMsg() }}</div> }
      <div pie>
        <button type="button" class="btn-secondary" (click)="cerrar.emit()" [disabled]="guardando()">Cancelar</button>
        <button type="button" class="btn-primary" (click)="guardar()" [disabled]="(!valido() && !clavePendiente) || guardando()">
          {{ guardando() ? 'Guardando…' : (modo === 'cobro' ? 'Registrar pago' : modo === 'reembolso' ? 'Registrar reembolso' : 'Registrar pago al proveedor') }}
        </button>
      </div>
    </app-modal>
  `
})
export class PagoModalComponent implements OnInit {
  private cartera = inject(CarteraService);

  @Input({ required: true }) modo!: 'cobro' | 'egreso' | 'reembolso';
  @Input({ required: true }) destino!: DestinoPago;
  @Output() registrado = new EventEmitter<Pago>();
  @Output() cerrar = new EventEmitter<void>();

  readonly metodos = METODOS_PAGO;
  readonly etiqueta = ETIQUETA_METODO;
  readonly hoy = aClave(new Date());

  monto = signal(0);
  metodo = signal<MetodoPago>('efectivo');
  fecha = signal(this.hoy);
  referencia = signal('');
  nota = signal('');
  guardando = signal(false);
  errorMsg = signal('');
  /** Se mantiene durante reintentos: cambiarla puede duplicar un movimiento financiero. */
  clavePendiente: string | null = null;
  private datosPendientes: { monto: number; metodo: MetodoPago; fecha: string; referencia: string; nota: string } | null = null;

  valido = computed(() => Number.isInteger(Number(this.monto())) && this.monto() >= 1 && this.monto() <= this.destino.saldo);

  ngOnInit(): void { this.monto.set(this.destino.saldo); }

  guardar(): void {
    if ((!this.valido() && !this.clavePendiente) || this.guardando()) return;
    this.guardando.set(true);
    this.errorMsg.set('');
    // El payload también queda congelado durante reintentos con la misma clave.
    // Un cambio de datos debe realizarse en un nuevo formulario/intento.
    let clave: string;
    try { clave = this.clavePendiente ?? nuevaClaveIdempotencia(); }
    catch { this.guardando.set(false); this.errorMsg.set('Abre la aplicación en HTTPS o localhost para registrar pagos de forma segura.'); return; }
    this.clavePendiente = clave;
    const datos = this.datosPendientes ?? { monto: Number(this.monto()), metodo: this.metodo(), fecha: this.fecha(), referencia: this.referencia(), nota: this.nota() };
    this.datosPendientes = datos;
    const peticion = this.modo === 'cobro' ? this.cartera.registrarCobro(this.destino.id, datos, clave)
      : this.modo === 'reembolso' ? this.cartera.registrarReembolso(this.destino.id, datos, clave)
      : this.cartera.registrarEgreso(this.destino.id, datos, clave);
    peticion.subscribe({
      next: (pago) => { this.guardando.set(false); this.clavePendiente = null; this.datosPendientes = null; this.registrado.emit(pago); },
      error: (err) => { this.guardando.set(false); this.errorMsg.set(err.status === 409 ? 'Esta operación ya fue enviada o está en proceso. Consulta los movimientos antes de intentar otro pago.' : obtenerMensajeApi(err, 'No se pudo registrar el pago. Reintenta sin cambiar los datos.')); }
    });
  }
}
