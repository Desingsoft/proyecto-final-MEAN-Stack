/**
 * Archivo: app.routes.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';
import { roleGuard } from './core/guards/role.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  { path: 'recuperar', loadComponent: () => import('./features/auth/recuperacion.component').then(m => m.RecuperacionComponent) },
  { path: 'restablecer', loadComponent: () => import('./features/auth/recuperacion.component').then(m => m.RecuperacionComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).tieneRol(['ventas']) ? 'pedidos' : 'dashboard' },
      { path: 'empresa', loadComponent: () => import('./features/empresa/empresa.component').then(m => m.EmpresaComponent), canActivate: [roleGuard(['admin'])] },
      { path: 'avanzado', loadComponent: () => import('./features/avanzado/avanzado.component').then(m => m.AvanzadoComponent) },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent), canActivate: [roleGuard(['admin', 'bodeguero'])] },

      // Productos
      // La ruta de detalle precede a las rutas generales de productos.
      { path: 'productos/ficha/:id', loadComponent: () => import('./features/productos/tarjeta-producto/tarjeta-producto.component').then(m => m.TarjetaProductoComponent), canActivate: [permissionGuard('productos.leer')] },
      { path: 'productos', loadComponent: () => import('./features/productos/lista-productos/lista-productos.component').then((m) => m.ListaProductosComponent), canActivate: [permissionGuard('productos.leer')] },
      {
        path: 'productos/nuevo',
        loadComponent: () => import('./features/productos/form-producto/form-producto.component').then((m) => m.FormProductoComponent),
        canActivate: [roleGuard(['admin']), permissionGuard('productos.crear')]
      },
      {
        path: 'productos/editar/:id',
        loadComponent: () => import('./features/productos/form-producto/form-producto.component').then((m) => m.FormProductoComponent),
        canActivate: [roleGuard(['admin', 'bodeguero']), permissionGuard('productos.editar')]
      },

      // Pedidos — el orden importa: "nuevo" debe ir antes que ":id"
      { path: 'pedidos', loadComponent: () => import('./features/pedidos/lista-pedidos/lista-pedidos.component').then((m) => m.ListaPedidosComponent), canActivate: [permissionGuard('pedidos.leer')] },
      {
        path: 'pedidos/nuevo',
        loadComponent: () => import('./features/pedidos/nuevo-pedido/nuevo-pedido.component').then((m) => m.NuevoPedidoComponent),
        canActivate: [roleGuard(['admin', 'ventas']), permissionGuard('pedidos.crear')]
      },
      { path: 'pedidos/:id', loadComponent: () => import('./features/pedidos/detalle-pedido/detalle-pedido.component').then((m) => m.DetallePedidoComponent), canActivate: [permissionGuard('pedidos.leer')] },

      // Inventario
      {
        path: 'inventario',
        loadComponent: () => import('./features/inventario/movimientos/movimientos.component').then((m) => m.MovimientosComponent),
        canActivate: [roleGuard(['admin', 'bodeguero']), permissionGuard('inventario.leer')]
      },

      { path: 'transferencias', loadComponent: () => import('./features/inventario/transferencias.component').then(m => m.TransferenciasComponent), canActivate: [roleGuard(['admin', 'bodeguero']), permissionGuard('inventario.crear')] },

      // Reposición: qué comprar y a quién
      {
        path: 'reposicion',
        loadComponent: () => import('./features/reposicion/reposicion.component').then((m) => m.ReposicionComponent),
        canActivate: [roleGuard(['admin', 'bodeguero'])]
      },

      // Devoluciones y notas crédito
      { path: 'devoluciones', loadComponent: () => import('./features/devoluciones/lista-devoluciones.component').then((m) => m.ListaDevolucionesComponent), canActivate: [roleGuard(['admin', 'ventas']), permissionGuard('devoluciones.leer')] },

      // Clientes
      { path: 'clientes', loadComponent: () => import('./features/clientes/lista-clientes.component').then((m) => m.ListaClientesComponent), canActivate: [roleGuard(['admin', 'ventas']), permissionGuard('clientes.leer')] },
      { path: 'clientes/:id', loadComponent: () => import('./features/clientes/cliente-detalle.component').then((m) => m.ClienteDetalleComponent), canActivate: [roleGuard(['admin', 'ventas'])] },

      // Órdenes de compra (nueva y editar van antes que :id)
      { path: 'ordenes-compra', loadComponent: () => import('./features/ordenes-compra/lista-ordenes.component').then((m) => m.ListaOrdenesComponent), canActivate: [roleGuard(['admin', 'bodeguero']), permissionGuard('ordenes-compra.leer')] },
      { path: 'ordenes-compra/nueva', loadComponent: () => import('./features/ordenes-compra/form-orden.component').then((m) => m.FormOrdenComponent), canActivate: [roleGuard(['admin', 'bodeguero'])] },
      { path: 'ordenes-compra/editar/:id', loadComponent: () => import('./features/ordenes-compra/form-orden.component').then((m) => m.FormOrdenComponent), canActivate: [roleGuard(['admin', 'bodeguero'])] },
      { path: 'ordenes-compra/:id', loadComponent: () => import('./features/ordenes-compra/detalle-orden.component').then((m) => m.DetalleOrdenComponent), canActivate: [roleGuard(['admin', 'bodeguero'])] },

      // Facturas y remisiones
      { path: 'documentos', loadComponent: () => import('./features/documentos/lista-documentos.component').then((m) => m.ListaDocumentosComponent), canActivate: [roleGuard(['admin', 'ventas']), permissionGuard('documentos.leer')] },
      { path: 'documentos/:id', loadComponent: () => import('./features/documentos/detalle-documento.component').then((m) => m.DetalleDocumentoComponent), canActivate: [roleGuard(['admin', 'ventas'])] },

      // Cartera: por cobrar (admin, ventas) y por pagar (solo admin)
      {
        path: 'cartera',
        canActivate: [roleGuard(['admin', 'ventas']), permissionGuard('cartera.leer')],
        loadComponent: () => import('./features/cartera/cartera.component').then((m) => m.CarteraComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'cobrar' },
          { path: 'cobrar', loadComponent: () => import('./features/cartera/cartera-cobrar.component').then((m) => m.CarteraCobrarComponent) },
          { path: 'clientes', loadComponent: () => import('./features/cartera/cartera-clientes.component').then((m) => m.CarteraClientesComponent) },
          { path: 'recaudos', loadComponent: () => import('./features/cartera/recaudos.component').then((m) => m.RecaudosComponent), data: { tipo: 'cobro' } },
          { path: 'pagar', loadComponent: () => import('./features/cartera/cartera-pagar.component').then((m) => m.CarteraPagarComponent), canActivate: [roleGuard(['admin'])] },
          { path: 'pagos-realizados', loadComponent: () => import('./features/cartera/recaudos.component').then((m) => m.RecaudosComponent), data: { tipo: 'egreso' }, canActivate: [roleGuard(['admin'])] }
        ]
      },

      // Configuración de la empresa
      { path: 'configuracion', loadComponent: () => import('./features/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent), canActivate: [roleGuard(['admin']), permissionGuard('configuracion.editar')] },

      // Reportes (cada pestaña tiene sus propios roles)
      {
        path: 'reportes',
        canActivate: [permissionGuard('reportes.leer')],
        loadComponent: () => import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
        children: [
          // Cada rol aterriza en la pestaña que puede ver.
          { path: '', pathMatch: 'full', redirectTo: () => (inject(AuthService).tieneRol(['admin', 'ventas']) ? 'ventas' : 'inventario') },
          { path: 'ventas', loadComponent: () => import('./features/reportes/ventas/reporte-ventas.component').then((m) => m.ReporteVentasComponent), canActivate: [roleGuard(['admin'])] },
          { path: 'inventario', loadComponent: () => import('./features/reportes/inventario/reporte-inventario.component').then((m) => m.ReporteInventarioComponent), canActivate: [roleGuard(['admin', 'bodeguero'])] },
          { path: 'movimientos', loadComponent: () => import('./features/reportes/movimientos/reporte-movimientos.component').then((m) => m.ReporteMovimientosComponent), canActivate: [roleGuard(['admin', 'bodeguero'])] }
        ]
      },

      // Proveedores
      { path: 'proveedores', loadComponent: () => import('./features/proveedores/lista-proveedores/lista-proveedores.component').then((m) => m.ListaProveedoresComponent), canActivate: [permissionGuard('proveedores.leer')] },
      {
        path: 'proveedores/nuevo',
        loadComponent: () => import('./features/proveedores/form-proveedor/form-proveedor.component').then((m) => m.FormProveedorComponent),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'proveedores/editar/:id',
        loadComponent: () => import('./features/proveedores/form-proveedor/form-proveedor.component').then((m) => m.FormProveedorComponent),
        canActivate: [roleGuard(['admin'])]
      },

      // Usuarios y perfil
      { path: 'perfil', loadComponent: () => import('./features/usuarios/perfil/perfil.component').then((m) => m.PerfilComponent) },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/lista-usuarios/lista-usuarios.component').then((m) => m.ListaUsuariosComponent),
        canActivate: [roleGuard(['admin'])]
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () => import('./features/usuarios/nuevo-usuario/nuevo-usuario.component').then((m) => m.NuevoUsuarioComponent),
        canActivate: [roleGuard(['admin'])]
      }
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
