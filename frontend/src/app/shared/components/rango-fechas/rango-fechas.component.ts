/**
 * Archivo: rango-fechas.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { aClave, sumarDias } from '../../utils/fechas';

export interface RangoFechas { desde: string; hasta: string; }
type Preset = '7d' | '30d' | 'mes' | 'mesAnterior' | '90d' | 'personalizado';

/** Selector de rango con atajos y fechas personalizadas. Emite AAAA-MM-DD. */
@Component({
  selector: 'app-rango-fechas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rango">
      <div class="filtro-chips" role="group" aria-label="Periodo">
        @for (p of presets; track p.id) {
          <button type="button" class="filtro-chip" [class.activo]="preset() === p.id" (click)="elegir(p.id)">
            {{ p.etiqueta }}
          </button>
        }
      </div>
      @if (preset() === 'personalizado') {
        <div class="rango-fechas-inputs">
          <label class="sr-only" for="rf-desde">Desde</label>
          <input id="rf-desde" type="date" [ngModel]="desde()" (ngModelChange)="cambiarDesde($event)" [max]="hasta()" />
          <span>a</span>
          <label class="sr-only" for="rf-hasta">Hasta</label>
          <input id="rf-hasta" type="date" [ngModel]="hasta()" (ngModelChange)="cambiarHasta($event)" [min]="desde()" [max]="hoy" />
        </div>
      }
    </div>
  `,
  styles: [`
    .rango { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 1rem; }
    .rango-fechas-inputs { display: flex; align-items: center; gap: 0.5rem; color: var(--texto-suave); }
    .rango-fechas-inputs input { min-height: 36px; }
  `]
})
export class RangoFechasComponent implements OnInit {
  @Input() inicial: Preset = '30d';
  @Output() cambio = new EventEmitter<RangoFechas>();

  readonly presets: { id: Preset; etiqueta: string }[] = [
    { id: '7d', etiqueta: 'Últimos 7 días' },
    { id: '30d', etiqueta: 'Últimos 30 días' },
    { id: 'mes', etiqueta: 'Este mes' },
    { id: 'mesAnterior', etiqueta: 'Mes anterior' },
    { id: '90d', etiqueta: 'Últimos 90 días' },
    { id: 'personalizado', etiqueta: 'Personalizado' }
  ];

  hoy = aClave(new Date());
  preset = signal<Preset>('30d');
  desde = signal('');
  hasta = signal('');

  ngOnInit(): void {
    this.preset.set(this.inicial);
    this.aplicar(this.inicial);
  }

  elegir(id: Preset): void {
    this.preset.set(id);
    if (id !== 'personalizado') this.aplicar(id);
  }

  private aplicar(id: Preset): void {
    const hoy = new Date();
    let desde = hoy;
    let hasta = hoy;
    switch (id) {
      case '7d': desde = sumarDias(hoy, -6); break;
      case '30d': desde = sumarDias(hoy, -29); break;
      case '90d': desde = sumarDias(hoy, -89); break;
      case 'mes': desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); break;
      case 'mesAnterior':
        desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        break;
      default: return;
    }
    this.desde.set(aClave(desde));
    this.hasta.set(aClave(hasta));
    this.emitir();
  }

  cambiarDesde(valor: string): void { this.desde.set(valor); this.emitir(); }
  cambiarHasta(valor: string): void { this.hasta.set(valor); this.emitir(); }

  private emitir(): void {
    if (this.desde() && this.hasta() && this.desde() <= this.hasta()) {
      this.cambio.emit({ desde: this.desde(), hasta: this.hasta() });
    }
  }
}
