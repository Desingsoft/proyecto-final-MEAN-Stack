/**
 * Archivo: stock-meter.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, Input } from '@angular/core';
import { nivelStock } from '../../utils/stock';

/** Barra de stock: la marca vertical señala el mínimo; la barra llena representa el doble del mínimo. */
@Component({
  selector: 'app-stock-meter',
  standalone: true,
  template: `
    <div class="medidor" [title]="'Stock: ' + stock + ' · mínimo: ' + minimo">
      <div class="medidor-barra" role="img" [attr.aria-label]="'Stock ' + stock + ' de un mínimo de ' + minimo">
        <div class="medidor-relleno" [class]="'medidor-relleno nivel-' + nivel" [style.width.%]="porcentaje"></div>
        <span class="medidor-marca"></span>
      </div>
      <span class="medidor-valor">{{ stock }}</span>
    </div>
  `
})
export class StockMeterComponent {
  @Input() stock = 0;
  @Input() minimo = 0;

  get nivel() {
    return nivelStock(this.stock, this.minimo);
  }

  get porcentaje(): number {
    const objetivo = Math.max(this.minimo * 2, 1);
    return Math.max(Math.min((this.stock / objetivo) * 100, 100), this.stock > 0 ? 4 : 0);
  }
}
