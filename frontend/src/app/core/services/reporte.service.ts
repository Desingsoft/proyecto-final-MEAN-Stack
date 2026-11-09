/**
 * Archivo: reporte.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardResponse, ReporteInventario, ReporteMovimientos, ReporteVentas
} from '../models/reportes.model';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  dashboard(dias = 14): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/dashboard`, { params: new HttpParams().set('dias', dias) });
  }

  ventas(desde: string, hasta: string): Observable<ReporteVentas> {
    return this.http.get<ReporteVentas>(`${this.apiUrl}/ventas`, { params: new HttpParams().set('desde', desde).set('hasta', hasta) });
  }

  inventario(): Observable<ReporteInventario> {
    return this.http.get<ReporteInventario>(`${this.apiUrl}/inventario`);
  }

  movimientos(desde: string, hasta: string): Observable<ReporteMovimientos> {
    return this.http.get<ReporteMovimientos>(`${this.apiUrl}/movimientos`, { params: new HttpParams().set('desde', desde).set('hasta', hasta) });
  }
}
