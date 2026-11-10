/**
 * Archivo: reposicion.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../../core/services/producto.service';
import { InventarioService } from '../../core/services/inventario.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { AlertasService } from '../../shared/services/alertas.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { OrdenCompraService } from '../../core/services/orden-compra.service';
import { ExportarService, DocumentoExport } from '../../shared/services/exportar.service';
import { ItemReposicion } from '../../core/models/reportes.model';
import { DineroPipe, formatearDinero } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { StockMeterComponent } from '../../shared/components/stock-meter/stock-meter.component';
import { CLASE_CHIP_NIVEL, ETIQUETA_NIVEL, NivelStock, nivelStock } from '../../shared/utils/stock';

interface FilaReposicion extends ItemReposicion {
  pedir: number;
  seleccionado: boolean;
}

type FiltroNivel = 'todos' | NivelStock;

const SIN_PROVEEDOR = 'Sin proveedor asignado';

@Component({
  selector: 'app-reposicion',
  standalone: true,
  imports: [FormsModule, RouterLink, DineroPipe, IconComponent, ModalComponent, StockMeterComponent],
  templateUrl: './reposicion.component.html'
})
export class ReposicionComponent implements OnInit {
  private productoService = inject(ProductoService);
  private inventarioService = inject(InventarioService);
  private notificacion = inject(NotificacionService);
  private alertas = inject(AlertasService);
  private exportar = inject(ExportarService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordenService = inject(OrdenCompraService);
  private destroyRef = inject(DestroyRef);
  private tiempoReal = inject(TiempoRealService);

  readonly etiquetaNivel = ETIQUETA_NIVEL;
  readonly chipNivel = CLASE_CHIP_NIVEL;
  readonly nivelStock = nivelStock;

  filas = signal<FilaReposicion[]>([]);
  cargando = signal(true);
  error = signal(false);
  exportando = signal(false);
  creandoOrdenes = signal(false);

  filtroNivel = signal<FiltroNivel>('todos');
  filtroProveedor = signal('');
  agrupar = signal(true);

  // Modal de entrada de mercancía
  filaEntrada = signal<FilaReposicion | null>(null);
  cantidadEntrada = signal(1);
  motivoEntrada = signal('compra');
  guardando = signal(false);
  bodegasEntrada = signal<{ _id: string; nombre: string }[]>([]);
  bodegaEntrada = signal('');
  errorBodegas = signal('');

  conteos = computed(() => {
    const filas = this.filas();
    return {
      todos: filas.length,
      agotado: filas.filter((f) => f.nivel === 'agotado').length,
      critico: filas.filter((f) => f.nivel === 'critico').length,
      bajo: filas.filter((f) => f.nivel === 'bajo').length
    };
  });

  proveedores = computed(() => {
    const nombres = new Set(this.filas().map((f) => f.proveedor?.nombre ?? SIN_PROVEEDOR));
    return [...nombres].sort((a, b) => a.localeCompare(b, 'es'));
  });

  visibles = computed(() =>
    this.filas().filter(
      (f) =>
        (this.filtroNivel() === 'todos' || f.nivel === this.filtroNivel()) &&
        (!this.filtroProveedor() || (f.proveedor?.nombre ?? SIN_PROVEEDOR) === this.filtroProveedor())
    )
  );

  grupos = computed(() => {
    const visibles = this.visibles();
    if (!this.agrupar()) return [{ nombre: '', filas: visibles }];
    const mapa = new Map<string, FilaReposicion[]>();
    for (const f of visibles) {
      const nombre = f.proveedor?.nombre ?? SIN_PROVEEDOR;
      mapa.set(nombre, [...(mapa.get(nombre) ?? []), f]);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => (a === SIN_PROVEEDOR ? 1 : b === SIN_PROVEEDOR ? -1 : a.localeCompare(b, 'es')))
      .map(([nombre, filas]) => ({ nombre, filas }));
  });

  seleccionadas = computed(() => this.visibles().filter((f) => f.seleccionado && f.pedir > 0));
  inversion = computed(() => this.seleccionadas().reduce((s, f) => s + f.pedir * f.costo, 0));
  unidades = computed(() => this.seleccionadas().reduce((s, f) => s + f.pedir, 0));
  todasMarcadas = computed(() => this.visibles().length > 0 && this.visibles().every((f) => f.seleccionado));

  stockResultante = computed(() => {
    const fila = this.filaEntrada();
    return fila ? fila.stock + (this.cantidadEntrada() || 0) : 0;
  });

  ngOnInit(): void {
    const nivel = this.route.snapshot.queryParamMap.get('nivel');
    if (nivel === 'agotado' || nivel === 'critico' || nivel === 'bajo') this.filtroNivel.set(nivel);
    this.cargar();
    this.tiempoReal.alCambiar('productos', 'inventario').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.productoService.getReposicion().subscribe({
      next: (res) => {
        const previas = new Map(this.filas().map((f) => [f._id, f]));
        // Conserva lo que la persona ya ajustó (cantidades y casillas) al recargar.
        this.filas.set(
          res.items.map((item) => {
            const previa = previas.get(item._id);
            return { ...item, pedir: previa?.pedir ?? item.sugerido, seleccionado: previa?.seleccionado ?? true };
          })
        );
        this.cargando.set(false);
        this.error.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      }
    });
  }

  actualizarFila(id: string, parche: Partial<FilaReposicion>): void {
    this.filas.update((filas) => filas.map((f) => (f._id === id ? { ...f, ...parche } : f)));
  }

  cambiarCantidad(fila: FilaReposicion, valor: string | number): void {
    const n = Math.max(Math.floor(Number(valor)) || 0, 0);
    this.actualizarFila(fila._id, { pedir: n });
  }

  marcarTodas(marcar: boolean): void {
    const ids = new Set(this.visibles().map((f) => f._id));
    this.filas.update((filas) => filas.map((f) => (ids.has(f._id) ? { ...f, seleccionado: marcar } : f)));
  }

  subtotalGrupo(filas: FilaReposicion[]): number {
    return filas.filter((f) => f.seleccionado).reduce((s, f) => s + f.pedir * f.costo, 0);
  }

  // --- Registrar entrada de mercancía ---
  abrirEntrada(fila: FilaReposicion): void {
    this.filaEntrada.set(fila);
    this.cantidadEntrada.set(fila.pedir > 0 ? fila.pedir : fila.sugerido);
    this.motivoEntrada.set('compra');
    this.bodegaEntrada.set('');
    this.bodegasEntrada.set([]);
    this.errorBodegas.set('');
    this.inventarioService.getBodegasAutorizadas().subscribe({
      next: bodegas => {
        this.bodegasEntrada.set(bodegas);
        if (bodegas.length === 1) this.bodegaEntrada.set(bodegas[0]._id);
        if (!bodegas.length) this.errorBodegas.set('No hay bodegas autorizadas. Configura una bodega antes de registrar entradas.');
      },
      error: () => this.errorBodegas.set('No fue posible consultar las bodegas autorizadas.')
    });
  }

  cerrarEntrada(): void {
    if (!this.guardando()) this.filaEntrada.set(null);
  }

  confirmarEntrada(): void {
    const fila = this.filaEntrada();
    const cantidad = Math.floor(Number(this.cantidadEntrada()));
    if (!fila || !(cantidad > 0) || !this.bodegaEntrada()) return;

    this.guardando.set(true);
    this.inventarioService
      .registrar({ producto: fila._id, bodega: this.bodegaEntrada(), tipo: 'entrada', cantidad, motivo: this.motivoEntrada() })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.filaEntrada.set(null);
          const resultante = fila.stock + cantidad;
          this.notificacion.exito(
            nivelStock(resultante, fila.stockMinimo) === 'saludable'
              ? `Entrada registrada: ${fila.nombre} vuelve a nivel saludable`
              : `Entrada registrada: +${cantidad} de ${fila.nombre}`
          );
          this.cargar();
          this.alertas.refrescar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.notificacion.error(err.error?.mensaje || 'No se pudo registrar la entrada');
        }
      });
  }

  // --- Exportar la lista de compra (una sección por proveedor) ---
  private documento(): DocumentoExport {
    const seleccion = this.seleccionadas();
    const porProveedor = new Map<string, FilaReposicion[]>();
    for (const f of seleccion) {
      const nombre = f.proveedor?.nombre ?? SIN_PROVEEDOR;
      porProveedor.set(nombre, [...(porProveedor.get(nombre) ?? []), f]);
    }

    return {
      nombreArchivo: 'lista-de-compra',
      titulo: 'Lista de compra',
      subtitulo: `${seleccion.length} productos de ${porProveedor.size} proveedor${porProveedor.size === 1 ? '' : 'es'}`,
      resumen: [
        { etiqueta: 'Productos a reponer', valor: seleccion.length },
        { etiqueta: 'Unidades a pedir', valor: this.unidades() },
        { etiqueta: 'Inversión estimada', valor: formatearDinero(this.inversion()) }
      ],
      secciones: [...porProveedor.entries()].map(([nombre, filas]) => ({
        titulo: nombre,
        filas,
        columnas: [
          { encabezado: 'SKU', valor: (f: FilaReposicion) => f.sku, ancho: 14 },
          { encabezado: 'Producto', valor: (f: FilaReposicion) => f.nombre, ancho: 38 },
          { encabezado: 'Stock', tipo: 'numero' as const, valor: (f: FilaReposicion) => f.stock },
          { encabezado: 'Mínimo', tipo: 'numero' as const, valor: (f: FilaReposicion) => f.stockMinimo },
          { encabezado: 'Cantidad a pedir', tipo: 'numero' as const, valor: (f: FilaReposicion) => f.pedir },
          { encabezado: 'Costo unitario', tipo: 'dinero' as const, valor: (f: FilaReposicion) => f.costo },
          { encabezado: 'Subtotal', tipo: 'dinero' as const, valor: (f: FilaReposicion) => f.pedir * f.costo }
        ]
      }))
    };
  }

  async exportarComo(formato: 'excel' | 'pdf'): Promise<void> {
    if (this.seleccionadas().length === 0) {
      this.notificacion.error('Marca al menos un producto con cantidad mayor a cero');
      return;
    }
    this.exportando.set(true);
    try {
      const doc = this.documento();
      if (formato === 'excel') await this.exportar.excel(doc);
      else await this.exportar.pdf({ ...doc, horizontal: true });
      this.notificacion.exito(formato === 'excel' ? 'Lista de compra descargada en Excel' : 'Lista de compra descargada en PDF');
    } catch {
      this.notificacion.error('No se pudo generar el archivo. Inténtalo de nuevo.');
    } finally {
      this.exportando.set(false);
    }
  }

  /** Crea un borrador de orden de compra por cada proveedor con los productos marcados. */
  crearOrdenes(): void {
    const seleccion = this.seleccionadas();
    if (seleccion.length === 0) {
      this.notificacion.error('Marca al menos un producto con cantidad mayor a cero');
      return;
    }
    this.creandoOrdenes.set(true);
    this.ordenService.desdeReposicion(seleccion.map((f) => ({ producto: f._id, cantidad: f.pedir }))).subscribe({
      next: ({ ordenes, sinProveedor }) => {
        this.creandoOrdenes.set(false);
        if (sinProveedor.length > 0) {
          this.notificacion.info(`${sinProveedor.length} producto(s) sin proveedor no se incluyeron: ${sinProveedor.map((p) => p.nombre).join(', ')}`);
        }
        this.notificacion.exito(ordenes.length === 1 ? `Orden ${ordenes[0].numero} creada como borrador` : `${ordenes.length} órdenes creadas como borrador`);
        this.router.navigate(ordenes.length === 1 ? ['/ordenes-compra', ordenes[0]._id] : ['/ordenes-compra']);
      },
      error: (err) => {
        this.creandoOrdenes.set(false);
        this.notificacion.error(err.error?.mensaje || 'No se pudieron crear las órdenes');
      }
    });
  }
}
