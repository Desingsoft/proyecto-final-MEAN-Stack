/**
 * Archivo: estado-orden.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { EstadoOrden } from '../../core/models/negocio.model';

export const ETIQUETA_ORDEN: Record<EstadoOrden, string> = {
  borrador: 'Borrador', enviada: 'Enviada', parcial: 'Parcial', recibida: 'Recibida', cancelada: 'Cancelada'
};
export const CHIP_ORDEN: Record<EstadoOrden, string> = {
  borrador: 'chip-neutro', enviada: 'chip-info', parcial: 'chip-aviso', recibida: 'chip-ok', cancelada: 'chip-agotado'
};
export const ESTADOS_ORDEN: EstadoOrden[] = ['borrador', 'enviada', 'parcial', 'recibida', 'cancelada'];
