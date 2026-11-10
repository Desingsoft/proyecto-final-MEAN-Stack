/**
 * Archivo: dinero.pipe.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Pipe, PipeTransform } from '@angular/core';
import { LOCALE, MONEDA } from '../../core/config/formato';

const completo = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: MONEDA, maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat(LOCALE, {
  style: 'currency', currency: MONEDA, notation: 'compact', maximumFractionDigits: 1
});

export function formatearDinero(valor: number | null | undefined, abreviado = false): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return (abreviado ? compacto : completo).format(valor);
}

export function formatearNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return new Intl.NumberFormat(LOCALE).format(valor);
}

/** Uso: {{ total | dinero }}  o  {{ total | dinero:true }} para cifras abreviadas ($ 15,1 M). */
@Pipe({ name: 'dinero', standalone: true })
export class DineroPipe implements PipeTransform {
  transform(valor: number | null | undefined, abreviado = false): string {
    return formatearDinero(valor, abreviado);
  }
}
