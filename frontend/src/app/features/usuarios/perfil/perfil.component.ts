/**
 * Archivo: perfil.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { DESCRIPCION_ROL, ETIQUETA_ROL, Usuario } from '../../../core/models/usuario.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './perfil.component.html'
})
export class PerfilComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private notificacion = inject(NotificacionService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly etiquetaRol = ETIQUETA_ROL;
  readonly descripcionRol = DESCRIPCION_ROL;

  perfil = signal<Usuario | null>(null);
  guardando = signal(false);
  errorMsg = signal('');
  verPassword = signal(false);

  form = this.fb.group({
    passwordActual: ['', Validators.required],
    passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', Validators.required]
  });

  iniciales = computed(() => {
    const nombre = this.perfil()?.nombre ?? this.authService.usuarioActual()?.nombre ?? '';
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
  });

  ngOnInit(): void {
    this.usuarioService.miPerfil().subscribe({
      next: (p) => this.perfil.set(p),
      error: () => this.perfil.set(this.authService.usuarioActual())
    });
  }

  /** 0 a 4 según longitud y variedad de caracteres. */
  fuerza(): number {
    const valor = this.form.value.passwordNueva ?? '';
    let puntos = 0;
    if (valor.length >= 6) puntos++;
    if (valor.length >= 10) puntos++;
    if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) puntos++;
    if (/\d/.test(valor) && /[^A-Za-z0-9]/.test(valor)) puntos++;
    else if (/\d/.test(valor) && valor.length >= 8) puntos++;
    return Math.min(puntos, 4);
  }

  etiquetaFuerza(): string {
    return ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'][this.fuerza()];
  }

  noCoinciden(): boolean {
    const { passwordNueva, confirmar } = this.form.value;
    return !!confirmar && passwordNueva !== confirmar;
  }

  guardar(): void {
    if (this.form.invalid || this.noCoinciden()) return;
    const { passwordActual, passwordNueva } = this.form.getRawValue();

    this.guardando.set(true);
    this.errorMsg.set('');
    this.usuarioService.cambiarMiPassword(passwordActual!, passwordNueva!).subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.reset();
        this.notificacion.exito('Tu contraseña fue actualizada');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMsg.set(err.error?.mensaje || 'No se pudo cambiar la contraseña');
      }
    });
  }
}
