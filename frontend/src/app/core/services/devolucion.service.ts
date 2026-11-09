/**
 * Archivo: devolucion.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Devolucion, ListaDevoluciones, NuevaDevolucion } from '../models/negocio.model';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
  private apiUrl = `${environment.apiUrl}/devoluciones`;
  constructor(private http: HttpClient) {}

  listar(desde: string, hasta: string, motivo = '', estado = ''): Observable<ListaDevoluciones> {
    let params = new HttpParams().set('desde', desde).set('hasta', hasta);
    if (motivo) params = params.set('motivo', motivo);
    if (estado) params = params.set('estado', estado);
    return this.http.get<ListaDevoluciones>(this.apiUrl, { params });
  }
  porPedido(pedidoId: string): Observable<{ devoluciones: Devolucion[]; devuelto: Record<string, number> }> {
    return this.http.get<{ devoluciones: Devolucion[]; devuelto: Record<string, number> }>(`${this.apiUrl}/pedido/${pedidoId}`);
  }
  /** La clave debe mantenerse estable durante todos los reintentos de la misma devolución. */
  crear(datos: NuevaDevolucion, claveIdempotencia: string): Observable<Devolucion> {
    return this.http.post<Devolucion>(this.apiUrl, datos, {
      headers: new HttpHeaders({ 'Idempotency-Key': claveIdempotencia })
    });
  }
  anular(id: string, motivo: string): Observable<Devolucion> { return this.http.patch<Devolucion>(`${this.apiUrl}/${id}/anular`, { motivo }); }
}
