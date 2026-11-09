/**
 * Archivo: lista-pedidos.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PedidoService } from '../../../core/services/pedido.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { Pedido } from '../../../core/models/pedido.model';
import { DineroPipe } from '../../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CLASE_ESTADO_PEDIDO } from '../../../shared/utils/stock';

@Component({
  selector: 'app-lista-pedidos',
  standalone: true,
  imports: [RouterLink, DatePipe, DineroPipe, IconComponent],
  templateUrl: './lista-pedidos.component.html'
})
export class ListaPedidosComponent implements OnInit {
  private confirmService = inject(ConfirmService);
  private tiempoReal = inject(TiempoRealService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  pedidos = signal<Pedido[]>([]);
  totalPaginas = signal(1);
  paginaActual = signal(1);
  filtroEstado = signal('');
  cargando = signal(true);

  estados = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];

  constructor(
    private pedidoService: PedidoService,
    public authService: AuthService,
    private notificacionService: NotificacionService
  ) {}

  ngOnInit(): void {
    // Permite llegar filtrado desde el panel: /pedidos?estado=pendiente
    const estado = this.route.snapshot.queryParamMap.get('estado');
    if (estado && this.estados.includes(estado)) this.filtroEstado.set(estado);

    this.cargarPedidos();
    this.tiempoReal.alCambiar('pedidos').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarPedidos());
  }

  cargarPedidos(): void {
    this.pedidoService.getTodos(this.paginaActual(), this.filtroEstado()).subscribe({
      next: (res) => {
        this.pedidos.set(res.pedidos);
        this.totalPaginas.set(Math.max(res.paginas, 1));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  filtrar(estado: string): void {
    this.filtroEstado.set(estado);
    this.paginaActual.set(1);
    this.router.navigate([], { queryParams: { estado: estado || null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.cargarPedidos();
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
    this.cargarPedidos();
  }

  async cambiarEstado(pedido: Pedido, nuevoEstado: string, selector: HTMLSelectElement): Promise<void> {
    const cancelar = nuevoEstado === 'cancelado';
    const ok = await this.confirmService.confirmar({
      titulo: cancelar ? 'Cancelar pedido' : 'Cambiar estado',
      mensaje: cancelar
        ? `El pedido de ${pedido.cliente} se cancelará y las unidades volverán al inventario.`
        : `El pedido de ${pedido.cliente} pasará a "${nuevoEstado}".`,
      confirmar: cancelar ? 'Cancelar pedido' : 'Cambiar estado',
      cancelar: 'Volver',
      peligro: cancelar
    });
    selector.value = '';
    if (!ok) return;

    this.pedidoService.cambiarEstado(pedido._id!, nuevoEstado).subscribe({
      next: () => {
        this.notificacionService.exito('Estado actualizado correctamente');
        this.cargarPedidos();
      },
      error: (err) => this.notificacionService.error(err.error?.mensaje || 'Error al cambiar el estado')
    });
  }

  claseEstado(estado: string): string {
    return CLASE_ESTADO_PEDIDO[estado] || 'badge-secondary';
  }

  puedeCrearPedido(): boolean {
    return this.authService.tieneRol(['admin', 'ventas']);
  }
}
