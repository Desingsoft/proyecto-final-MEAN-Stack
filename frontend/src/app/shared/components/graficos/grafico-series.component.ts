/**
 * Archivo: grafico-series.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, ElementRef, Input, OnDestroy, OnInit, computed, inject, signal, NgZone } from '@angular/core';
import { escalaAmable, trazoMonotono } from './trazos';

export interface SerieGrafico {
  nombre: string;
  color: string;
  valores: number[];
}

let contador = 0;

/** Gráfico de área o de barras agrupadas, con tooltip al pasar el cursor o tocar. */
@Component({
  selector: 'app-grafico-series',
  standalone: true,
  template: `
    <div class="grafico" (pointerleave)="indice.set(null)">
      <svg [attr.viewBox]="'0 0 ' + ancho() + ' ' + altura" [attr.height]="altura" role="img" [attr.aria-label]="descripcion">
        <defs>
          @for (s of series; track s.nombre; let k = $index) {
            <linearGradient [attr.id]="'g' + uid + k" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" [attr.stop-color]="s.color" stop-opacity="0.28" />
              <stop offset="100%" [attr.stop-color]="s.color" stop-opacity="0.02" />
            </linearGradient>
          }
        </defs>

        <!-- Rejilla y eje Y -->
        @for (marca of marcasY(); track marca.valor) {
          <line class="rejilla" [attr.x1]="izq" [attr.x2]="ancho() - der" [attr.y1]="marca.y" [attr.y2]="marca.y" />
          <text class="eje-texto" [attr.x]="izq - 8" [attr.y]="marca.y + 4" text-anchor="end">{{ formatoEje(marca.valor) }}</text>
        }

        <!-- Eje X -->
        @for (e of etiquetasVisibles(); track e.i) {
          <text class="eje-texto" [attr.x]="e.x" [attr.y]="altura - 8" text-anchor="middle">{{ e.texto }}</text>
        }

        @if (tipo === 'area') {
          @for (s of series; track s.nombre; let k = $index) {
            <path [attr.d]="trazosArea()[k].relleno" [attr.fill]="'url(#g' + uid + k + ')'" />
            <path [attr.d]="trazosArea()[k].linea" fill="none" [attr.stroke]="s.color" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
          }
          @if (indice() !== null) {
            <line [attr.x1]="xPunto(indice()!)" [attr.x2]="xPunto(indice()!)" [attr.y1]="arriba" [attr.y2]="altura - abajo" stroke="#10292c" stroke-opacity="0.25" stroke-dasharray="3 3" />
            @for (s of series; track s.nombre) {
              <circle [attr.cx]="xPunto(indice()!)" [attr.cy]="yValor(s.valores[indice()!])" r="5" fill="#fff" [attr.stroke]="s.color" stroke-width="2.4" />
            }
          }
        } @else {
          @for (s of series; track s.nombre; let k = $index) {
            @for (v of s.valores; track $index; let i = $index) {
              <rect
                [attr.x]="xBarra(i, k)"
                [attr.y]="yValor(v)"
                [attr.width]="anchoBarra()"
                [attr.height]="Math.max(altura - abajo - yValor(v), v > 0 ? 2 : 0)"
                rx="3"
                [attr.fill]="s.color"
                [attr.opacity]="indice() === null || indice() === i ? 1 : 0.45"
              />
            }
          }
        }

        <!-- Capa que capta el puntero -->
        <rect [attr.x]="izq" [attr.y]="0" [attr.width]="anchoInterior()" [attr.height]="altura" fill="transparent"
          (pointermove)="mover($event)" (pointerdown)="mover($event)" />
      </svg>

      @if (indice() !== null) {
        <div class="grafico-tip" [style.left.px]="posicionTip()" [style.top.px]="topTip()">
          <strong>{{ claves[indice()!] || etiquetas[indice()!] }}</strong>
          @for (s of series; track s.nombre) {
            <div class="fila">
              <span><i [style.background]="s.color"></i>{{ s.nombre }}</span>
              <b>{{ formato(s.valores[indice()!]) }}</b>
            </div>
          }
        </div>
      }
    </div>
    @if (series.length > 1) {
      <div class="leyenda-grafico">
        @for (s of series; track s.nombre) { <span><i [style.background]="s.color"></i>{{ s.nombre }}</span> }
      </div>
    }
  `,
  styles: [':host { display: block; width: 100%; }']
})
export class GraficoSeriesComponent implements OnInit, OnDestroy {
  @Input() etiquetas: string[] = [];
  @Input() claves: string[] = [];
  @Input() tipo: 'area' | 'barras' = 'area';
  @Input() altura = 240;
  @Input() descripcion = 'Gráfico';
  @Input() formato: (n: number) => string = (n) => String(n);
  @Input() formatoEje: (n: number) => string = (n) => String(n);

