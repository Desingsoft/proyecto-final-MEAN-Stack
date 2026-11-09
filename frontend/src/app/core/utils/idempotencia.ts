/**
 * Genera una clave única por intento lógico de operación financiera.
 * La misma clave se reutiliza al reintentar después de un error de red.
 * No se genera otra clave hasta confirmar el resultado o reiniciar el formulario.
 * Requiere un contexto seguro (HTTPS o localhost) para crypto.randomUUID.
 */
export function nuevaClaveIdempotencia(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Se requiere un navegador con generación segura de identificadores (HTTPS o localhost).');
  }
  return crypto.randomUUID();
}
