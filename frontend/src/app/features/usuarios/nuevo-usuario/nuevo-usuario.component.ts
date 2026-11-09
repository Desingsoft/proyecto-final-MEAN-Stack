/**
 * Archivo: nuevo-usuario.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../../core/services/usuario.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { DESCRIPCION_ROL, ETIQUETA_ROL, RolUsuario } from '../../../core/models/usuario.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-nuevo-usuario',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './nuevo-usuario.component.html'
})
export class NuevoUsuarioComponent {
  private fb = inject(FormBuilder);

  readonly roles: RolUsuario[] = ['admin', 'bodeguero', 'ventas'];
  readonly etiquetaRol = ETIQUETA_ROL;
  readonly descripcionRol = DESCRIPCION_ROL;

  cargando = signal(false);
  errorMsg = signal('');
  verPassword = signal(false);

  usuarioForm = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    // Campos de perfil requeridos por el formulario y la API.
    fechaNacimiento: ['', Validators.required],
    sexo: ['prefiero_no_decir' as const, Validators.required],
    ciudad: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    role: ['ventas' as RolUsuario, Validators.required]
  });

  constructor(
    private usuarioService: UsuarioService,
    private notificacionService: NotificacionService,
    public router: Router
  ) {}

  rolSeleccionado(): RolUsuario {
    return (this.usuarioForm.value.role as RolUsuario) ?? 'ventas';
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) { this.usuarioForm.markAllAsTouched(); return; }

    this.cargando.set(true);
    this.errorMsg.set('');

    this.usuarioService.registrar(this.usuarioForm.value as any).subscribe({
      next: () => {
        this.cargando.set(false);
        this.notificacionService.exito('Usuario creado correctamente');
        this.router.navigate(['/usuarios']);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.mensaje || 'Error al crear el usuario');
        this.cargando.set(false);
      }
    });
  }
}
