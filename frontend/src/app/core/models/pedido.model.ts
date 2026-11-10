/**
 * Archivo: pedido.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export interface Pedido {
  _id?: string;
  cliente: string;
  clienteRef?: string | { _id: string; nombre: string; documento?: string; tipoDocumento?: string; email?: string; telefono?: string; diasCredito?: number | null; cupoCredito?: number };
  subtotal?: number;
  descuentoPorcentaje?: number;
  items: { producto: string; cantidad: number; precioUnitario: number }[];
  total: number;
  estado: 'pendiente' | 'procesando' | 'enviado' | 'completado' | 'cancelado';
  createdAt?: string;
}
