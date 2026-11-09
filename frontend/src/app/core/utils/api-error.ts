/**
 * Traduce errores HTTP a mensajes legibles sin mostrar detalles internos del servidor.
 * El backend continúa siendo la fuente de verdad de las validaciones.
 */
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorBody {
  mensaje?: string;
  message?: string;
  errores?: Array<{ msg?: string; mensaje?: string; path?: string }>;
}

/** Obtiene el mensaje de error adecuado para presentar en formularios. */
export function obtenerMensajeApi(error: unknown, alternativa = 'No se pudo completar la operación.'): string {
  if (!(error instanceof HttpErrorResponse)) return alternativa;
  if (error.status === 0) return 'No fue posible conectar con el servidor. Verifica tu conexión.';
  if (error.status === 401) return 'La sesión ha expirado o las credenciales no son válidas.';
  if (error.status === 403) return 'No tienes permisos para realizar esta operación.';
  if (error.status >= 500) return 'El servidor presentó un inconveniente. Intenta más tarde.';
  const body: ApiErrorBody = typeof error.error === 'object' && error.error !== null ? error.error : {};
  const primerError = body.errores?.find(e => e.msg || e.mensaje);
  return primerError?.msg || primerError?.mensaje || body.mensaje || body.message || alternativa;
}
