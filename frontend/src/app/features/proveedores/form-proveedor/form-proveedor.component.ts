/**
 * Archivo: form-proveedor.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';

@Component({
  selector: 'app-form-proveedor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './form-proveedor.component.html'
})
export class FormProveedorComponent implements OnInit {
  private fb = inject(FormBuilder);

  proveedorId = signal<string | null>(null);
  esEdicion = signal(false);
  cargando = signal(false);
  errorMsg = signal('');

  proveedorForm = this.fb.group({
    nombre: ['', Validators.required],
    contacto: [''],
    telefono: [''],
    email: ['', Validators.email],
    diasCredito: [30, [Validators.min(0)]]
  });

  constructor(
    private proveedorService: ProveedorService,
    private notificacionService: NotificacionService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.proveedorId.set(id);
      this.esEdicion.set(true);
      this.cargando.set(true);
      this.proveedorService.getPorId(id).subscribe({
        next: (proveedor) => {
          this.proveedorForm.patchValue(proveedor);
          this.cargando.set(false);
        },
        error: () => {
          this.errorMsg.set('No se pudo cargar el proveedor');
          this.cargando.set(false);
        }
      });
    }
  }

  onSubmit(): void {
    if (this.proveedorForm.invalid) return;

    this.cargando.set(true);
    const datos = this.proveedorForm.value;

    const operacion = this.esEdicion()
      ? this.proveedorService.actualizar(this.proveedorId()!, datos as any)
      : this.proveedorService.crear(datos as any);

    operacion.subscribe({
      next: () => {
        this.notificacionService.exito(this.esEdicion() ? 'Proveedor actualizado' : 'Proveedor creado');
        this.router.navigate(['/proveedores']);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.mensaje || 'Error al guardar el proveedor');
        this.cargando.set(false);
      }
    });
  }
}
