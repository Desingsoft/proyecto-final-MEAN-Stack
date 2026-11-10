/**
 * Matriz de permisos por rol. Principio de menor privilegio.
 * Los permisos individuales únicamente pueden RESTRINGIR el rol; no ampliarlo.
 * Mantener esta matriz alineada con los guards/menús de Angular.
 */
const MATRIZ = Object.freeze({
  admin: ['*'],
  ventas: [
    'productos.leer', 'clientes.leer', 'clientes.crear', 'clientes.editar',
    'pedidos.leer', 'pedidos.crear', 'pedidos.editar',
    'ventas.cotizaciones', 'documentos.leer', 'documentos.crear',
    'cartera.leer', 'pagos.leer', 'pagos.crear', 'devoluciones.leer',
    'devoluciones.crear', 'eventos.leer', 'reportes.leer'
  ],
  bodeguero: [
    'productos.leer', 'productos.editar', 'inventario.leer',
    'inventario.crear', 'pedidos.leer', 'pedidos.editar',
    'proveedores.leer', 'ordenes-compra.leer', 'ordenes-compra.crear', 'ordenes-compra.editar', 'eventos.leer', 'reportes.leer'
  ]
});
/** @returns {boolean} Indica si el rol autoriza una operación concreta. */
function permiteRol(rol, accion) {
  return MATRIZ[rol]?.includes('*') || MATRIZ[rol]?.includes(accion) || false;
}
module.exports = { MATRIZ, permiteRol };
