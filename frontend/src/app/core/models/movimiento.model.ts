/**
 * Archivo: movimiento.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export interface Movimiento {
  _id?: string;
  producto: { _id: string; nombre: string; sku: string } | string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo?: string;
  createdAt?: string;
}