  private _series: SerieGrafico[] = [];
  @Input() set series(valor: SerieGrafico[]) { this._series = valor ?? []; this.version.update((v) => v + 1); }
  get series(): SerieGrafico[] { return this._series; }

  readonly Math = Math;
  readonly uid = ++contador;
  readonly izq = 56;
  readonly der = 12;
  readonly arriba = 12;
  readonly abajo = 28;

  ancho = signal(640);
  indice = signal<number | null>(null);
  private version = signal(0);

  private el = inject(ElementRef<HTMLElement>);
  private zona = inject(NgZone);
  private observador?: ResizeObserver;

  anchoInterior = computed(() => Math.max(this.ancho() - this.izq - this.der, 10));
  private n = () => Math.max(...this._series.map((s) => s.valores.length), this.etiquetas.length, 1);

  escala = computed(() => {
    this.version();
    const maximo = Math.max(0, ...this._series.flatMap((s) => s.valores));
    return escalaAmable(maximo);
  });

  marcasY = computed(() => {
    const { tope, paso } = this.escala();
    return [0, 1, 2, 3, 4].map((i) => ({ valor: i * paso, y: this.yValor(Math.min(i * paso, tope)) }));
  });

  etiquetasVisibles = computed(() => {
    this.version();
    const n = this.n();
    const cabenEtiquetas = Math.max(Math.floor(this.anchoInterior() / 64), 2);
    const salto = Math.ceil(n / cabenEtiquetas);
    const lista: { i: number; x: number; texto: string }[] = [];
    for (let i = 0; i < n; i += salto) {
      lista.push({ i, x: this.tipo === 'area' ? this.xPunto(i) : this.xBanda(i), texto: this.etiquetas[i] ?? '' });
    }
    return lista;
  });

  trazosArea = computed(() => {
    this.version();
    this.ancho();
    return this._series.map((s) => {
      const puntos = s.valores.map((v, i) => [this.xPunto(i), this.yValor(v)] as [number, number]);
      const linea = trazoMonotono(puntos);
      const base = this.altura - this.abajo;
      const relleno = puntos.length > 1
        ? `${linea} L${puntos[puntos.length - 1][0]},${base} L${puntos[0][0]},${base} Z`
        : '';
      return { linea, relleno };
    });
  });

  anchoBarra = computed(() => {
    const banda = this.anchoInterior() / this.n();
    const total = banda * 0.72;
    return Math.max(Math.min(total / Math.max(this._series.length, 1) - 2, 34), 3);
  });

  ngOnInit(): void {
    const host = this.el.nativeElement as HTMLElement;
    this.ancho.set(host.clientWidth || 640);
    this.zona.runOutsideAngular(() => {
      this.observador = new ResizeObserver(() => {
        const w = host.clientWidth;
        if (w && Math.abs(w - this.ancho()) > 1) this.zona.run(() => this.ancho.set(w));
      });
      this.observador.observe(host);
    });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  xPunto(i: number): number {
    const n = this.n();
    return n <= 1 ? this.izq + this.anchoInterior() / 2 : this.izq + (i * this.anchoInterior()) / (n - 1);
  }

  xBanda(i: number): number {
    const banda = this.anchoInterior() / this.n();
    return this.izq + banda * i + banda / 2;
  }

  xBarra(i: number, serie: number): number {
    const k = this._series.length;
    const grupo = this.anchoBarra() * k + 2 * (k - 1);
    return this.xBanda(i) - grupo / 2 + serie * (this.anchoBarra() + 2);
  }

  yValor(v: number): number {
    const { tope } = this.escala();
    const util = this.altura - this.arriba - this.abajo;
    return this.arriba + util - (Math.min(Math.max(v, 0), tope) / tope) * util;
  }

  mover(evento: PointerEvent): void {
    const caja = (evento.currentTarget as SVGRectElement).getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * this.anchoInterior();
    const n = this.n();
    const i = this.tipo === 'area'
      ? Math.round((x / this.anchoInterior()) * (n - 1))
      : Math.floor((x / this.anchoInterior()) * n);
    this.indice.set(Math.min(Math.max(i, 0), n - 1));
  }

  posicionTip = computed(() => {
    const i = this.indice();
    if (i === null) return 0;
    const x = this.tipo === 'area' ? this.xPunto(i) : this.xBanda(i);
    return Math.min(Math.max(x, 90), this.ancho() - 90);
  });

  topTip = computed(() => {
    const i = this.indice();
    if (i === null) return 0;
    const alto = Math.min(...this._series.map((s) => this.yValor(s.valores[i] ?? 0)));
    return Math.max(alto, 70);
  });
}
