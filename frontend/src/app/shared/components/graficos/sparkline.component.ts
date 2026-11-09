/**
 * Archivo: sparkline.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, Input } from '@angular/core';
import { trazoMonotono } from './trazos';

/** Minigráfico de tendencia para las tarjetas de indicadores. */
@Component({
  selector: 'app-sparkline',
  standalone: true,
  template: `
    <svg [attr.width]="ancho" [attr.height]="alto" [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" aria-hidden="true">
      <path [attr.d]="relleno" [attr.fill]="color" fill-opacity="0.12" />
      <path [attr.d]="linea" fill="none" [attr.stroke]="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
  styles: [':host { display: inline-block; line-height: 0; }']
})
export class SparklineComponent {
  @Input() ancho = 92;
  @Input() alto = 34;
  @Input() color = '#0b7a75';
  linea = '';
  relleno = '';

  @Input() set valores(v: number[] | null) {
    const datos = v ?? [];
    if (datos.length < 2) { this.linea = ''; this.relleno = ''; return; }
    const max = Math.max(...datos, 1);
    const pad = 3;
    const puntos = datos.map((d, i) => [
      (i * this.ancho) / (datos.length - 1),
      this.alto - pad - (d / max) * (this.alto - pad * 2)
    ] as [number, number]);
    this.linea = trazoMonotono(puntos);
    this.relleno = `${this.linea} L${this.ancho},${this.alto} L0,${this.alto} Z`;
  }
}
