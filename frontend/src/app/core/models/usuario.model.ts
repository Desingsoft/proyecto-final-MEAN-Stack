/**
 * Archivo: usuario.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export type RolUsuario = 'admin' | 'bodeguero' | 'ventas';

export interface Usuario {
  _id?: string;
  nombre: string;
  email: string;
  role: RolUsuario;
  /** Fecha de nacimiento en formato ISO (AAAA-MM-DD). */
  fechaNacimiento?: string;
  /** Dato de perfil; no determina permisos. */
  sexo?: 'femenino' | 'masculino' | 'otro' | 'prefiero_no_decir';
  ciudad?: string;
  activo?: boolean;
  permisos?: string[];
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export interface NuevoUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  fechaNacimiento: string;
  sexo: 'femenino' | 'masculino' | 'otro' | 'prefiero_no_decir';
  ciudad: string;
  role: RolUsuario;
}

export interface ActualizarUsuarioPayload {
  fechaNacimiento?: string;
  sexo?: Usuario['sexo'];
  ciudad?: string;
  nombre?: string;
  email?: string;
  role?: RolUsuario;
  activo?: boolean;
}

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: 'Administrador',
  bodeguero: 'Bodeguero',
  ventas: 'Ventas'
};

export const DESCRIPCION_ROL: Record<RolUsuario, string> = {
  admin: 'Acceso total: usuarios, productos, pedidos, inventario, proveedores y reportes.',
  bodeguero: 'Gestiona inventario y reposición, edita productos y consulta pedidos.',
  ventas: 'Crea y consulta pedidos, consulta productos y ve los reportes de ventas.'
};
