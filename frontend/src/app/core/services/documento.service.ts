/**
 * Archivo: documento.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentoResumen, DocumentoVenta } from '../models/negocio.model';

export interface DocumentosResponse { documentos: DocumentoResumen[]; total: number; paginas: number; }
export interface EmitirPayload {
  pedidoId: string;
  tipo: 'factura' | 'remision';
  formaPago?: 'contado' | 'credito';
  diasCredito?: number;
  notas?: string;
  ivaPorcentaje?: number;
  metodoPago?: string;
  referenciaPago?: string;
  forzarCupo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private apiUrl = `${environment.apiUrl}/documentos`;
  constructor(private http: HttpClient) {}

  listar(pagina = 1, tipo = '', estado = '', buscar = ''): Observable<DocumentosResponse> {
    let params = new HttpParams().set('pagina', pagina);
    if (tipo) params = params.set('tipo', tipo);
    if (estado) params = params.set('estado', estado);
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<DocumentosResponse>(this.apiUrl, { params });
  }
  porPedido(pedidoId: string): Observable<Pick<DocumentoVenta, '_id' | 'tipo' | 'numero' | 'total' | 'estado' | 'createdAt' | 'formaPago' | 'pagado' | 'saldo' | 'acreditado' | 'reembolsado' | 'saldoAFavor' | 'estadoPago' | 'numeroOrigen' | 'facturaOrigen' | 'ivaPorcentaje' | 'preciosIncluyenIva'>[]> {
    return this.http.get<any>(`${this.apiUrl}/pedido/${pedidoId}`);
  }
  obtener(id: string): Observable<DocumentoVenta> { return this.http.get<DocumentoVenta>(`${this.apiUrl}/${id}`); }
  emitir(datos: EmitirPayload): Observable<DocumentoVenta> { return this.http.post<DocumentoVenta>(this.apiUrl, datos); }
  anular(id: string, motivo: string): Observable<DocumentoVenta> { return this.http.patch<DocumentoVenta>(`${this.apiUrl}/${id}/anular`, { motivo }); }
}
