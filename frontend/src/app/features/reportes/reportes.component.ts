/**
 * Archivo: reportes.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Reportes</h1>
        <p class="subtitulo">Analiza tus ventas, tu inventario y los movimientos de bodega. Todo se puede descargar en Excel o PDF.</p>
      </div>
    </header>

    <nav class="tabs" aria-label="Tipo de reporte">
      @for (t of tabs(); track t.ruta) {
        <a class="tab" [routerLink]="t.ruta" routerLinkActive="activo"><app-icon [name]="t.icono" [size]="17" /> {{ t.etiqueta }}</a>
      }
    </nav>

    <router-outlet></router-outlet>
  `
})
export class ReportesComponent {
  private auth = inject(AuthService);

  tabs = computed(() => {
    this.auth.usuarioActual();
    return [
      { ruta: 'ventas', etiqueta: 'Ventas', icono: 'dinero', roles: ['admin', 'ventas'] },
      { ruta: 'inventario', etiqueta: 'Inventario', icono: 'caja', roles: ['admin', 'bodeguero'] },
      { ruta: 'movimientos', etiqueta: 'Movimientos', icono: 'bodega', roles: ['admin', 'bodeguero'] }
    ].filter((t) => this.auth.tieneRol(t.roles));
  });
}
