/**
 * Archivo: usuario.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarUsuarioPayload, NuevoUsuarioPayload, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private authUrl = `${environment.apiUrl}/auth`;
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  registrar(usuario: NuevoUsuarioPayload): Observable<{ usuario: Usuario }> {
    return this.http.post<{ usuario: Usuario }>(`${this.authUrl}/registro`, usuario);
  }

  listar(filtros: { buscar?: string; role?: string; activo?: string } = {}): Observable<Usuario[]> {
    let params = new HttpParams();
    if (filtros.buscar) params = params.set('buscar', filtros.buscar);
    if (filtros.role) params = params.set('role', filtros.role);
    if (filtros.activo) params = params.set('activo', filtros.activo);
    return this.http.get<Usuario[]>(this.apiUrl, { params });
  }

  actualizar(id: string, cambios: ActualizarUsuarioPayload): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.apiUrl}/${id}`, cambios);
  }

  restablecerPassword(id: string, password: string): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`${this.apiUrl}/${id}/password`, { password });
  }

  miPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/yo`);
  }

  cambiarMiPassword(passwordActual: string, passwordNueva: string): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`${this.apiUrl}/yo/password`, { passwordActual, passwordNueva });
  }
}
