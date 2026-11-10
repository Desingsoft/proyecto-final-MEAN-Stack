/**
 * Archivo: auth.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  usuarioActual = signal<Usuario | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Si el dato guardado está corrupto (por ejemplo "undefined"), se descarta en vez de romper toda la app.
    try {
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado) this.usuarioActual.set(JSON.parse(usuarioGuardado));
    } catch {
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(res => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          this.usuarioActual.set(res.usuario);
        })
      );
  }

  registrarPublico(datos: { nombre: string; email: string; password: string; edad: number; fechaNacimiento: string; sexo: string; role: 'ventas' | 'bodeguero' }): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/registro-publico`, datos);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  estaAutenticado(): boolean {
    return !!this.getToken();
  }

  tieneRol(roles: string[]): boolean {
    const usuario = this.usuarioActual();
    return usuario ? roles.includes(usuario.role) : false;
  }
}
