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
