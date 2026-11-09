/**
 * Archivo: cartera.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-cartera',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Cartera</h1>
        <p class="subtitulo">Lo que te deben tus clientes, lo que debes a tus proveedores y todos los pagos registrados.</p>
      </div>
    </header>
    <nav class="tabs" aria-label="Secciones de cartera">
      @for (t of tabs(); track t.ruta) {
        <a class="tab" [routerLink]="t.ruta" routerLinkActive="activo"><app-icon [name]="t.icono" [size]="17" /> {{ t.etiqueta }}</a>
      }
    </nav>
    <router-outlet></router-outlet>
  `
})
export class CarteraComponent {
  private auth = inject(AuthService);
  tabs = computed(() => {
    this.auth.usuarioActual();
    return [
      { ruta: 'cobrar', etiqueta: 'Por cobrar', icono: 'dinero', roles: ['admin', 'ventas'] },
      { ruta: 'clientes', etiqueta: 'Por cliente', icono: 'usuarios', roles: ['admin', 'ventas'] },
      { ruta: 'recaudos', etiqueta: 'Recaudos', icono: 'entrada', roles: ['admin', 'ventas'] },
      { ruta: 'pagar', etiqueta: 'Por pagar', icono: 'camion', roles: ['admin'] },
      { ruta: 'pagos-realizados', etiqueta: 'Pagos realizados', icono: 'pdf', roles: ['admin'] }
    ].filter((t) => this.auth.tieneRol(t.roles));
  });
}
