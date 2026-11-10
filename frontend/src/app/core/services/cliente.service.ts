/**
 * Archivo: cliente.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, ClienteFicha } from '../models/negocio.model';

export interface ClientesResponse { clientes: Cliente[]; total: number; paginas: number; }

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private apiUrl = `${environment.apiUrl}/clientes`;
  constructor(private http: HttpClient) {}

  listar(pagina = 1, buscar = '', limite = 20): Observable<ClientesResponse> {
    let params = new HttpParams().set('pagina', pagina).set('limite', limite);
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<ClientesResponse>(this.apiUrl, { params });
  }
  obtener(id: string): Observable<ClienteFicha> { return this.http.get<ClienteFicha>(`${this.apiUrl}/${id}`); }
  crear(cliente: Partial<Cliente>): Observable<Cliente> { return this.http.post<Cliente>(this.apiUrl, cliente); }
  actualizar(id: string, cliente: Partial<Cliente>): Observable<Cliente> { return this.http.put<Cliente>(`${this.apiUrl}/${id}`, cliente); }
  eliminar(id: string): Observable<{ mensaje: string }> { return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`); }
}
