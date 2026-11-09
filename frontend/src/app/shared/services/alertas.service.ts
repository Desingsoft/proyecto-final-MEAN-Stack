/**
 * Archivo: alertas.service.ts
 * Propósito: Servicio Angular: comunica componentes con la API y gestiona datos.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Injectable, inject, signal } from '@angular/core';
import { ProductoService } from '../../core/services/producto.service';

/** Cuenta de productos en o por debajo de su mínimo; la usa la barra lateral. */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private productoService = inject(ProductoService);
  stockBajo = signal(0);

  refrescar(): void {
    this.productoService.getStockBajo().subscribe({
      next: (productos) => this.stockBajo.set(productos.length),
      error: () => {} // sin sesión o sin red: la barra simplemente no muestra el aviso
    });
  }
}
