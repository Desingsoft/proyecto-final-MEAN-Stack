/**
 * Archivo: tiempo-real.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, debounceTime, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

const TODOS = ['pedidos', 'productos', 'inventario', 'proveedores', 'usuarios'];

/**
 * Canal de cambios en tiempo real (Server-Sent Events sobre fetch, para poder enviar el token).
 * Las pantallas se suscriben con `alCambiar('pedidos', 'productos')` y vuelven a cargar sus datos.
 */
@Injectable({ providedIn: 'root' })
export class TiempoRealService {
  private auth = inject(AuthService);
  private router = inject(Router);
  private zona = inject(NgZone);

  conectado = signal(false);

  private cambios = new Subject<string[]>();
  private activo = false;
  private controlador?: AbortController;
  private yaConecto = false;

  iniciar(): void {
    if (this.activo) return;
    this.activo = true;
    void this.ciclo();
  }

  detener(): void {
    this.activo = false;
    this.controlador?.abort();
    this.conectado.set(false);
    this.yaConecto = false;
  }

  /** Emite (con un pequeño retardo para agrupar ráfagas) cuando cambia alguno de los recursos indicados. */
  alCambiar(...tipos: string[]): Observable<void> {
    return this.cambios.pipe(
      filter((recibidos) => recibidos.some((t) => tipos.includes(t))),
      debounceTime(400),
      map(() => undefined)
    );
  }

  private async ciclo(): Promise<void> {
    let intentos = 0;
    while (this.activo) {
      this.controlador = new AbortController();
      try {
        const token = this.auth.getToken();
        if (!token) break;

        const respuesta = await fetch(`${environment.apiUrl}/eventos`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: this.controlador.signal
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
          // La sesión ya no es válida (por ejemplo, el token expiró).
          this.zona.run(() => {
            this.detener();
            this.auth.logout();
            this.router.navigate(['/login'], { queryParams: { sesionExpirada: 'true' } });
          });
          return;
        }
        if (!respuesta.ok || !respuesta.body) throw new Error('sin conexión');

        this.zona.run(() => this.conectado.set(true));
        // Si volvimos tras una caída, pudimos perdernos cambios: todas las pantallas recargan.
        if (this.yaConecto) this.zona.run(() => this.cambios.next(TODOS));
        this.yaConecto = true;
        intentos = 0;

        await this.leer(respuesta.body.getReader());
      } catch {
        /* se reintenta abajo */
      }

      this.zona.run(() => this.conectado.set(false));
      if (!this.activo) break;
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** intentos++, 15000)));
    }
  }

  private async leer(lector: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    const decodificador = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await lector.read();
      if (done) return;
      buffer += decodificador.decode(value, { stream: true });

      let corte: number;
      while ((corte = buffer.indexOf('\n\n')) >= 0) {
        const bloque = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 2);
        this.procesar(bloque);
      }
    }
  }

  private procesar(bloque: string): void {
    let evento = 'message';
    let datos = '';
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith('event:')) evento = linea.slice(6).trim();
      else if (linea.startsWith('data:')) datos += linea.slice(5).trim();
    }
    if (evento !== 'cambio' || !datos) return;
    try {
      const { tipos } = JSON.parse(datos) as { tipos: string[] };
      this.zona.run(() => this.cambios.next(tipos));
    } catch {
      /* mensaje mal formado: se ignora */
    }
  }
}
