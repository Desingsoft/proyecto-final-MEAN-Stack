/** Tarjeta de detalle: consulta un producto por ID y presenta sus datos sin modificarlos. */
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Producto } from '../../../core/models/producto.model';

@Component({
  selector: 'app-tarjeta-producto', standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <main class="tarjeta-contenedor">
      <a routerLink="/productos">← Volver al catálogo</a>
      <h1>Ficha del producto</h1>
      @if (cargando()) { <p role="status">Consultando producto…</p> }
      @else if (error()) { <p role="alert">{{ error() }}</p> }
      @else {
        @if (producto(); as p) {
        <article class="ficha" aria-label="Información del producto">
          <h2>{{ p.nombre }}</h2>
          <dl>
            <div><dt>SKU</dt><dd>{{ p.sku }}</dd></div>
            <div><dt>Categoría</dt><dd>{{ p.categoria || 'Sin categoría' }}</dd></div>
            <div><dt>Precio</dt><dd>{{ p.precio | currency:'COP':'symbol-narrow':'1.0-0' }}</dd></div>
            <div><dt>Existencias</dt><dd>{{ p.stock }}</dd></div>
            <div><dt>Stock mínimo</dt><dd>{{ p.stockMinimo }}</dd></div>
          </dl>
        </article>
        }
      }
    </main>`,
  styles: [`
    .tarjeta-contenedor{max-width:820px;margin:0 auto;padding:clamp(1rem,3vw,2rem)}
    .ficha{background:var(--superficie,#fff);border:1px solid #d7dce3;border-radius:16px;padding:clamp(1rem,3vw,2rem);box-shadow:0 6px 22px #0000000a}
    dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:1rem}
    dt{font-size:.85rem;color:#566273}dd{margin:.25rem 0 0;font-weight:600;overflow-wrap:anywhere}
    a{display:inline-block;padding:.65rem 0;min-height:44px}
  `]
})
export class TarjetaProductoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  readonly producto = signal<Producto | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  ngOnInit(): void {
    // El identificador procede de la ruta; la API valida permisos y formato.
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Producto no especificado'); this.cargando.set(false); return; }
    this.http.get<Producto>(`${environment.apiUrl}/productos/${encodeURIComponent(id)}`).subscribe({
      next: data => { this.producto.set(data); this.cargando.set(false); },
      error: () => { this.error.set('No se pudo consultar el producto.'); this.cargando.set(false); }
    });
  }
}
