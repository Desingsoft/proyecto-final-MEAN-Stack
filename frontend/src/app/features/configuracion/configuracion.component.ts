/**
 * Archivo: configuracion.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Configuración</h1>
        <p class="subtitulo">Los datos de tu empresa y las reglas de facturación. Se usan en las facturas, remisiones y órdenes de compra.</p>
      </div>
    </header>

    @if (cargando()) {
      <div class="skeleton" style="height: 420px"></div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="grid-2" style="align-items: start">
          <section class="panel">
            <div class="panel-header"><div><h2>Datos de la empresa</h2><p class="nota">Aparecen en el encabezado de tus documentos.</p></div></div>
            <div class="form-group"><label for="cf-nombre">Nombre o razón social</label><input id="cf-nombre" type="text" formControlName="nombreEmpresa" /></div>
            <div class="form-group"><label for="cf-nit">NIT</label><input id="cf-nit" type="text" formControlName="nit" placeholder="900.123.456-7" /></div>
            <div class="form-group"><label for="cf-dir">Dirección</label><input id="cf-dir" type="text" formControlName="direccion" /></div>
            <div class="form-row">
              <div class="form-group"><label for="cf-ciudad">Ciudad</label><input id="cf-ciudad" type="text" formControlName="ciudad" /></div>
              <div class="form-group"><label for="cf-tel">Teléfono</label><input id="cf-tel" type="text" formControlName="telefono" /></div>
            </div>
            <div class="form-group"><label for="cf-email">Correo</label><input id="cf-email" type="email" formControlName="email" /></div>
          </section>

          <section class="panel">
            <div class="panel-header"><div><h2>Facturación</h2><p class="nota">Cómo se calculan y numeran tus documentos.</p></div></div>
            <div class="form-row">
              <div class="form-group"><label for="cf-iva">IVA por defecto (%)</label><input id="cf-iva" type="number" min="0" max="100" formControlName="ivaPorcentaje" /></div>
              <div class="form-group"><label for="cf-dias">Días de crédito por defecto</label><input id="cf-dias" type="number" min="0" formControlName="diasCreditoDefecto" /></div>
            </div>
            <label style="display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1rem; cursor: pointer">
              <span class="switch" style="margin-top: 2px"><input type="checkbox" formControlName="preciosIncluyenIva" /><span class="pista"></span></span>
              <span>
                <strong>Mis precios ya incluyen IVA</strong>
                <span class="ayuda" style="display: block; font-size: 0.8rem; color: var(--texto-suave)">
                  Activado: la factura desglosa el IVA del precio y el total no cambia (recomendado para vender al detal).
                  Desactivado: el IVA se suma al precio.
                </span>
              </span>
            </label>
            <div class="form-row">
              <div class="form-group"><label for="cf-pf">Prefijo de facturas</label><input id="cf-pf" type="text" formControlName="prefijoFactura" maxlength="6" /></div>
              <div class="form-group"><label for="cf-pr">Prefijo de remisiones</label><input id="cf-pr" type="text" formControlName="prefijoRemision" maxlength="6" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label for="cf-po">Prefijo de órdenes de compra</label><input id="cf-po" type="text" formControlName="prefijoOrdenCompra" maxlength="6" /></div>
              <div class="form-group"><label for="cf-prc">Prefijo de recibos de caja</label><input id="cf-prc" type="text" formControlName="prefijoRecibo" maxlength="6" /></div>
            </div>
            <div class="form-group"><label for="cf-pce">Prefijo de comprobantes de egreso</label><input id="cf-pce" type="text" formControlName="prefijoEgreso" maxlength="6" /><span class="ayuda">Solo letras o números, hasta 6. Los consecutivos nunca se reinician.</span></div>
            <div class="form-row">
              <div class="form-group"><label for="cf-pnc">Notas crédito</label><input id="cf-pnc" type="text" formControlName="prefijoNotaCredito" maxlength="6" /></div>
              <div class="form-group"><label for="cf-pdv">Devoluciones</label><input id="cf-pdv" type="text" formControlName="prefijoDevolucion" maxlength="6" /></div>
              <div class="form-group"><label for="cf-pre">Reembolsos</label><input id="cf-pre" type="text" formControlName="prefijoReembolso" maxlength="6" /></div>
            </div>
            <div class="form-group"><label for="cf-nota">Nota al pie de las facturas</label><input id="cf-nota" type="text" formControlName="notaFactura" placeholder="Ej. Régimen común. Resolución de numeración…" /></div>
            <p class="ayuda" style="font-size: 0.8rem; color: var(--texto-suave)">
              <app-icon name="info" [size]="13" /> Los documentos de esta aplicación son de uso interno y no sustituyen la factura electrónica de la DIAN.
            </p>
          </section>
        </div>

        @if (errorMsg()) { <div class="error-alert" role="alert">{{ errorMsg() }}</div> }
        <div class="form-actions" style="max-width: none">
          <button type="submit" [disabled]="form.invalid || guardando() || !form.dirty">{{ guardando() ? 'Guardando…' : 'Guardar configuración' }}</button>
        </div>
      </form>
    }
  `
})
export class ConfiguracionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private configService = inject(ConfiguracionService);
  private notificacion = inject(NotificacionService);

  cargando = signal(true);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    nombreEmpresa: ['', Validators.required],
    nit: [''], direccion: [''], ciudad: [''], telefono: [''], email: ['', Validators.email],
    ivaPorcentaje: [19, [Validators.required, Validators.min(0), Validators.max(100)]],
    preciosIncluyenIva: [true],
    prefijoFactura: ['FV', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoRemision: ['RM', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoOrdenCompra: ['OC', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoRecibo: ['RC', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoEgreso: ['CE', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoNotaCredito: ['NC', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoDevolucion: ['DV', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    prefijoReembolso: ['RE', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,6}$/)]],
    diasCreditoDefecto: [30, [Validators.required, Validators.min(0)]],
    notaFactura: ['']
  });

  ngOnInit(): void {
    this.configService.obtener().subscribe({
      next: (c) => { this.form.patchValue(c as any); this.form.markAsPristine(); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.errorMsg.set('');
    this.configService.actualizar(this.form.getRawValue() as any).subscribe({
      next: () => { this.guardando.set(false); this.form.markAsPristine(); this.notificacion.exito('Configuración guardada'); },
      error: (err) => { this.guardando.set(false); this.errorMsg.set(err.error?.mensaje || 'No se pudo guardar la configuración'); }
    });
  }
}
