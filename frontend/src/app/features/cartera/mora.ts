/**
 * Archivo: mora.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
// Presentación de la mora y de los tramos de antigüedad.
export const CLASE_TRAMO: Record<string, string> = {
  alDia: 's-saludable', d1_30: 's-bajo', d31_60: 's-critico', d61_90: 's-mora90', d90mas: 's-agotado'
};

export function textoMora(mora: number, vencimiento: string | null): { texto: string; clase: string } {
  if (!vencimiento) return { texto: 'Sin vencimiento', clase: 'chip-neutro' };
  if (mora > 60) return { texto: `Vencida hace ${mora} d`, clase: 'chip-agotado' };
  if (mora > 30) return { texto: `Vencida hace ${mora} d`, clase: 'chip-critico' };
  if (mora > 0) return { texto: `Vencida hace ${mora} d`, clase: 'chip-aviso' };
  if (mora === 0) return { texto: 'Vence hoy', clase: 'chip-aviso' };
  if (mora >= -7) return { texto: `Vence en ${-mora} d`, clase: 'chip-info' };
  return { texto: `Vence en ${-mora} d`, clase: 'chip-ok' };
}
