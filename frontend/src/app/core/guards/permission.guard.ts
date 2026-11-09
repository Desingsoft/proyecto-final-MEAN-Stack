/** Protección visual de rutas; el backend siempre decide la autorización real. */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { permiteAccion } from '../utils/permisos';
export const permissionGuard = (accion: string): CanActivateFn => () => {
  const auth = inject(AuthService);
  // Los datos locales solo controlan navegación; la API vuelve a validar el JWT.
  if (!auth.estaAutenticado()) return inject(Router).createUrlTree(['/login']);
  if (permiteAccion(auth.usuarioActual(), accion)) return true;
  return inject(Router).createUrlTree([auth.tieneRol(['ventas']) ? '/pedidos' : '/dashboard']);
};
