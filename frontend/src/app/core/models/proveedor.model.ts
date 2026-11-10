/**
 * Archivo: proveedor.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export interface Proveedor {
  _id?: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  diasCredito?: number;
  activo?: boolean;
}
