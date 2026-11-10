/**
 * Archivo: lista-proveedores.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { Proveedor } from '../../../core/models/proveedor.model';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-lista-proveedores',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './lista-proveedores.component.html'
})
export class ListaProveedoresComponent implements OnInit {
  private confirmService = inject(ConfirmService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  proveedores = signal<Proveedor[]>([]);
  cargando = signal(true);

  constructor(
    private proveedorService: ProveedorService,
    public authService: AuthService,
    private notificacionService: NotificacionService
  ) {}

  ngOnInit(): void {
    this.cargarProveedores();
    this.tiempoReal.alCambiar('proveedores').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarProveedores());
  }

  cargarProveedores(): void {
    this.proveedorService.getTodos().subscribe({
      next: (proveedores) => {
        this.proveedores.set(proveedores);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  async eliminar(proveedor: Proveedor): Promise<void> {
    const ok = await this.confirmService.confirmar({
      titulo: 'Eliminar proveedor',
      mensaje: `"${proveedor.nombre}" dejará de aparecer en tu lista de proveedores.`,
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!ok) return;
    this.proveedorService.eliminar(proveedor._id!).subscribe({
      next: () => {
        this.notificacionService.exito('Proveedor eliminado correctamente');
        this.cargarProveedores();
      },
      error: (err) => this.notificacionService.error(err.error?.mensaje || 'Error al eliminar')
    });
  }

  esAdmin(): boolean {
    return this.authService.tieneRol(['admin']);
  }
}
