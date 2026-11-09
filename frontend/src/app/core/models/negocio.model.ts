/**
 * Archivo: negocio.model.ts
 * Propósito: Módulo TypeScript: configuración, tipos o funciones compartidas.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
export type TipoDocumentoId = 'NIT' | 'CC' | 'CE' | 'Pasaporte' | 'Otro';

export interface Cliente {
  _id?: string;
  nombre: string;
  tipoDocumento: TipoDocumentoId;
  documento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  notas?: string;
  diasCredito?: number | null;
  cupoCredito?: number;
  createdAt?: string;
}

export interface ClienteFicha extends Cliente {
  estadisticas: { pedidos: number; totalComprado: number; ticketPromedio: number; ultimaCompra: string | null };
  pedidos: { _id: string; total: number; estado: string; createdAt: string; unidades: number }[];
  documentos: { _id: string; tipo: 'factura' | 'remision'; numero: string; total: number; estado: string; createdAt: string; formaPago: string; fechaVencimiento?: string }[];
}

export interface Configuracion {
  nombreEmpresa: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  ivaPorcentaje: number;
  preciosIncluyenIva: boolean;
  prefijoFactura: string;
  prefijoRemision: string;
  prefijoOrdenCompra: string;
  prefijoRecibo: string;
  prefijoEgreso: string;
  prefijoNotaCredito: string;
  prefijoDevolucion: string;
  prefijoReembolso: string;
  diasCreditoDefecto: number;
  notaFactura: string;
}

export type EstadoPago = 'pendiente' | 'parcial' | 'pagada' | 'acreditada';
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'otro';
export type Situacion = 'vencida' | 'porVencer' | 'vigente';

export type EstadoOrden = 'borrador' | 'enviada' | 'parcial' | 'recibida' | 'cancelada';

export interface ItemOrden {
  producto: { _id: string; nombre: string; sku: string; stock?: number; stockMinimo?: number; costo?: number } | string;
  cantidad: number;
  cantidadRecibida: number;
  costoUnitario: number;
}

export interface OrdenCompra {
  _id: string;
  numero: string;
  proveedor: { _id: string; nombre: string; contacto?: string; telefono?: string; email?: string };
  items: ItemOrden[];
  total: number;
  estado: EstadoOrden;
  notas: string;
  facturaProveedor?: string;
  fechaVencimientoPago?: string;
  pagado?: number;
  valorRecibido?: number;
  saldoPorPagar?: number;
  fechaEsperada?: string;
  enviadaEn?: string;
  recepciones: {
    fecha: string;
    usuario?: { nombre: string };
    nota: string;
    items: { producto: { nombre: string; sku: string } | string; cantidad: number }[];
  }[];
  creadoPor?: { nombre: string };
  createdAt: string;
  unidades?: number;
  unidadesRecibidas?: number;
}

export interface OrdenesResponse {
  ordenes: OrdenCompra[];
  total: number;
  paginas: number;
  conteos: Record<EstadoOrden, number>;
}

export interface DocumentoVenta {
  _id: string;
  tipo: 'factura' | 'remision' | 'nota_credito';
  numero: string;
  pedido: string;
  empresa: { nombreEmpresa: string; nit: string; direccion: string; ciudad: string; telefono: string; email: string };
  cliente: { nombre: string; tipoDocumento?: string; documento?: string; direccion?: string; ciudad?: string; telefono?: string; email?: string };
  items: { sku: string; descripcion: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  subtotalBruto: number;
  descuentoPorcentaje: number;
  descuentoValor: number;
  base: number;
  ivaPorcentaje: number;
  ivaValor: number;
  total: number;
  preciosIncluyenIva: boolean;
  formaPago: 'contado' | 'credito';
  fechaVencimiento?: string;
  pagado?: number;
  saldo?: number;
  acreditado?: number;
  reembolsado?: number;
  saldoAFavor?: number;
  estadoPago?: EstadoPago;
  facturaOrigen?: string;
  numeroOrigen?: string;
  devolucion?: string;
  motivoDevolucion?: string;
  notas: string;
  notaLegal: string;
  estado: 'emitida' | 'anulada';
  anuladaEn?: string;
  motivoAnulacion?: string;
  emitidoPor?: { nombre: string };
  createdAt: string;
}

export interface DocumentoResumen {
  _id: string;
  tipo: 'factura' | 'remision' | 'nota_credito';
  numero: string;
  cliente: { nombre: string };
  total: number;
  estado: 'emitida' | 'anulada';
  formaPago: string;
  fechaVencimiento?: string;
  pagado?: number;
  saldo?: number;
  acreditado?: number;
  estadoPago?: EstadoPago;
  numeroOrigen?: string;
  facturaOrigen?: string;
  createdAt: string;
  pedido: string;
}

// ---- Cartera ----
export interface Pago {
  _id: string;
  numero: string;
  tipo: 'cobro' | 'egreso' | 'reembolso';
  fecha: string;
  contraparte: string;
  referenciaDocumento: string;
  documento?: string;
  orden?: string;
  monto: number;
  metodo: MetodoPago;
  referencia?: string;
  nota?: string;
  estado: 'vigente' | 'anulado';
  motivoAnulacion?: string;
  registradoPor?: { nombre: string } | string | null;
  cuenta?: { numero: string; total: number; pagado: number; saldo: number } | null;
}

export interface TramoAntiguedad { clave: string; etiqueta: string; monto: number; cantidad: number; }
export interface TotalesCartera {
  total: number; vencido: number; porVencer: number; vigente: number; documentos: number; documentosVencidos: number;
  cobradoMes?: number; pagadoMes?: number;
}
export interface DeudorCartera { clave: string; nombre: string; referencia: string | null; saldo: number; vencido: number; documentos: number; mayorMora: number; }
export interface ResumenCartera { totales: TotalesCartera; antiguedad: TramoAntiguedad[]; deudores?: DeudorCartera[]; acreedores?: DeudorCartera[]; aFavor?: { total: number; facturas: number }; }
export interface FilaAFavor { _id: string; numero: string; cliente: string; clienteRef: string | null; fecha: string; total: number; pagado: number; acreditado: number; reembolsado: number; aFavor: number; }

export interface FilaCobrar {
  _id: string; numero: string; cliente: string; clienteRef: string | null; pedido: string; fecha: string; fechaVencimiento: string | null;
  total: number; pagado: number; acreditado?: number; reembolsado?: number; saldo: number; mora: number; tramo: string; situacion: Situacion; formaPago: string;
}
export interface FilaPagar {
  _id: string; numero: string; proveedor: string; proveedorRef: string | null; facturaProveedor: string; estadoOrden: string; fecha: string;
  fechaVencimiento: string | null; total: number; pagado: number; saldo: number; mora: number; tramo: string; situacion: Situacion;
}
export interface SaldoCliente { clienteRef: string | null; cliente: string; saldo: number; vencido: number; facturas: number; mayorMora: number; cupo: number; disponible: number | null; }
export interface EstadoCuenta {
  cliente: Cliente;
  facturas: FilaCobrar[];
  pagos: { numero: string; fecha: string; monto: number; metodo: MetodoPago; referenciaDocumento: string }[];
  resumen: TotalesCartera & { cupo: number; disponible: number | null };
}
export interface RecaudosResponse {
  rango: { desde: string; hasta: string; dias: number };
  resumen: { total: number; cantidad: number; anulados: number; porMetodo: { metodo: MetodoPago; monto: number; cantidad: number }[]; reembolsos?: number; cantidadReembolsos?: number };
  pagos: Pago[];
  truncado: boolean;
}

export const ETIQUETA_METODO: Record<MetodoPago, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', cheque: 'Cheque', otro: 'Otro' };
export const METODOS_PAGO: MetodoPago[] = ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'];

// ---- Devoluciones ----
export type MotivoDevolucion = 'defectuoso' | 'error_pedido' | 'no_deseado' | 'garantia' | 'otro';
export const MOTIVOS_DEVOLUCION: MotivoDevolucion[] = ['defectuoso', 'error_pedido', 'no_deseado', 'garantia', 'otro'];
export const ETIQUETA_MOTIVO: Record<MotivoDevolucion, string> = {
  defectuoso: 'Producto defectuoso', error_pedido: 'Error en el pedido', no_deseado: 'El cliente no lo quiere', garantia: 'Garantía', otro: 'Otro motivo'
};

export interface ItemDevolucion { producto: string; sku: string; descripcion: string; cantidad: number; precioUnitario: number; reintegrar: boolean; }

export interface Devolucion {
  _id: string;
  numero: string;
  pedido: string | { _id: string; cliente: string; total: number; estado: string; createdAt: string };
  cliente: string;
  items: ItemDevolucion[];
  motivo: MotivoDevolucion;
  nota: string;
  valor: number;
  notaCredito?: { _id: string; numero: string; total: number; estado: string } | null;
  estado: 'vigente' | 'anulada';
  motivoAnulacion?: string;
  registradoPor?: { nombre: string } | null;
  createdAt: string;
}

export interface FilaDevolucion {
  _id: string; numero: string; fecha: string; pedido: string; cliente: string; motivo: MotivoDevolucion; estado: 'vigente' | 'anulada';
  unidades: number; valor: number; notaCredito: { _id: string; numero: string } | null;
}

export interface ListaDevoluciones {
  rango: { desde: string; hasta: string; dias: number };
  resumen: { cantidad: number; valor: number; unidades: number; anuladas: number; reintegradas: number; descartadas: number };
  porMotivo: { motivo: MotivoDevolucion; cantidad: number; valor: number }[];
  topProductos: { sku: string; descripcion: string; unidades: number; valor: number }[];
  devoluciones: FilaDevolucion[];
  truncado: boolean;
}

export interface NuevaDevolucion {
  pedidoId: string;
  motivo: MotivoDevolucion;
  nota?: string;
  items: { producto: string; cantidad: number; reintegrar: boolean }[];
  reembolso?: { monto: number; metodo: MetodoPago; referencia?: string };
}
