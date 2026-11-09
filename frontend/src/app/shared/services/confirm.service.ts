/**
 * Archivo: confirm.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  peligro?: boolean;
}

/** Reemplaza a window.confirm con un diálogo propio: await confirmService.confirmar({...}) */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  estado = signal<{ opciones: OpcionesConfirmacion; resolver: (r: boolean) => void } | null>(null);

  confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    return new Promise((resolver) => this.estado.set({ opciones, resolver }));
  }

  responder(respuesta: boolean): void {
    this.estado()?.resolver(respuesta);
    this.estado.set(null);
  }
}
