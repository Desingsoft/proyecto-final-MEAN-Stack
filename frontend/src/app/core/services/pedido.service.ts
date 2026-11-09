/**
 * Archivo: pedido.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pedido } from '../models/pedido.model';

export interface PedidosResponse {
  pedidos: Pedido[];
  total: number;
  paginas: number;
}

/** Resumen de estados devuelto por el dashboard de pedidos. */
export interface ResumenPedidos { pendientes: number; procesando: number; completadosHoy: number }

/** Solicitud de creación: el servidor determina los importes finales. */
export interface NuevoPedidoPayload {
  cliente?: string;
  clienteRef?: string;
  descuentoPorcentaje?: number;
  items: { producto: string; cantidad: number; bodega?: string }[];
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private apiUrl = `${environment.apiUrl}/pedidos`;

  constructor(private http: HttpClient) {}

  getTodos(pagina = 1, estado = '', cliente = ''): Observable<PedidosResponse> {
    let params = new HttpParams().set('pagina', pagina);
    if (estado) params = params.set('estado', estado);
    if (cliente) params = params.set('cliente', cliente);
    return this.http.get<PedidosResponse>(this.apiUrl, { params });
  }

  getResumen(): Observable<ResumenPedidos> {
    return this.http.get<ResumenPedidos>(`${this.apiUrl}/resumen`);
  }

  getPorId(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  crear(pedido: NuevoPedidoPayload): Observable<Pedido> {
    return this.http.post<Pedido>(this.apiUrl, pedido);
  }

  cambiarEstado(id: string, estado: string): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.apiUrl}/${id}/estado`, { estado });
  }
}
