/**
 * Archivo: detalle-pedido.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../core/services/pedido.service';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentoService } from '../../../core/services/documento.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { Pedido } from '../../../core/models/pedido.model';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { DevolucionService } from '../../../core/services/devolucion.service';
import { Devolucion, ETIQUETA_MOTIVO } from '../../../core/models/negocio.model';
import { DevolucionFormModalComponent, FacturaDelPedido } from '../../devoluciones/devolucion-form-modal.component';
import { DineroPipe } from '../../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CLASE_ESTADO_PEDIDO } from '../../../shared/utils/stock';
import { ETIQUETA_METODO, METODOS_PAGO, MetodoPago } from '../../../core/models/negocio.model';

type DocPedido = {
  _id: string; tipo: 'factura' | 'remision' | 'nota_credito'; numero: string; total: number; estado: string; createdAt: string; formaPago: string;
  saldo?: number; saldoAFavor?: number; acreditado?: number; ivaPorcentaje?: number; preciosIncluyenIva?: boolean; numeroOrigen?: string;
};

@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, ModalComponent, DevolucionFormModalComponent],
  templateUrl: './detalle-pedido.component.html'
})
export class DetallePedidoComponent implements OnInit {
  private confirmService = inject(ConfirmService);
  private documentoService = inject(DocumentoService);
  private configService = inject(ConfiguracionService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);

  pedido = signal<Pedido | null>(null);
  private devolucionService = inject(DevolucionService);
  readonly etiquetaMotivo = ETIQUETA_MOTIVO;
  devoluciones = signal<Devolucion[]>([]);
  devuelto = signal<Record<string, number>>({});
  devolviendo = signal(false);
  anulandoDev = signal<Devolucion | null>(null);
  motivoDev = signal('');
  errorDev = signal('');
  guardandoDev = signal(false);
  documentos = signal<DocPedido[]>([]);
  cargando = signal(true);
  errorMsg = signal('');

  // Emisión de documentos
  emitiendo = signal<'factura' | 'remision' | null>(null);
  formaPago = signal<'contado' | 'credito'>('contado');
  diasCredito = signal(30);
  ivaPorcentaje = signal(19);
  readonly metodos = METODOS_PAGO;
  readonly etiquetaMetodo = ETIQUETA_METODO;
  metodoPago = signal<MetodoPago>('efectivo');
  referenciaPago = signal('');
  notasDocumento = signal('');
  guardandoDoc = signal(false);
  errorDoc = signal('');

  estados = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];

  puedeFacturar = computed(() => { this.authService.usuarioActual(); return this.authService.tieneRol(['admin', 'ventas']); });
  clienteFicha = computed(() => {
    const ref = this.pedido()?.clienteRef;
    return ref && typeof ref === 'object' ? ref : null;
  });
  facturaVigente = computed<FacturaDelPedido | null>(() => {
    const f = this.documentos().find((d) => d.tipo === 'factura' && d.estado === 'emitida');
    return f ? { numero: f.numero, total: f.total, saldo: f.saldo ?? 0, saldoAFavor: f.saldoAFavor ?? 0, ivaPorcentaje: f.ivaPorcentaje, preciosIncluyenIva: f.preciosIncluyenIva } : null;
  });
  puedeDevolver = computed(() => {
    const p = this.pedido();
    if (!p || !['enviado', 'completado'].includes(p.estado)) return false;
    this.authService.usuarioActual();
    if (!this.authService.tieneRol(['admin', 'ventas'])) return false;
    return p.items.some((i: any) => i.cantidad - (this.devuelto()[typeof i.producto === 'object' ? i.producto._id : i.producto] ?? 0) > 0);
  });
  devueltoDe(item: any): number { return this.devuelto()[typeof item.producto === 'object' ? item.producto._id : item.producto] ?? 0; }
  hayDevueltos = computed(() => Object.values(this.devuelto()).some((n) => n > 0));
  vigente = (tipo: 'factura' | 'remision') => this.documentos().find((d) => d.tipo === tipo && d.estado === 'emitida');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pedidoService: PedidoService,
    private notificacionService: NotificacionService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/pedidos']);
      return;
    }
    this.cargarPedido(id);
    this.tiempoReal.alCambiar('pedidos', 'documentos', 'devoluciones').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargarPedido(id, true));
  }

  cargarPedido(id: string, silencioso = false): void {
    if (!silencioso) this.cargando.set(true);
    this.pedidoService.getPorId(id).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el pedido');
        this.cargando.set(false);
      }
    });
    if (this.authService.tieneRol(['admin', 'ventas'])) {
      this.documentoService.porPedido(id).subscribe({ next: (d) => this.documentos.set(d as DocPedido[]), error: () => {} });
      this.devolucionService.porPedido(id).subscribe({ next: (r) => { this.devoluciones.set(r.devoluciones); this.devuelto.set(r.devuelto); }, error: () => {} });
    }
  }

  async cambiarEstado(nuevoEstado: string): Promise<void> {
    const pedido = this.pedido();
    if (!pedido) return;
    const cancelar = nuevoEstado === 'cancelado';
    const ok = await this.confirmService.confirmar({
      titulo: cancelar ? 'Cancelar pedido' : 'Cambiar estado',
      mensaje: cancelar
        ? `El pedido de ${pedido.cliente} se cancelará y las unidades volverán al inventario.`
        : `El pedido de ${pedido.cliente} pasará a "${nuevoEstado}".`,
      confirmar: cancelar ? 'Cancelar pedido' : 'Cambiar estado',
      cancelar: 'Volver',
      peligro: cancelar
    });
    if (!ok) return;

    this.pedidoService.cambiarEstado(pedido._id!, nuevoEstado).subscribe({
      next: () => {
        this.notificacionService.exito('Estado actualizado correctamente');
        this.cargarPedido(pedido._id!, true); // recarga completa para conservar los nombres de los productos
      },
      error: (err) => this.notificacionService.error(err.error?.mensaje || 'Error al cambiar el estado')
    });
  }

  // --- Remisiones y facturas ---
  abrirEmision(tipo: 'factura' | 'remision'): void {
    this.errorDoc.set('');
    this.notasDocumento.set('');
    this.formaPago.set('contado');
    this.metodoPago.set('efectivo');
    this.referenciaPago.set('');
    const cfg = this.configService.actual();
    const aplicar = (iva: number, dias: number) => {
      this.ivaPorcentaje.set(iva);
      // El plazo propio del cliente, si lo tiene, manda sobre el de la configuración.
      const ficha = this.clienteFicha();
      this.diasCredito.set(ficha?.diasCredito ?? dias);
    };
    if (cfg) aplicar(cfg.ivaPorcentaje, cfg.diasCreditoDefecto);
    else this.configService.obtener().subscribe((c) => aplicar(c.ivaPorcentaje, c.diasCreditoDefecto));
    this.emitiendo.set(tipo);
  }

  cupoExcedido = computed(() => this.errorDoc().includes('cupo de crédito'));
  esAdmin = computed(() => { this.authService.usuarioActual(); return this.authService.tieneRol(['admin']); });

  emitir(forzarCupo = false): void {
    const tipo = this.emitiendo();
    const pedido = this.pedido();
    if (!tipo || !pedido) return;
    this.guardandoDoc.set(true);
    this.errorDoc.set('');
    this.documentoService.emitir({
      pedidoId: pedido._id!, tipo, notas: this.notasDocumento(),
      ...(tipo === 'factura' ? {
        formaPago: this.formaPago(), diasCredito: Number(this.diasCredito()), ivaPorcentaje: Number(this.ivaPorcentaje()),
        ...(this.formaPago() === 'contado' ? { metodoPago: this.metodoPago(), referenciaPago: this.referenciaPago() } : {}),
        ...(forzarCupo ? { forzarCupo: true } : {})
      } : {})
    }).subscribe({
      next: (doc) => {
        this.guardandoDoc.set(false);
        this.emitiendo.set(null);
        this.notificacionService.exito(`${tipo === 'factura' ? 'Factura' : 'Remisión'} ${doc.numero} emitida`);
        this.router.navigate(['/documentos', doc._id]);
      },
      error: (err) => { this.guardandoDoc.set(false); this.errorDoc.set(err.error?.mensaje || 'No se pudo emitir el documento'); }
    });
  }

  alDevolver(d: Devolucion): void {
    this.devolviendo.set(false);
    this.notificacionService.exito(d.notaCredito ? `Devolución ${d.numero} registrada con la nota crédito ${d.notaCredito.numero}` : `Devolución ${d.numero} registrada`);
    this.cargarPedido(this.pedido()!._id!, true);
  }

  anularDevolucion(): void {
    const d = this.anulandoDev();
    if (!d || this.motivoDev().trim().length < 5) return;
    this.guardandoDev.set(true);
    this.errorDev.set('');
    this.devolucionService.anular(d._id, this.motivoDev().trim()).subscribe({
      next: () => { this.guardandoDev.set(false); this.anulandoDev.set(null); this.motivoDev.set(''); this.notificacionService.exito('Devolución anulada'); this.cargarPedido(this.pedido()!._id!, true); },
      error: (err) => { this.guardandoDev.set(false); this.errorDev.set(err.error?.mensaje || 'No se pudo anular la devolución'); }
    });
  }

  claseEstado(estado: string): string {
    return CLASE_ESTADO_PEDIDO[estado] || 'badge-secondary';
  }

  puedeEditarEstado(): boolean {
    const pedido = this.pedido();
    if (!pedido) return false;
    return pedido.estado !== 'completado' && pedido.estado !== 'cancelado';
  }

  nombreProducto(item: any): string {
    return typeof item.producto === 'object' ? `${item.producto.nombre} (${item.producto.sku})` : item.producto;
  }
}
