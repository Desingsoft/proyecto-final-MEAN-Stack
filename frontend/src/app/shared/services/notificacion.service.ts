/**
 * Archivo: notificacion.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  mensaje: string;
  tipo: 'exito' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  toasts = signal<Toast[]>([]);
  private siguienteId = 0;

  mostrar(mensaje: string, tipo: Toast['tipo'] = 'info'): void {
    const id = this.siguienteId++;
    this.toasts.update(t => [...t, { id, mensaje, tipo }]);
    setTimeout(() => this.cerrar(id), 4000);
  }

  exito(mensaje: string): void {
    this.mostrar(mensaje, 'exito');
  }

  info(mensaje: string): void {
    this.mostrar(mensaje, 'info');
  }

  error(mensaje: string): void {
    this.mostrar(mensaje, 'error');
  }

  cerrar(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
