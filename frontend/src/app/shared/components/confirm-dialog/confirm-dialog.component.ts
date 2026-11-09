/**
 * Archivo: confirm-dialog.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, ElementRef, HostListener, ViewChild, effect, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (confirmService.estado(); as estado) {
      <div class="modal-fondo" (mousedown)="onFondo($event)">
        <div class="modal" role="alertdialog" aria-modal="true" [attr.aria-label]="estado.opciones.titulo">
          <div class="modal-cabecera">
            <div>
              <h2>{{ estado.opciones.titulo }}</h2>
              <p>{{ estado.opciones.mensaje }}</p>
            </div>
          </div>
          <div class="modal-pie">
            <button type="button" class="btn-secondary" (click)="confirmService.responder(false)">
              {{ estado.opciones.cancelar || 'Cancelar' }}
            </button>
            <button
              type="button"
              #aceptar
              [class]="estado.opciones.peligro ? 'btn-danger' : 'btn-primary'"
              style="min-height: 40px; font-size: 0.9rem"
              (click)="confirmService.responder(true)"
            >
              {{ estado.opciones.confirmar || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent {
  confirmService = inject(ConfirmService);
  @ViewChild('aceptar') aceptar?: ElementRef<HTMLButtonElement>;

  constructor() {
    effect(() => {
      if (this.confirmService.estado()) setTimeout(() => this.aceptar?.nativeElement.focus());
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmService.estado()) this.confirmService.responder(false);
  }

  onFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.confirmService.responder(false);
  }
}
