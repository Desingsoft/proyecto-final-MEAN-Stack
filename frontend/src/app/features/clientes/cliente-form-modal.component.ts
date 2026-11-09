/**
 * Archivo: cliente-form-modal.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente, TipoDocumentoId } from '../../core/models/negocio.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';

/** Formulario (en ventana modal) para crear o editar un cliente. Se usa en la lista, la ficha y el nuevo pedido. */
@Component({
  selector: 'app-cliente-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <app-modal [titulo]="cliente?._id ? 'Editar cliente' : 'Nuevo cliente'" descripcion="Estos datos aparecen en las remisiones y facturas." [ancho]="true" (cerrar)="cerrar.emit()">
      <form [formGroup]="form" (ngSubmit)="guardar()" id="form-cliente" novalidate>
        <div class="form-group">
          <label for="cl-nombre">Nombre o razón social</label>
          <input id="cl-nombre" type="text" formControlName="nombre" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cl-tipo">Tipo de documento</label>
            <select id="cl-tipo" formControlName="tipoDocumento">
              @for (t of tipos; track t) { <option [value]="t">{{ t }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label for="cl-doc">Número de documento</label>
            <input id="cl-doc" type="text" formControlName="documento" placeholder="Ej. 900.123.456-7" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cl-email">Correo electrónico</label>
            <input id="cl-email" type="email" formControlName="email" />
          </div>
          <div class="form-group">
            <label for="cl-tel">Teléfono</label>
            <input id="cl-tel" type="text" formControlName="telefono" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cl-dir">Dirección</label>
            <input id="cl-dir" type="text" formControlName="direccion" />
          </div>
          <div class="form-group">
            <label for="cl-ciudad">Ciudad</label>
            <input id="cl-ciudad" type="text" formControlName="ciudad" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="cl-dias">Días de crédito</label>
            <input id="cl-dias" type="number" min="0" formControlName="diasCredito" placeholder="Los de la configuración" />
            <span class="ayuda">Plazo que se le da a este cliente para pagar.</span>
          </div>
          <div class="form-group">
            <label for="cl-cupo">Cupo de crédito ($)</label>
            <input id="cl-cupo" type="number" min="0" step="1000" formControlName="cupoCredito" />
            <span class="ayuda">Lo máximo que puede deber. 0 = sin límite.</span>
          </div>
        </div>
        <div class="form-group">
          <label for="cl-notas">Notas internas</label>
          <input id="cl-notas" type="text" formControlName="notas" placeholder="Condiciones especiales, horarios de entrega…" />
        </div>
        @if (errorMsg()) { <div class="error-alert" role="alert">{{ errorMsg() }}</div> }
      </form>
      <div pie>
        <button type="button" class="btn-secondary" (click)="cerrar.emit()" [disabled]="guardando()">Cancelar</button>
        <button type="submit" form="form-cliente" class="btn-primary" [disabled]="form.invalid || guardando()">
          {{ guardando() ? 'Guardando…' : (cliente?._id ? 'Guardar cambios' : 'Crear cliente') }}
        </button>
      </div>
    </app-modal>
  `
})
export class ClienteFormModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clienteService = inject(ClienteService);

  @Input() cliente: Partial<Cliente> | null = null;
  @Output() guardado = new EventEmitter<Cliente>();
  @Output() cerrar = new EventEmitter<void>();

  readonly tipos: TipoDocumentoId[] = ['NIT', 'CC', 'CE', 'Pasaporte', 'Otro'];
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    nombre: ['', Validators.required],
    tipoDocumento: ['NIT' as TipoDocumentoId],
    documento: [''],
    email: ['', Validators.email],
    telefono: [''],
    direccion: [''],
    ciudad: [''],
    diasCredito: [null as number | null],
    cupoCredito: [0 as number | null],
    notas: ['']
  });

  ngOnInit(): void {
    if (this.cliente) {
      const { nombre = '', tipoDocumento = 'NIT', documento = '', email = '', telefono = '', direccion = '', ciudad = '', notas = '', diasCredito = null, cupoCredito = 0 } = this.cliente;
      this.form.setValue({ nombre, tipoDocumento, documento, email, telefono, direccion, ciudad, diasCredito: diasCredito ?? null, cupoCredito: cupoCredito ?? 0, notas });
    }
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.errorMsg.set('');
    const datos = this.form.getRawValue() as Partial<Cliente>;
    const peticion = this.cliente?._id ? this.clienteService.actualizar(this.cliente._id, datos) : this.clienteService.crear(datos);
    peticion.subscribe({
      next: (c) => { this.guardando.set(false); this.guardado.emit(c); },
      error: (err) => { this.guardando.set(false); this.errorMsg.set(err.error?.mensaje || 'No se pudo guardar el cliente'); }
    });
  }
}
