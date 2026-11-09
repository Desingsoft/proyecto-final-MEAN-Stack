/**
 * Archivo: stock.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export type NivelStock = 'agotado' | 'critico' | 'bajo' | 'saludable';

// Mismas reglas que el backend (utils/stock.js).
export function nivelStock(stock: number, minimo: number): NivelStock {
  if (stock <= 0) return 'agotado';
  if (stock <= minimo * 0.5) return 'critico';
  if (stock <= minimo) return 'bajo';
  return 'saludable';
}

export const ETIQUETA_NIVEL: Record<NivelStock, string> = {
  agotado: 'Agotado',
  critico: 'Crítico',
  bajo: 'Bajo',
  saludable: 'Saludable'
};

export const CLASE_CHIP_NIVEL: Record<NivelStock, string> = {
  agotado: 'chip-agotado',
  critico: 'chip-critico',
  bajo: 'chip-aviso',
  saludable: 'chip-ok'
};

export const COLOR_NIVEL: Record<NivelStock, string> = {
  agotado: '#b3261e',
  critico: '#d8572a',
  bajo: '#dc9506',
  saludable: '#3e9b6a'
};

export const CLASE_ESTADO_PEDIDO: Record<string, string> = {
  pendiente: 'badge-warning',
  procesando: 'badge-info',
  enviado: 'badge-primary',
  completado: 'badge-success',
  cancelado: 'badge-danger'
};

export const COLOR_ESTADO_PEDIDO: Record<string, string> = {
  pendiente: '#dc9506',
  procesando: '#2f6fb5',
  enviado: '#6f5bc2',
  completado: '#3e9b6a',
  cancelado: '#a8b6b5'
};
