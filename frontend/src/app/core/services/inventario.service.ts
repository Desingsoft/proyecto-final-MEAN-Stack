/**
 * Archivo: inventario.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Movimiento } from '../models/movimiento.model';

export interface BodegaTransferencia { _id: string; nombre: string; sucursal: string; }
export interface TransferenciaRegistro {
  _id: string; producto: string; origen: string; destino: string;
  cantidad: number; motivo: string; createdAt: string;
}
export interface HistorialTransferencias { transferencias: TransferenciaRegistro[]; total: number; pagina: number; limite: number; paginas: number; }
export interface TransferenciaPayload { producto: string; origen: string; destino: string; cantidad: number; motivo?: string; }

export interface MovimientosResponse {
  movimientos: Movimiento[];
  total: number;
  paginas: number;
}

export interface NuevoMovimientoPayload {
  producto: string;
  bodega: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo?: string;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private apiUrl = `${environment.apiUrl}/inventario`;

  constructor(private http: HttpClient) {}

  getBodegasAutorizadas(): Observable<BodegaTransferencia[]> {
    return this.http.get<BodegaTransferencia[]>(`${this.apiUrl}/bodegas-autorizadas`);
  }

  getTransferencias(pagina = 1): Observable<HistorialTransferencias> {
    return this.http.get<HistorialTransferencias>(`${this.apiUrl}/transferencias`, {params: new HttpParams().set('pagina', pagina)});
  }

  transferir(datos: TransferenciaPayload, clave: string): Observable<{ transferenciaId: string }> {
    // Clave distinta por acción; se conserva en reintentos HTTP de esta misma solicitud.
    return this.http.post<{ transferenciaId: string }>(`${this.apiUrl}/transferencias`, datos, {
      headers: { 'Idempotency-Key': clave }
    });
  }

  getMovimientos(pagina = 1, productoId = ''): Observable<MovimientosResponse> {
    let params = new HttpParams().set('pagina', pagina);
    if (productoId) params = params.set('producto', productoId);
    return this.http.get<MovimientosResponse>(`${this.apiUrl}/movimientos`, { params });
  }

  registrar(movimiento: NuevoMovimientoPayload): Observable<Movimiento> {
    return this.http.post<Movimiento>(`${this.apiUrl}/movimiento`, movimiento, {
      headers: { 'Idempotency-Key': crypto.randomUUID() }
    });
  }
}
