/**
 * Archivo: grafico-dona.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

export interface SegmentoDona {
  clave: string;
  etiqueta: string;
  valor: number;
  color: string;
}

/** Dona interactiva con leyenda: al pasar sobre un segmento (o su fila) el centro muestra su detalle. */
@Component({
  selector: 'app-grafico-dona',
  standalone: true,
  template: `
    <div class="dona-contenedor">
      <div class="dona">
        <svg viewBox="0 0 200 200" role="img" [attr.aria-label]="descripcion">
          <circle cx="100" cy="100" r="76" fill="none" stroke="#e6ecea" stroke-width="26" />
          @for (a of arcos(); track a.clave; let i = $index) {
            <circle
              cx="100" cy="100" r="76" fill="none" stroke-width="26"
              [attr.stroke]="a.color"
              [attr.stroke-dasharray]="a.largo + ' ' + (circunferencia - a.largo)"
              [attr.stroke-dashoffset]="-a.inicio"
              [style.opacity]="activo() === null || activo() === i ? 1 : 0.35"
              style="cursor: pointer; transition: opacity 0.15s; pointer-events: stroke"
              (pointerenter)="activo.set(i)" (pointerleave)="activo.set(null)"
              (click)="seleccion.emit(a.clave)"
            />
          }
        </svg>
        <div class="dona-centro">
          <span class="n">{{ centroValor() }}</span>
          <span class="t">{{ centroTexto() }}</span>
        </div>
      </div>

      <ul class="dona-leyenda">
        @for (s of segmentos; track s.clave; let i = $index) {
          <li>
            <button type="button" [class.resaltado]="activo() === i" (pointerenter)="activo.set(i)" (pointerleave)="activo.set(null)" (click)="seleccion.emit(s.clave)">
              <i [style.background]="s.color"></i>
              <span style="text-transform: capitalize">{{ s.etiqueta }}</span>
              <span class="cant">{{ s.valor }}</span>
            </button>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [':host { display: block; }']
})
export class GraficoDonaComponent {
  @Input() descripcion = 'Distribución';
  @Input() textoTotal = 'en total';
  @Output() seleccion = new EventEmitter<string>();

  private _segmentos: SegmentoDona[] = [];
  private version = signal(0);
  @Input() set segmentos(valor: SegmentoDona[]) { this._segmentos = valor ?? []; this.version.update((v) => v + 1); }
  get segmentos(): SegmentoDona[] { return this._segmentos; }

  readonly circunferencia = 2 * Math.PI * 76;
  activo = signal<number | null>(null);

  total = computed(() => { this.version(); return this._segmentos.reduce((s, x) => s + x.valor, 0); });

  arcos = computed(() => {
    this.version();
    const total = this.total();
    if (!total) return [];
    const hueco = this._segmentos.filter((s) => s.valor > 0).length > 1 ? 3 : 0;
    let acumulado = 0;
    return this._segmentos.map((s) => {
      const largoReal = (s.valor / total) * this.circunferencia;
      const arco = { clave: s.clave, color: s.color, inicio: acumulado, largo: Math.max(largoReal - (s.valor > 0 ? hueco : 0), 0) };
      acumulado += largoReal;
      return arco;
    });
  });

  centroValor = computed(() => {
    const i = this.activo();
    return String(i === null ? this.total() : this._segmentos[i]?.valor ?? 0);
  });

  centroTexto = computed(() => {
    const i = this.activo();
    if (i !== null) {
      const s = this._segmentos[i];
      return s ? `${s.etiqueta} · ${Math.round((s.valor / (this.total() || 1)) * 100)} %` : '';
    }
    return this.total() ? this.textoTotal : 'Sin datos';
  });
}
