/**
 * Archivo: layout.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AlertasService } from '../../services/alertas.service';
import { TiempoRealService } from '../../services/tiempo-real.service';
import { IconComponent } from '../icon/icon.component';
import { permiteAccion } from '../../../core/utils/permisos';
import { ETIQUETA_ROL } from '../../../core/models/usuario.model';

interface ItemNav {
  ruta: string;
  etiqueta: string;
  icono: string;
  roles?: string[];
  permiso?: string;
  conAlertas?: boolean;
}
interface GrupoNav {
  titulo: string;
  items: ItemNav[];
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: 'Operación',
    items: [
      { ruta: '/dashboard', roles: ['admin', 'bodeguero'], etiqueta: 'Panel', icono: 'panel' },
      { ruta: '/pedidos', permiso: 'pedidos.leer', etiqueta: 'Pedidos', icono: 'pedidos' },
      { ruta: '/devoluciones', permiso: 'devoluciones.leer', etiqueta: 'Devoluciones', icono: 'refrescar', roles: ['admin', 'ventas'] },
      { ruta: '/clientes', permiso: 'clientes.leer', etiqueta: 'Clientes', icono: 'usuario', roles: ['admin', 'ventas'] },
      { ruta: '/productos', permiso: 'productos.leer', etiqueta: 'Productos', icono: 'caja' },
      { ruta: '/inventario', permiso: 'inventario.leer', etiqueta: 'Inventario', icono: 'bodega', roles: ['admin', 'bodeguero'] }
    ]
  },
  {
    titulo: 'Abastecimiento',
    items: [
      { ruta: '/reposicion', etiqueta: 'Reposición', icono: 'entrada', roles: ['admin', 'bodeguero'], conAlertas: true },
      { ruta: '/ordenes-compra', permiso: 'ordenes-compra.leer', etiqueta: 'Órdenes de compra', icono: 'dado', roles: ['admin', 'bodeguero'] },
      { ruta: '/proveedores', permiso: 'proveedores.leer', etiqueta: 'Proveedores', icono: 'camion' }
    ]
  },
  {
    titulo: 'Facturación',
    items: [
      { ruta: '/documentos', permiso: 'documentos.leer', etiqueta: 'Facturas y remisiones', icono: 'pdf', roles: ['admin', 'ventas'] },
      { ruta: '/cartera', permiso: 'cartera.leer', etiqueta: 'Cartera', icono: 'dinero', roles: ['admin', 'ventas'] }
    ]
  },
  { titulo: 'Análisis', items: [{ ruta: '/reportes', permiso: 'reportes.leer', etiqueta: 'Reportes', icono: 'grafico' }] },
  {
    titulo: 'Administración',
    items: [
      { ruta: '/usuarios', permiso: 'usuarios.leer', etiqueta: 'Usuarios', icono: 'usuarios', roles: ['admin'] },
      { ruta: '/configuracion', permiso: 'configuracion.editar', etiqueta: 'Configuración', icono: 'escudo', roles: ['admin'] }
    ]
  }
];

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  authService = inject(AuthService);
  alertas = inject(AlertasService);
  private router = inject(Router);
  private tiempoReal = inject(TiempoRealService);

  menuAbierto = signal(false);

  grupos = computed(() => {
    this.authService.usuarioActual(); // dependencia reactiva: el menú cambia si cambia la sesión
    return GRUPOS.map((g) => ({
      ...g,
      items: g.items.filter((i) => (!i.roles || this.authService.tieneRol(i.roles)) && (!i.permiso || permiteAccion(this.authService.usuarioActual(), i.permiso)))
    })).filter((g) => g.items.length > 0);
  });

  iniciales = computed(() => {
    const nombre = this.authService.usuarioActual()?.nombre ?? '';
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
  });

  etiquetaRol = computed(() => {
    const rol = this.authService.usuarioActual()?.role;
    return rol ? ETIQUETA_ROL[rol] : '';
  });

  constructor() {
    this.alertas.refrescar();
    this.tiempoReal.iniciar();
    inject(DestroyRef).onDestroy(() => this.tiempoReal.detener());
    this.tiempoReal.alCambiar('productos').pipe(takeUntilDestroyed()).subscribe(() => this.alertas.refrescar());
    // El aviso de stock bajo se actualiza cada vez que la persona cambia de pantalla.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        this.alertas.refrescar();
        this.menuAbierto.set(false);
      });
  }

  /** Permite cerrar el menú lateral con Escape en pantallas pequeñas. */
  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {
    if (this.menuAbierto()) this.menuAbierto.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
