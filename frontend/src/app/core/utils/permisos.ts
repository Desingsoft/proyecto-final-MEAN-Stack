import { Usuario } from '../models/usuario.model';
/** Reflejo para la interfaz de la matriz del servidor; no reemplaza su control. */
const MATRIZ: Record<string, readonly string[]> = {
  admin: ['*'],
  ventas: ['productos.leer', 'clientes.leer', 'clientes.crear', 'clientes.editar', 'pedidos.leer', 'pedidos.crear', 'pedidos.editar', 'ventas.cotizaciones', 'documentos.leer', 'documentos.crear', 'cartera.leer', 'pagos.leer', 'pagos.crear', 'devoluciones.leer', 'devoluciones.crear', 'eventos.leer'],
  bodeguero: ['productos.leer', 'productos.editar', 'inventario.leer', 'inventario.crear', 'pedidos.leer', 'pedidos.editar', 'proveedores.leer', 'ordenes-compra.leer', 'ordenes-compra.crear', 'ordenes-compra.editar', 'eventos.leer', 'reportes.leer']
};
export function permiteAccion(usuario: Usuario | null, accion: string): boolean {
  if (!usuario || usuario.activo === false) return false;
  const permitidos = MATRIZ[usuario.role] ?? [];
  if (!permitidos.includes('*') && !permitidos.includes(accion)) return false;
  return usuario.role === 'admin' || !usuario.permisos?.length || usuario.permisos.includes(accion);
}
