/**
 * Archivo: fechas.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
// Utilidades de fechas en hora local del navegador, con el formato AAAA-MM-DD que usa la API.
export const aClave = (fecha: Date): string => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const sumarDias = (fecha: Date, dias: number): Date => {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
};

/** '2026-09-30' -> '30 sep' */
export const etiquetaCorta = (clave: string): string => {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
};

/** '2026-09-30' -> 'miércoles, 30 de septiembre' */
export const etiquetaLarga = (clave: string): string => {
  const [y, m, d] = clave.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const saludoSegunHora = (): string => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export const hace = (fecha: Date | null): string => {
  if (!fecha) return '';
  const segundos = Math.round((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 10) return 'justo ahora';
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  return `hace ${Math.round(minutos / 60)} h`;
};
