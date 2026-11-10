/**
 * Archivo: lista-productos.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductoService } from '../../../core/services/producto.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { Producto } from '../../../core/models/producto.model';
import { DineroPipe } from '../../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StockMeterComponent } from '../../../shared/components/stock-meter/stock-meter.component';
import { CLASE_CHIP_NIVEL, ETIQUETA_NIVEL, nivelStock } from '../../../shared/utils/stock';

type EstadoFiltro = '' | 'bajo' | 'agotado';

@Component({
  selector: 'app-lista-productos',
  standalone: true,
  imports: [RouterLink, FormsModule, DineroPipe, IconComponent, StockMeterComponent],
  templateUrl: './lista-productos.component.html'
})
export class ListaProductosComponent implements OnInit {
  private productoService = inject(ProductoService);
  private notificacionService = inject(NotificacionService);
  private confirmService = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private tiempoReal = inject(TiempoRealService);
  authService = inject(AuthService);

  readonly etiquetaNivel = ETIQUETA_NIVEL;
  readonly chipNivel = CLASE_CHIP_NIVEL;
  readonly nivel = nivelStock;

  productos = signal<Producto[]>([]);
  categorias = signal<string[]>([]);
  total = signal(0);
  totalPaginas = signal(1);
  paginaActual = signal(1);
  buscar = signal('');
  estado = signal<EstadoFiltro>('');
  categoria = signal('');
  cargando = signal(true);

  private busqueda$ = new Subject<string>();

  ngOnInit(): void {
    this.productoService.getCategorias().subscribe({ next: (c) => this.categorias.set(c), error: () => {} });

    // El filtro puede venir de otra pantalla: /productos?estado=bajo
    const estadoInicial = this.route.snapshot.queryParamMap.get('estado');
    if (estadoInicial === 'bajo' || estadoInicial === 'agotado' || estadoInicial === 'critico') {
      this.estado.set(estadoInicial === 'agotado' ? 'agotado' : 'bajo');
    }

    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        this.buscar.set(texto);
        this.paginaActual.set(1);
        this.cargarProductos();
      });

    this.cargarProductos();
    this.tiempoReal.alCambiar('productos').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarProductos());
  }

  cargarProductos(): void {
    this.cargando.set(true);
    this.productoService
      .getTodos(this.paginaActual(), this.buscar(), { estadoStock: this.estado(), categoria: this.categoria() })
      .subscribe({
        next: (res) => {
          this.productos.set(res.productos);
          this.total.set(res.total);
          this.totalPaginas.set(Math.max(res.paginas, 1));
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
  }

  onBuscar(texto: string): void {
    this.busqueda$.next(texto.trim());
  }

  cambiarEstado(estado: EstadoFiltro): void {
    this.estado.set(estado);
    this.paginaActual.set(1);
    this.router.navigate([], { queryParams: { estado: estado || null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.cargarProductos();
  }

  cambiarCategoria(categoria: string): void {
    this.categoria.set(categoria);
    this.paginaActual.set(1);
    this.cargarProductos();
  }

  limpiarFiltros(): void {
    this.buscar.set('');
    this.categoria.set('');
    this.estado.set('');
    this.paginaActual.set(1);
    this.router.navigate([], { queryParams: { estado: null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.cargarProductos();
  }

  hayFiltros(): boolean {
    return !!(this.buscar() || this.categoria() || this.estado());
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
    this.cargarProductos();
  }

  proveedorNombre(producto: Producto): string {
    return typeof producto.proveedor === 'object' && producto.proveedor ? producto.proveedor.nombre : '';
  }

  async eliminar(producto: Producto): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Eliminar producto',
      mensaje: `"${producto.nombre}" dejará de aparecer en el catálogo. Su historial de pedidos y movimientos se conserva.`,
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!confirmado) return;

    this.productoService.eliminar(producto._id!).subscribe({
      next: () => {
        this.notificacionService.exito('Producto eliminado');
        this.cargarProductos();
      },
      error: (err) => this.notificacionService.error(err.error?.mensaje || 'No se pudo eliminar el producto')
    });
  }

  puedeEditar(): boolean {
    return this.authService.tieneRol(['admin', 'bodeguero']);
  }

  puedeCrearEliminar(): boolean {
    return this.authService.tieneRol(['admin']);
  }
}
