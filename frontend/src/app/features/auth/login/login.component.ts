/**
 * Archivo: login.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);

  cargando = signal(false);
  errorMsg = signal('');
  verPassword = signal(false);
  modoRegistro = signal(false);
  registroExitoso = signal('');

  registroForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    fechaNacimiento: ['', Validators.required],
    edad: [null as number | null, [Validators.required, Validators.min(2), Validators.max(120)]],
    sexo: ['', Validators.required],
    role: ['ventas' as 'ventas' | 'bodeguero', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/)]],
  });

  cambiarModo(registro: boolean): void {
    this.modoRegistro.set(registro);
    this.errorMsg.set('');
    this.registroExitoso.set('');
  }

  registrar(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    const datos = this.registroForm.getRawValue();
    if (!datos.fechaNacimiento || !datos.edad || !datos.nombre || !datos.email || !datos.password || !datos.sexo || !datos.role) return;
    const fecha = new Date(`${datos.fechaNacimiento}T00:00:00Z`);
    const hoy = new Date();
    const edadCalculada = hoy.getUTCFullYear() - fecha.getUTCFullYear()
      - ((hoy.getUTCMonth() < fecha.getUTCMonth() || (hoy.getUTCMonth() === fecha.getUTCMonth() && hoy.getUTCDate() < fecha.getUTCDate())) ? 1 : 0);
    if (!Number.isFinite(fecha.getTime()) || edadCalculada !== Number(datos.edad)) {
      this.errorMsg.set('La edad no coincide con la fecha de nacimiento.');
      return;
    }
    this.cargando.set(true);
    this.errorMsg.set('');
    this.authService.registrarPublico({
      nombre: datos.nombre, email: datos.email, password: datos.password,
      edad: Number(datos.edad), fechaNacimiento: datos.fechaNacimiento,
      sexo: datos.sexo, role: datos.role
    }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.modoRegistro.set(false);
        this.registroExitoso.set('Cuenta creada correctamente. Inicia sesión con tus credenciales.');
        this.loginForm.patchValue({ email: datos.email });
      },
      error: err => {
        this.cargando.set(false);
        const detalles = err.error?.errores;
        this.errorMsg.set(Array.isArray(detalles) && detalles.length
          ? detalles.map((e: { mensaje?: string }) => e.mensaje).join('. ')
          : err.error?.mensaje || 'No fue posible registrar el usuario.');
      }
    });
  }

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParams['sesionExpirada']) {
      this.errorMsg.set('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.cargando.set(true);
    this.errorMsg.set('');

    const { email, password } = this.loginForm.value;
    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.mensaje || 'Error al iniciar sesión');
        this.cargando.set(false);
      }
    });
  }
}
