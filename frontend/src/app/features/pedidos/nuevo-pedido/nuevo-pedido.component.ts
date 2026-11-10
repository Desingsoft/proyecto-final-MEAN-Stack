/**
 * Archivo: nuevo-pedido.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { obtenerMensajeApi } from '../../../core/utils/api-error';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, tap, catchError } from 'rxjs';
import { DineroPipe } from '../../../shared/pipes/dinero.pipe';
import { ProductoService } from '../../../core/services/producto.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { Producto } from '../../../core/models/producto.model';
import { Cliente } from '../../../core/models/negocio.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ClienteFormModalComponent } from '../../clientes/cliente-form-modal.component';

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-nuevo-pedido',
  standalone: true,
  imports: [FormsModule, RouterLink, DineroPipe, IconComponent, ClienteFormModalComponent],
  templateUrl: './nuevo-pedido.component.html'
})
export class NuevoPedidoComponent implements OnInit {
  private productoService = inject(ProductoService);
  private pedidoService = inject(PedidoService);
  private clienteService = inject(ClienteService);
  private notificacionService = inject(NotificacionService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  productosDisponibles = signal<Producto[]>([]);
  buscandoProductos = signal(false);
  errorBusquedaProductos = signal('');
  private busquedaProducto$ = new Subject<string>();
  carrito = signal<ItemCarrito[]>([]);
  busquedaProducto = signal('');
  cargando = signal(false);
  errorMsg = signal('');

  // Cliente: uno registrado (autocompletado) o solo un nombre escrito
  textoCliente = signal('');
  clienteSeleccionado = signal<Cliente | null>(null);
  sugerencias = signal<Cliente[]>([]);
  buscandoCliente = signal(false);
  mostrarSugerencias = signal(false);
  creandoCliente = signal(false);
  private busquedaCliente$ = new Subject<string>();

  descuento = signal(0);

  subtotal = computed(() => this.carrito().reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0));
  valorDescuento = computed(() => Math.round((this.subtotal() * this.descuentoValido()) / 100));
  total = computed(() => this.subtotal() - this.valorDescuento());
  descuentoValido = computed(() => Math.min(Math.max(Number(this.descuento()) || 0, 0), 100));

  productosFiltrados = computed(() => {
    const termino = this.busquedaProducto().trim().toLowerCase();
    if (!termino) return [];
    return this.productosDisponibles().filter(p =>
      p.nombre.toLowerCase().includes(termino) || p.sku.toLowerCase().includes(termino)
    ).slice(0, 12);
  });

  ngOnInit(): void {
    // La API admite como máximo 100 registros por página. La búsqueda se hace
    // en el servidor para incluir todo el catálogo, no solo la primera página.
    this.busquedaProducto$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap(texto => {
        this.buscandoProductos.set(texto.trim().length > 0);
        this.errorBusquedaProductos.set('');
      }),
      switchMap(texto => texto.trim()
        ? this.productoService.getTodos(1, texto.trim(), { limite: 30 }).pipe(
            // El fallo de la API no debe cerrar el flujo de búsquedas posteriores.
            catchError(() => {
              this.errorBusquedaProductos.set('No se pudieron consultar los productos. Verifica tu conexión o los permisos del usuario.');
              return of({ productos: [] as Producto[], total: 0, paginas: 0 });
            })
          )
        : of({ productos: [] as Producto[], total: 0, paginas: 0 }))
    ).subscribe(res => {
      this.productosDisponibles.set(res.productos);
      this.buscandoProductos.set(false);
    });

    this.busquedaCliente$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap((texto) => this.buscandoCliente.set(texto.length >= 2)),
      switchMap((texto) => (texto.length >= 2 ? this.clienteService.listar(1, texto, 6) : of({ clientes: [] as Cliente[] })))
    ).subscribe({
      next: (r) => { this.sugerencias.set(r.clientes); this.buscandoCliente.set(false); },
      error: () => this.buscandoCliente.set(false)
    });

    // Llegar desde la ficha del cliente: /pedidos/nuevo?cliente=<id>
    const clienteId = this.route.snapshot.queryParamMap.get('cliente');
    if (clienteId) {
      this.clienteService.obtener(clienteId).subscribe({ next: (c) => this.elegirCliente(c), error: () => {} });
    }
  }

  alBuscarProducto(texto: string): void {
    this.busquedaProducto.set(texto);
    this.productosDisponibles.set([]);
    this.busquedaProducto$.next(texto);
  }

  alEscribirCliente(texto: string): void {
    this.textoCliente.set(texto);
    this.clienteSeleccionado.set(null); // si cambia el texto, deja de ser el cliente elegido
    this.mostrarSugerencias.set(true);
    this.sugerencias.set([]);
    this.buscandoCliente.set(texto.trim().length >= 2);
    this.busquedaCliente$.next(texto.trim());
  }

  elegirCliente(cliente: Cliente): void {
    this.clienteSeleccionado.set(cliente);
    this.textoCliente.set(cliente.nombre);
    this.sugerencias.set([]);
    this.mostrarSugerencias.set(false);
  }

  quitarCliente(): void {
    this.clienteSeleccionado.set(null);
    this.textoCliente.set('');
  }

  alCrearCliente(cliente: Cliente): void {
    this.creandoCliente.set(false);
    this.elegirCliente(cliente);
    this.notificacionService.exito(`Cliente "${cliente.nombre}" creado y seleccionado`);
  }

  agregarProducto(producto: Producto): void {
    const existente = this.carrito().find(item => item.producto._id === producto._id);
    if (existente) {
      this.incrementarCantidad(producto._id!);
    } else if (producto.stock < 1) {
      this.errorMsg.set(`"${producto.nombre}" está agotado`);
    } else {
      this.errorMsg.set('');
      this.carrito.update(items => [...items, { producto, cantidad: 1 }]);
    }
    this.busquedaProducto.set('');
  }

  incrementarCantidad(productoId: string): void {
    this.carrito.update(items =>
      items.map(item => {
        if (item.producto._id !== productoId) return item;
        const nuevaCantidad = item.cantidad + 1;
        if (nuevaCantidad > item.producto.stock) {
          this.errorMsg.set(`Stock máximo disponible para "${item.producto.nombre}": ${item.producto.stock}`);
          return item;
        }
        this.errorMsg.set('');
        return { ...item, cantidad: nuevaCantidad };
      })
    );
  }

  decrementarCantidad(productoId: string): void {
    this.carrito.update(items =>
      items
        .map(item => item.producto._id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item)
        .filter(item => item.cantidad > 0)
    );
  }

  quitarProducto(productoId: string): void {
    this.carrito.update(items => items.filter(item => item.producto._id !== productoId));
  }

  puedeConfirmar(): boolean {
    return this.carrito().length > 0 && !!this.textoCliente().trim() && !this.cargando();
  }

  confirmarPedido(): void {
    if (!this.puedeConfirmar()) {
      this.errorMsg.set('Indica el cliente y agrega al menos un producto al pedido');
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set('');

    const seleccionado = this.clienteSeleccionado();
    const payload = {
      ...(seleccionado ? { clienteRef: seleccionado._id! } : { cliente: this.textoCliente().trim() }),
      descuentoPorcentaje: this.descuentoValido(),
      items: this.carrito().map(item => ({ producto: item.producto._id!, cantidad: item.cantidad }))
    };

    this.pedidoService.crear(payload).subscribe({
      next: (pedido) => {
        this.notificacionService.exito('Pedido creado correctamente');
        this.router.navigate(['/pedidos', pedido._id]);
      },
      error: (err) => {
        this.errorMsg.set(obtenerMensajeApi(err, 'No se pudo crear el pedido. Consulta la lista antes de repetir el envío.'));
        this.cargando.set(false);
      }
    });
  }
}
