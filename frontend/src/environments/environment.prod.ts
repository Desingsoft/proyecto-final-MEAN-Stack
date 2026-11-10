/**
 * Archivo: environment.prod.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export const environment = {
  production: true,
  // Ruta relativa: el frontend y el API se sirven desde el mismo dominio (nginx reenvía /api al backend).
  // Si publicas el API en otro dominio, escribe aquí su URL completa, por ejemplo 'https://api.tuempresa.com/api'.
  apiUrl: '/api'
};
