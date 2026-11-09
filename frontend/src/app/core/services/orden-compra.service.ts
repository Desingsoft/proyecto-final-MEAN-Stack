/**
 * Archivo: orden-compra.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoOrden, OrdenCompra, OrdenesResponse } from '../models/negocio.model';

export interface OrdenPayload {
  proveedor: string;
  items: { producto: string; cantidad: number; costoUnitario?: number }[];
  notas?: string;
  fechaEsperada?: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrdenCompraService {
  private apiUrl = `${environment.apiUrl}/ordenes-compra`;
  constructor(private http: HttpClient) {}

  listar(pagina = 1, estado = '', buscar = ''): Observable<OrdenesResponse> {
    let params = new HttpParams().set('pagina', pagina);
    if (estado) params = params.set('estado', estado);
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<OrdenesResponse>(this.apiUrl, { params });
  }
  obtener(id: string): Observable<OrdenCompra> { return this.http.get<OrdenCompra>(`${this.apiUrl}/${id}`); }
  crear(orden: OrdenPayload): Observable<OrdenCompra> { return this.http.post<OrdenCompra>(this.apiUrl, orden); }
  actualizar(id: string, orden: Partial<OrdenPayload>): Observable<OrdenCompra> { return this.http.put<OrdenCompra>(`${this.apiUrl}/${id}`, orden); }
  cambiarEstado(id: string, estado: EstadoOrden): Observable<OrdenCompra> { return this.http.patch<OrdenCompra>(`${this.apiUrl}/${id}/estado`, { estado }); }
  recibir(id: string, items: { producto: string; cantidad: number }[], actualizarCosto: boolean, nota: string): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(`${this.apiUrl}/${id}/recibir`, { items, actualizarCosto, nota });
  }
  actualizarFacturacion(id: string, datos: { facturaProveedor?: string; fechaVencimientoPago?: string | null }): Observable<OrdenCompra> {
    return this.http.patch<OrdenCompra>(`${this.apiUrl}/${id}/facturacion`, datos);
  }
  desdeReposicion(items: { producto: string; cantidad: number }[]): Observable<{ ordenes: OrdenCompra[]; sinProveedor: { producto: string; nombre: string }[] }> {
    return this.http.post<any>(`${this.apiUrl}/desde-reposicion`, { items });
  }
}
