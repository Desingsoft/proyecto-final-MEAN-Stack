/**
 * Archivo: producto.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto } from '../models/producto.model';
import { ReposicionResponse } from '../models/reportes.model';

export interface ProductosResponse {
  productos: Producto[];
  total: number;
  paginas: number;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  /** Ruta base de productos, definida por el entorno. */
  private readonly apiUrl = `${environment.apiUrl}/productos`;

  constructor(private http: HttpClient) {}

  /** Consulta paginada; los filtros opcionales se envían solo si están presentes. */
  getTodos(
    pagina = 1,
    buscar = '',
    filtros: { categoria?: string; estadoStock?: string; limite?: number } = {}
  ): Observable<ProductosResponse> {
    let params = new HttpParams().set('pagina', pagina);
    if (buscar) params = params.set('buscar', buscar);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.estadoStock) params = params.set('estadoStock', filtros.estadoStock);
    if (filtros.limite) params = params.set('limite', filtros.limite);
    return this.http.get<ProductosResponse>(this.apiUrl, { params });
  }

  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categorias`);
  }

  getReposicion(): Observable<ReposicionResponse> {
    return this.http.get<ReposicionResponse>(`${this.apiUrl}/reposicion`);
  }

  getStockBajo(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/stock-bajo`);
  }

  getPorId(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  /** Crea un producto; la API valida campos, permisos y unicidad del SKU. */
  crear(producto: Omit<Producto, 'stock'>): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto);
  }

  actualizar(id: string, producto: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, producto);
  }

  eliminar(id: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`);
  }
}
