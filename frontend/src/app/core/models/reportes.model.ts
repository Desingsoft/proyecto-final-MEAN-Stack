/**
 * Archivo: reportes.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { NivelStock } from '../../shared/utils/stock';

export interface DashboardResponse {
  generadoEn: string;
  dias: number;
  kpis: {
    ventasPeriodo: number | null;
    ventasPeriodoAnterior: number | null;
    variacionVentas: number | null;
    pedidosPeriodo: number | null;
    ticketPromedio: number | null;
    devolucionesPeriodo?: number | null;
    pedidosPendientes: number;
    pedidosProcesando: number;
    productosActivos: number;
    unidadesEnStock: number;
    productosEnAlerta: number;
    valorInventario: { costo: number; venta: number } | null;
    carteraPorCobrar: number | null;
    carteraVencida: number | null;
    facturasVencidas: number | null;
    cuentasPorPagar: number | null;
    cuentasPorPagarVencidas: number | null;
  };
  estadoInventario: Record<NivelStock, number>;
  pedidosPorEstado: { estado: string; cantidad: number }[];
  ventasPorDia: { fecha: string; total: number; pedidos: number }[] | null;
  topProductos: { producto: string | null; sku: string; nombre: string; unidades: number; ingresos: number }[] | null;
  atencion: { _id: string; nombre: string; sku: string; stock: number; stockMinimo: number; nivel: NivelStock }[];
}

export interface ReporteVentas {
  rango: { desde: string; hasta: string; dias: number };
  resumen: {
    ventas: number;
    pedidos: number;
    ticketPromedio: number;
    unidades: number;
    cancelados: number;
    margenEstimado: number;
    ventasPeriodoAnterior: number;
    variacion: number | null;
    ventasBrutas?: number;
    devoluciones?: number;
    devolucionesCantidad?: number;
  };
  porDia: { fecha: string; total: number; pedidos: number }[];
  porEstado: { estado: string; cantidad: number; total: number }[];
  porProducto: {
    producto: string | null; sku: string; nombre: string; categoria: string | null;
    unidades: number; ingresos: number; costo: number; margen: number;
  }[];
  porVendedor: { nombre: string; pedidos: number; ventas: number }[];
  pedidos: { _id: string; fecha: string; cliente: string; estado: string; unidades: number; total: number; vendedor: string | null }[];
  truncado: boolean;
}

export interface ReporteInventario {
  resumen: {
    productos: number;
    unidades: number;
    valorCosto: number;
    valorVenta: number;
    margenPotencial: number;
    porNivel: Record<NivelStock, number>;
  };
  porCategoria: { categoria: string; productos: number; unidades: number; valorCosto: number; valorVenta: number }[];
  productos: {
    _id: string; sku: string; nombre: string; categoria: string | null; proveedor: string | null;
    stock: number; stockMinimo: number; nivel: NivelStock; costo: number; precio: number; valorCosto: number; valorVenta: number;
  }[];
}

export interface ReporteMovimientos {
  rango: { desde: string; hasta: string; dias: number };
  resumen: { movimientos: number; unidadesEntrada: number; unidadesSalida: number; neto: number };
  porDia: { fecha: string; entradas: number; salidas: number }[];
  porMotivo: { motivo: string; movimientos: number; entradas: number; salidas: number }[];
  movimientos: {
    _id: string; fecha: string; sku: string; producto: string; tipo: 'entrada' | 'salida';
    cantidad: number; motivo: string | null; registradoPor: string | null;
  }[];
  truncado: boolean;
}

export interface ItemReposicion {
  _id: string;
  nombre: string;
  sku: string;
  categoria: string | null;
  proveedor: { _id: string; nombre: string; contacto?: string; telefono?: string; email?: string } | null;
  stock: number;
  stockMinimo: number;
  objetivo: number;
  nivel: NivelStock;
  sugerido: number;
  costo: number;
  costoEstimado: number;
}

export interface ReposicionResponse {
  items: ItemReposicion[];
  resumen: { total: number; agotados: number; criticos: number; bajos: number; costoEstimado: number };
}
