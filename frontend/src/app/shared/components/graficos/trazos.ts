/**
 * Archivo: trazos.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export type Punto = [number, number];

/** Trazo SVG suavizado que no se pasa de los valores (interpolación monótona, como d3.curveMonotoneX). */
export function trazoMonotono(puntos: Punto[]): string {
  const n = puntos.length;
  if (n === 0) return '';
  if (n === 1) return `M${puntos[0][0]},${puntos[0][1]}`;

  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = puntos[i + 1][0] - puntos[i][0];
    m[i] = (puntos[i + 1][1] - puntos[i][1]) / (dx[i] || 1);
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0
      ? 0
      : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }

  let d = `M${puntos[0][0]},${puntos[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = puntos[i];
    const [x1, y1] = puntos[i + 1];
    d += ` C${x0 + dx[i] / 3},${y0 + (t[i] * dx[i]) / 3} ${x1 - dx[i] / 3},${y1 - (t[i + 1] * dx[i]) / 3} ${x1},${y1}`;
  }
  return d;
}

/** Máximo "redondo" para el eje Y (1, 2, 5 × 10ⁿ) y su paso entre líneas de la rejilla. */
export function escalaAmable(maximo: number, marcas = 4): { tope: number; paso: number } {
  if (maximo <= 0) return { tope: 1, paso: 1 / marcas };
  const bruto = maximo / marcas;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const fraccion = bruto / potencia;
  const base = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 5 ? 5 : 10;
  const paso = base * potencia;
  return { tope: paso * marcas, paso };
}
