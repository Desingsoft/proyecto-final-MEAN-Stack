/**
 * Archivo: producto.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export interface Producto {
  _id?: string;
  nombre: string;
  sku: string;
  categoria?: string;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  proveedor?: string | { _id: string; nombre: string };
  activo?: boolean;
}
