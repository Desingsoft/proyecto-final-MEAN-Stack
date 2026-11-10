/**
 * Archivo: cartera.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoCuenta, FilaAFavor, FilaCobrar, FilaPagar, MetodoPago, Pago, RecaudosResponse, ResumenCartera, SaldoCliente, Situacion } from '../models/negocio.model';

export interface ListaCobrar { facturas: FilaCobrar[]; total: number; paginas: number; saldoFiltrado: number; }
export interface ListaPagar { ordenes: FilaPagar[]; total: number; paginas: number; saldoFiltrado: number; }
export interface DatosPago { monto: number; metodo: MetodoPago; fecha?: string; referencia?: string; nota?: string; }

@Injectable({ providedIn: 'root' })
export class CarteraService {
  private cartera = `${environment.apiUrl}/cartera`;
  private pagos = `${environment.apiUrl}/pagos`;
  constructor(private http: HttpClient) {}

  resumenCobrar(): Observable<ResumenCartera> { return this.http.get<ResumenCartera>(`${this.cartera}/cobrar/resumen`); }
  listaCobrar(pagina = 1, situacion: '' | Situacion = '', buscar = '', limite = 15): Observable<ListaCobrar> {
    let params = new HttpParams().set('pagina', pagina).set('limite', limite);
    if (situacion) params = params.set('situacion', situacion);
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<ListaCobrar>(`${this.cartera}/cobrar`, { params });
  }
  porCliente(): Observable<SaldoCliente[]> { return this.http.get<SaldoCliente[]>(`${this.cartera}/cobrar/clientes`); }
  estadoCuenta(clienteId: string): Observable<EstadoCuenta> { return this.http.get<EstadoCuenta>(`${this.cartera}/cobrar/estado-cuenta/${clienteId}`); }

  resumenPagar(): Observable<ResumenCartera> { return this.http.get<ResumenCartera>(`${this.cartera}/pagar/resumen`); }
  listaPagar(pagina = 1, situacion: '' | Situacion = '', buscar = '', limite = 15): Observable<ListaPagar> {
    let params = new HttpParams().set('pagina', pagina).set('limite', limite);
    if (situacion) params = params.set('situacion', situacion);
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<ListaPagar>(`${this.cartera}/pagar`, { params });
  }

  /** Clave estable para reintentos del mismo cobro; el servidor impone unicidad. */
  registrarCobro(documentoId: string, datos: DatosPago, clave: string): Observable<Pago> {
    return this.http.post<Pago>(`${this.pagos}/cobro`, { documentoId, ...datos }, { headers: new HttpHeaders({ 'Idempotency-Key': clave }) });
  }
  registrarReembolso(documentoId: string, datos: DatosPago, clave: string): Observable<Pago> {
    return this.http.post<Pago>(`${this.pagos}/reembolso`, { documentoId, ...datos }, { headers: new HttpHeaders({ 'Idempotency-Key': clave }) });
  }
  aFavor(): Observable<{ facturas: FilaAFavor[]; total: number }> { return this.http.get<{ facturas: FilaAFavor[]; total: number }>(`${this.cartera}/cobrar/a-favor`); }
  registrarEgreso(ordenId: string, datos: DatosPago, clave: string): Observable<Pago> {
    return this.http.post<Pago>(`${this.pagos}/egreso`, { ordenId, ...datos }, { headers: new HttpHeaders({ 'Idempotency-Key': clave }) });
  }
  anularPago(id: string, motivo: string): Observable<Pago> { return this.http.patch<Pago>(`${this.pagos}/${id}/anular`, { motivo }); }
  obtenerPago(id: string): Observable<Pago> { return this.http.get<Pago>(`${this.pagos}/${id}`); }
  pagosDeDocumento(id: string): Observable<Pago[]> { return this.http.get<Pago[]>(`${this.pagos}/documento/${id}`); }
  pagosDeOrden(id: string): Observable<Pago[]> { return this.http.get<Pago[]>(`${this.pagos}/orden/${id}`); }
  recaudos(tipo: 'cobro' | 'egreso', desde: string, hasta: string, metodo = ''): Observable<RecaudosResponse> {
    let params = new HttpParams().set('tipo', tipo).set('desde', desde).set('hasta', hasta);
    if (metodo) params = params.set('metodo', metodo);
    return this.http.get<RecaudosResponse>(this.pagos, { params });
  }
}
