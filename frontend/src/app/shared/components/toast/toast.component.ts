/**
 * Archivo: toast.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, inject } from '@angular/core';
import { NotificacionService } from '../../services/notificacion.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of notificacionService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast-' + toast.tipo" role="status" (click)="notificacionService.cerrar(toast.id)">
          <span class="icono-toast">
            <app-icon [name]="toast.tipo === 'exito' ? 'check' : toast.tipo === 'error' ? 'alerta' : 'info'" [size]="16" [trazo]="2.4" />
          </span>
          <span>{{ toast.mensaje }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed; bottom: 1.25rem; right: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;
      z-index: 1200; max-width: calc(100vw - 2.5rem);
    }
    .toast {
      display: flex; align-items: center; gap: 0.7rem; padding: 0.75rem 1.1rem 0.75rem 0.8rem; border-radius: 12px;
      background: var(--tinta); color: #fff; font-size: 0.9rem; cursor: pointer; min-width: 240px;
      box-shadow: var(--sombra-flotante); animation: entrar 0.25s ease;
    }
    .icono-toast { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; flex: none; }
    .toast-exito .icono-toast { background: var(--ok); }
    .toast-error .icono-toast { background: var(--agotado); }
    .toast-info .icono-toast { background: var(--info); }
    @keyframes entrar { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  `]
})
export class ToastComponent {
  notificacionService = inject(NotificacionService);
}
