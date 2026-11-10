/**
 * Archivo: movimientos.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { InventarioService } from '../../../core/services/inventario.service';
import { ProductoService } from '../../../core/services/producto.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { Producto } from '../../../core/models/producto.model';
import { Movimiento } from '../../../core/models/movimiento.model';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, IconComponent],
  templateUrl: './movimientos.component.html'
})
export class MovimientosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  productos = signal<Producto[]>([]);
  movimientos = signal<Movimiento[]>([]);
  bodegas = signal<{ _id: string; nombre: string; sucursal: string }[]>([]);
  totalPaginas = signal(1);
  paginaActual = signal(1);
  cargando = signal(false);
  errorMsg = signal('');

  movimientoForm = this.fb.group({
    producto: ['', Validators.required],
    bodega: ['', Validators.required],
    tipo: ['entrada', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    motivo: ['']
  });

  constructor(
    private inventarioService: InventarioService,
    private productoService: ProductoService,
    private notificacionService: NotificacionService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarBodegas();
    this.cargarMovimientos();
    // Si otra persona (o un pedido) mueve el inventario, la pantalla se actualiza sola.
    this.tiempoReal.alCambiar('inventario', 'productos').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cargarProductos();
      this.cargarMovimientos();
    });
  }

  cargarBodegas(): void {
    this.inventarioService.getBodegasAutorizadas().subscribe({
      next: bodegas => this.bodegas.set(bodegas),
      error: () => this.errorMsg.set('No fue posible cargar las bodegas autorizadas')
    });
  }

  cargarProductos(): void {
    this.productoService.getTodos(1, '', { limite: 500 }).subscribe({
      next: (res) => this.productos.set(res.productos)
    });
  }

  cargarMovimientos(): void {
    this.inventarioService.getMovimientos(this.paginaActual()).subscribe({
      next: (res) => {
        this.movimientos.set(res.movimientos);
        this.totalPaginas.set(res.paginas);
      }
    });
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
    this.cargarMovimientos();
  }

  onSubmit(): void {
    if (this.movimientoForm.invalid) return;

    this.cargando.set(true);
    this.errorMsg.set('');

    this.inventarioService.registrar(this.movimientoForm.value as any).subscribe({
      next: () => {
        this.notificacionService.exito('Movimiento registrado correctamente');
        this.movimientoForm.reset({ tipo: 'entrada', cantidad: 1, motivo: '' });
        this.cargando.set(false);
        this.cargarMovimientos();
        // refrescamos productos para reflejar el stock actualizado en el selector
        this.productoService.getTodos(1, '').subscribe({
          next: (res) => this.productos.set(res.productos)
        });
      },
      error: (err) => {
        this.errorMsg.set(err.error?.mensaje || 'Error al registrar el movimiento');
        this.cargando.set(false);
      }
    });
  }

  nombreProducto(movimiento: Movimiento): string {
    const p = movimiento.producto as any;
    return typeof p === 'object' ? `${p.nombre} (${p.sku})` : p;
  }
}
