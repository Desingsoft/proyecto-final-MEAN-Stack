/**
 * Archivo: form-orden.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProveedorService } from '../../core/services/proveedor.service';
import { ProductoService } from '../../core/services/producto.service';
import { OrdenCompraService } from '../../core/services/orden-compra.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { Proveedor } from '../../core/models/proveedor.model';
import { Producto } from '../../core/models/producto.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface Linea { producto: Producto; cantidad: number; costoUnitario: number; }

@Component({
  selector: 'app-form-orden',
  standalone: true,
  imports: [FormsModule, RouterLink, DineroPipe, IconComponent],
  template: `
    <a routerLink="/ordenes-compra" class="volver"><app-icon name="atras" [size]="14" /> Volver a órdenes de compra</a>

    <div class="form-container" style="max-width: 900px; margin-top: 0.75rem">
      <h1>{{ ordenId() ? 'Editar orden de compra' : 'Nueva orden de compra' }}</h1>

      <div class="form-row">
        <div class="form-group">
          <label for="oc-prov">Proveedor</label>
          <select id="oc-prov" [ngModel]="proveedorId()" (ngModelChange)="cambiarProveedor($event)" [disabled]="cargandoOrden()">
            <option value="" disabled>Elige un proveedor…</option>
            @for (p of proveedores(); track p._id) { <option [value]="p._id">{{ p.nombre }}</option> }
          </select>
        </div>
        <div class="form-group">
          <label for="oc-fecha">Entrega esperada (opcional)</label>
          <input id="oc-fecha" type="date" [ngModel]="fechaEsperada()" (ngModelChange)="fechaEsperada.set($event)" />
        </div>
      </div>

      <div class="buscador-productos">
        <label for="oc-producto">Agregar producto</label>
        <input id="oc-producto" type="text" autocomplete="off" [disabled]="!proveedorId()" [placeholder]="proveedorId() ? 'Buscar por nombre o SKU…' : 'Primero elige un proveedor'"
          [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" />
        @if (resultados().length > 0) {
          <ul class="resultados-busqueda">
            @for (p of resultados(); track p._id) {
              <li (click)="agregar(p)">
                <span>{{ p.nombre }} <span class="codigo">({{ p.sku }})</span></span>
                <span class="precio">stock {{ p.stock }}, costo {{ p.costo | dinero }}</span>
              </li>
            }
          </ul>
        }
        @if (proveedorId()) {
          <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--texto-suave); margin-top: 0.4rem; cursor: pointer">
            <input type="checkbox" [checked]="soloDelProveedor()" (change)="soloDelProveedor.set(!soloDelProveedor())" /> Mostrar solo productos de este proveedor
          </label>
        }
      </div>

      @if (lineas().length === 0) {
        <p class="sin-datos">Aún no has agregado productos a la orden</p>
      } @else {
        <div class="tabla-wrap"><table>
          <thead><tr><th>Producto</th><th class="num">Stock actual</th><th class="num">Cantidad</th><th class="num">Costo unitario</th><th class="num">Subtotal</th><th><span class="sr-only">Quitar</span></th></tr></thead>
          <tbody>
            @for (l of lineas(); track l.producto._id) {
              <tr>
                <td><span class="celda-doble"><span class="principal">{{ l.producto.nombre }}</span><span class="secundaria codigo">{{ l.producto.sku }}</span></span></td>
                <td class="num">{{ l.producto.stock }} <span style="color: var(--texto-tenue)">/ mín. {{ l.producto.stockMinimo }}</span></td>
                <td class="num"><input type="number" min="1" step="1" class="cantidad-pedir" [ngModel]="l.cantidad" (ngModelChange)="cambiar(l, 'cantidad', $event)" [attr.aria-label]="'Cantidad de ' + l.producto.nombre" /></td>
                <td class="num"><input type="number" min="0" step="1" class="cantidad-pedir" style="width: 110px" [ngModel]="l.costoUnitario" (ngModelChange)="cambiar(l, 'costoUnitario', $event)" [attr.aria-label]="'Costo de ' + l.producto.nombre" /></td>
                <td class="num"><strong>{{ l.cantidad * l.costoUnitario | dinero }}</strong></td>
                <td><button type="button" class="btn-icono peligro" (click)="quitar(l.producto._id!)" aria-label="Quitar producto"><app-icon name="papelera" [size]="16" /></button></td>
              </tr>
            }
          </tbody>
        </table></div>
        <div class="total-pedido"><strong>Total: {{ total() | dinero }}</strong></div>
      }

      <div class="form-group" style="margin-top: 1rem">
        <label for="oc-notas">Notas para el proveedor (opcional)</label>
        <input id="oc-notas" type="text" [ngModel]="notas()" (ngModelChange)="notas.set($event)" placeholder="Condiciones de entrega, forma de pago…" />
      </div>

      @if (errorMsg()) { <div class="error-alert" role="alert">{{ errorMsg() }}</div> }

      <div class="form-actions">
        <button type="button" (click)="router.navigate(['/ordenes-compra'])">Cancelar</button>
        <button type="button" [disabled]="!puedeGuardar() || guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Guardar como borrador' }}</button>
      </div>
    </div>
  `
})
export class FormOrdenComponent implements OnInit {
  private proveedorService = inject(ProveedorService);
  private productoService = inject(ProductoService);
  private ordenService = inject(OrdenCompraService);
  private notificacion = inject(NotificacionService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  proveedores = signal<Proveedor[]>([]);
  productos = signal<Producto[]>([]);
  lineas = signal<Linea[]>([]);
  proveedorId = signal('');
  fechaEsperada = signal('');
  notas = signal('');
  busqueda = signal('');
  soloDelProveedor = signal(true);
  ordenId = signal<string | null>(null);
  cargandoOrden = signal(false);
  guardando = signal(false);
  errorMsg = signal('');

  total = computed(() => this.lineas().reduce((s, l) => s + l.cantidad * l.costoUnitario, 0));
  puedeGuardar = computed(() => !!this.proveedorId() && this.lineas().length > 0 && this.lineas().every((l) => l.cantidad >= 1 && l.costoUnitario >= 0));

  resultados = computed(() => {
    const t = this.busqueda().trim().toLowerCase();
    if (!t) return [];
    const enOrden = new Set(this.lineas().map((l) => l.producto._id));
    return this.productos()
      .filter((p) => !enOrden.has(p._id) && (p.nombre.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)))
      .filter((p) => !this.soloDelProveedor() || this.idProveedor(p) === this.proveedorId())
      .slice(0, 12);
  });

  private idProveedor(p: Producto): string {
    return typeof p.proveedor === 'object' && p.proveedor ? (p.proveedor as any)._id : (p.proveedor as string) ?? '';
  }

  ngOnInit(): void {
    this.proveedorService.getTodos().subscribe((p) => this.proveedores.set(p));
    this.productoService.getTodos(1, '', { limite: 1000 }).subscribe((r) => {
      this.productos.set(r.productos);
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.cargarOrden(id);
    });
  }

  private cargarOrden(id: string): void {
    this.cargandoOrden.set(true);
    this.ordenId.set(id);
    this.ordenService.obtener(id).subscribe({
      next: (o) => {
        if (o.estado !== 'borrador') { this.router.navigate(['/ordenes-compra', id]); return; }
        this.proveedorId.set(o.proveedor._id);
        this.notas.set(o.notas ?? '');
        this.fechaEsperada.set(o.fechaEsperada ? o.fechaEsperada.slice(0, 10) : '');
        const porId = new Map(this.productos().map((p) => [p._id, p]));
        this.lineas.set(o.items.flatMap((i) => {
          const prod = typeof i.producto === 'string' ? porId.get(i.producto) : porId.get(i.producto._id);
          return prod ? [{ producto: prod, cantidad: i.cantidad, costoUnitario: i.costoUnitario }] : [];
        }));
        this.cargandoOrden.set(false);
      },
      error: () => { this.cargandoOrden.set(false); this.errorMsg.set('No se pudo cargar la orden'); }
    });
  }

  cambiarProveedor(id: string): void {
    this.proveedorId.set(id);
    this.busqueda.set('');
  }

  agregar(p: Producto): void {
    this.lineas.update((ls) => [...ls, { producto: p, cantidad: Math.max(p.stockMinimo * 2 - p.stock, 1), costoUnitario: p.costo }]);
    this.busqueda.set('');
  }

  cambiar(l: Linea, campo: 'cantidad' | 'costoUnitario', valor: string | number): void {
    const n = Math.max(Math.floor(Number(valor)) || 0, 0);
    this.lineas.update((ls) => ls.map((x) => (x === l ? { ...x, [campo]: n } : x)));
  }

  quitar(id: string): void { this.lineas.update((ls) => ls.filter((l) => l.producto._id !== id)); }

  guardar(): void {
    if (!this.puedeGuardar()) return;
    this.guardando.set(true);
    this.errorMsg.set('');
    const datos = {
      proveedor: this.proveedorId(),
      items: this.lineas().map((l) => ({ producto: l.producto._id!, cantidad: l.cantidad, costoUnitario: l.costoUnitario })),
      notas: this.notas(),
      fechaEsperada: this.fechaEsperada() || null
    };
    const id = this.ordenId();
    (id ? this.ordenService.actualizar(id, datos) : this.ordenService.crear(datos)).subscribe({
      next: (o) => { this.notificacion.exito(`Orden ${o.numero} guardada como borrador`); this.router.navigate(['/ordenes-compra', o._id]); },
      error: (err) => { this.guardando.set(false); this.errorMsg.set(err.error?.mensaje || 'No se pudo guardar la orden'); }
    });
  }
}
