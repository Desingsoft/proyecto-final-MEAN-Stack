/**
 * Archivo: configuracion.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Configuracion } from '../models/negocio.model';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private apiUrl = `${environment.apiUrl}/configuracion`;
  /** Última configuración cargada (la usan los PDF y los formularios). */
  actual = signal<Configuracion | null>(null);
  constructor(private http: HttpClient) {}

  obtener(): Observable<Configuracion> {
    return this.http.get<Configuracion>(this.apiUrl).pipe(tap((c) => this.actual.set(c)));
  }
  actualizar(cambios: Partial<Configuracion>): Observable<Configuracion> {
    return this.http.put<Configuracion>(this.apiUrl, cambios).pipe(tap((c) => this.actual.set(c)));
  }
}
