/**
 * Archivo: modal.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Ventana modal reutilizable. Contenido proyectado: lo normal va al cuerpo; el atributo `pie` al pie de acciones. */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="modal-fondo" (mousedown)="onFondo($event)">
      <div class="modal" [class.ancho]="ancho" [class.extra]="extra" role="dialog" aria-modal="true" tabindex="-1" [attr.aria-label]="titulo" #ventana>
        <div class="modal-cabecera">
          <div>
            <h2>{{ titulo }}</h2>
            @if (descripcion) { <p>{{ descripcion }}</p> }
          </div>
          <button type="button" class="btn-icono" (click)="cerrar.emit()" aria-label="Cerrar">
            <app-icon name="cerrar" [size]="18" />
          </button>
        </div>
        <div class="modal-cuerpo"><ng-content></ng-content></div>
        <div class="modal-pie"><ng-content select="[pie]"></ng-content></div>
      </div>
    </div>
  `
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() titulo = '';
  @Input() descripcion = '';
  @Input() ancho = false;
  @Input() extra = false;
  @Output() cerrar = new EventEmitter<void>();
  @ViewChild('ventana', { static: true }) ventana!: ElementRef<HTMLElement>;

  private elementoPrevio: HTMLElement | null = null;

  ngOnInit(): void {
    this.elementoPrevio = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    // Tras abrir el diálogo, enfoca un control o el contenedor si no hay controles.
    setTimeout(() => {
      const destino = this.ventana.nativeElement.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
      (destino ?? this.ventana.nativeElement).focus();
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.elementoPrevio?.focus?.();
  }

  /**
   * Mantiene el foco dentro del diálogo mientras esté abierto.
   * Impide que la navegación con Tab alcance controles ocultos detrás del modal.
   */
  @HostListener('document:keydown.tab', ['$event'])
  mantenerFoco(evento: KeyboardEvent): void {
    const elementos = Array.from(this.ventana.nativeElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((elemento) => elemento.getClientRects().length > 0);
    if (!elementos.length) { evento.preventDefault(); this.ventana.nativeElement.focus(); return; }
    const primero = elementos[0];
    const ultimo = elementos[elementos.length - 1];
    if (evento.shiftKey && (document.activeElement === primero || !this.ventana.nativeElement.contains(document.activeElement))) {
      evento.preventDefault(); ultimo.focus();
    } else if (!evento.shiftKey && (document.activeElement === ultimo || !this.ventana.nativeElement.contains(document.activeElement))) {
      evento.preventDefault(); primero.focus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar.emit();
  }

  onFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.cerrar.emit();
  }
}
