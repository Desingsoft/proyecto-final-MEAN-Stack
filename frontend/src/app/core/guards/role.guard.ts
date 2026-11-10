/**
 * Archivo: role.guard.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (rolesPermitidos: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.tieneRol(rolesPermitidos)) return true;
    router.navigate([authService.tieneRol(['ventas']) ? '/pedidos' : '/dashboard']);
    return false;
  };
};
