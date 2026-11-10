/**
 * Archivo: detalle-documento.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentoService } from '../../core/services/documento.service';
import { CarteraService } from '../../core/services/cartera.service';
import { ConfiguracionService } from '../../core/services/configuracion.service';
import { ETIQUETA_METODO, Pago } from '../../core/models/negocio.model';
import { PagoModalComponent } from '../cartera/pago-modal.component';
import { formatearDinero } from '../../shared/pipes/dinero.pipe';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { DocumentosPdfService } from '../../shared/services/documentos-pdf.service';
import { DocumentoVenta } from '../../core/models/negocio.model';
import { DineroPipe } from '../../shared/pipes/dinero.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-detalle-documento',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, DineroPipe, IconComponent, ModalComponent, PagoModalComponent],
  template: `
    <a routerLink="/documentos" class="volver"><app-icon name="atras" [size]="14" /> Volver a documentos</a>

    @if (cargando()) {
      <div class="skeleton" style="height: 420px; margin-top: 1rem"></div>
    } @else {
      @if (doc(); as d) {
      <header class="page-header" style="margin-top: 0.75rem">
        <div>
          <h1>{{ d.tipo === 'factura' ? 'Factura' : d.tipo === 'nota_credito' ? 'Nota crédito' : 'Remisión' }} {{ d.numero }}
            @if (d.tipo === 'factura' && d.estado === 'emitida') { <span [class]="'chip ' + chipPago(d.estadoPago)" style="vertical-align: middle; margin-left: 0.5rem">{{ etiquetaPago(d.estadoPago) }}</span> }
          </h1>
          <p class="subtitulo">Emitida el {{ d.createdAt | date:"d 'de' MMMM y, h:mm a" }}@if (d.emitidoPor) { por {{ d.emitidoPor.nombre }} }</p>
        </div>
        <div class="page-header-acciones">
          @if (puedeCobrar(d)) { <button type="button" class="btn-primary" (click)="registrando.set(true)"><app-icon name="entrada" [size]="16" /> Registrar pago</button> }
          <a [routerLink]="['/pedidos', d.pedido]" class="btn-secondary">Ver pedido</a>
          @if (d.estado === 'emitida' && d.tipo !== 'nota_credito' && authService.tieneRol(['admin'])) {
            <button type="button" class="btn-secondary" style="color: var(--agotado)" (click)="anulando.set(true)">Anular</button>
          }
          <button type="button" class="btn-primary" (click)="descargar()" [disabled]="generando()"><app-icon name="descargar" [size]="16" /> {{ generando() ? 'Generando…' : 'Descargar PDF' }}</button>
        </div>
      </header>

      @if (d.estado === 'anulada') {
        <div class="error-alert" role="status"><strong>Documento anulado</strong>@if (d.anuladaEn) { el {{ d.anuladaEn | date:'d MMM y' }} }: {{ d.motivoAnulacion }}</div>
      }

      <!-- Vista previa del documento -->
      <article class="hoja" [class.anulada]="d.estado === 'anulada'">
        <div class="hoja-cabecera">
          <div>
            <strong class="hoja-empresa">{{ d.empresa.nombreEmpresa }}</strong>
            @if (d.empresa.nit) { <div>NIT {{ d.empresa.nit }}</div> }
            @if (d.empresa.direccion || d.empresa.ciudad) { <div>{{ unir([d.empresa.direccion, d.empresa.ciudad], ', ') }}</div> }
            @if (d.empresa.telefono || d.empresa.email) { <div>{{ unir([d.empresa.telefono, d.empresa.email], '  |  ') }}</div> }
          </div>
          <div class="hoja-numero">
            <span>{{ d.tipo === 'factura' ? 'FACTURA DE VENTA' : d.tipo === 'nota_credito' ? 'NOTA CRÉDITO' : 'REMISIÓN' }}</span>
            <strong>{{ d.numero }}</strong>
          </div>
        </div>

        <div class="hoja-partes">
          <div>
            <span class="hoja-etiqueta">Cliente</span>
            <strong>{{ d.cliente.nombre }}</strong>
            @if (d.cliente.documento) { <div>{{ d.cliente.tipoDocumento }} {{ d.cliente.documento }}</div> }
            @if (d.cliente.direccion || d.cliente.ciudad) { <div>{{ unir([d.cliente.direccion, d.cliente.ciudad], ', ') }}</div> }
            @if (d.cliente.telefono || d.cliente.email) { <div>{{ unir([d.cliente.telefono, d.cliente.email], '  |  ') }}</div> }
          </div>
          <div>
            <span class="hoja-etiqueta">Fecha de emisión</span>
            <strong>{{ d.createdAt | date:'d MMM y' }}</strong>
            @if (d.tipo === 'nota_credito') {
              <span class="hoja-etiqueta" style="margin-top: 0.6rem">Factura afectada</span>
              <strong><a [routerLink]="['/documentos', d.facturaOrigen]">{{ d.numeroOrigen }}</a></strong>
            }
            @if (d.tipo === 'factura') {
              <span class="hoja-etiqueta" style="margin-top: 0.6rem">Forma de pago</span>
              <strong>{{ d.formaPago === 'credito' ? 'Crédito' : 'Contado' }}</strong>
              @if (d.fechaVencimiento) { <span class="hoja-etiqueta" style="margin-top: 0.6rem">Vence</span><strong>{{ d.fechaVencimiento | date:'d MMM y' }}</strong> }
            }
          </div>
        </div>

        <div class="tabla-wrap"><table>
          <thead><tr><th>Código</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr></thead>
          <tbody>
            @for (i of d.items; track $index) {
              <tr><td class="codigo">{{ i.sku }}</td><td>{{ i.descripcion }}</td><td class="num">{{ i.cantidad }}</td><td class="num">{{ i.precioUnitario | dinero }}</td><td class="num">{{ i.subtotal | dinero }}</td></tr>
            }
          </tbody>
        </table></div>

        <dl class="hoja-totales">
          <dt>Subtotal</dt><dd>{{ d.subtotalBruto | dinero }}</dd>
          @if (d.descuentoValor > 0) { <dt>Descuento ({{ d.descuentoPorcentaje }} %)</dt><dd>- {{ d.descuentoValor | dinero }}</dd> }
          @if ((d.tipo === 'factura' || d.tipo === 'nota_credito') && d.ivaPorcentaje > 0) {
            <dt>Base gravable</dt><dd>{{ d.base | dinero }}</dd>
            <dt>IVA ({{ d.ivaPorcentaje }} %){{ d.preciosIncluyenIva ? ' incluido' : '' }}</dt><dd>{{ d.ivaValor | dinero }}</dd>
          }
          <dt class="total">Total</dt><dd class="total">{{ d.total | dinero }}</dd>
        </dl>

        @if (d.notas) { <p class="hoja-notas"><strong>Observaciones:</strong> {{ d.notas }}</p> }
        <p class="hoja-legal">{{ d.notaLegal }}</p>
      </article>

      @if (d.tipo === 'factura' && d.estado === 'emitida') {
        <section class="panel" style="max-width: 900px; margin-top: 1.25rem">
          <div class="panel-header">
            <div><h2>Pagos</h2><p class="nota">{{ d.formaPago === 'credito' ? 'Factura a crédito' : 'Factura de contado' }}@if (d.fechaVencimiento && (d.saldo ?? 0) > 0) {, vence el {{ d.fechaVencimiento | date:'d MMM y' }}}</p></div>
            @if (puedeCobrar(d)) { <button type="button" class="btn-primary btn-sm" (click)="registrando.set(true)">Registrar pago</button> }
          </div>
          <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 1rem">
            <div><span class="hoja-etiqueta">Total</span><br /><strong>{{ d.total | dinero }}</strong></div>
            <div><span class="hoja-etiqueta">Pagado</span><br /><strong style="color: var(--ok-texto)">{{ (d.pagado ?? 0) | dinero }}</strong></div>
            @if ((d.acreditado ?? 0) > 0) { <div><span class="hoja-etiqueta">Notas crédito</span><br /><strong style="color: var(--critico-texto)">− {{ (d.acreditado ?? 0) | dinero }}</strong></div> }
            @if ((d.reembolsado ?? 0) > 0) { <div><span class="hoja-etiqueta">Reembolsado</span><br /><strong>{{ (d.reembolsado ?? 0) | dinero }}</strong></div> }
            <div><span class="hoja-etiqueta">Saldo</span><br /><strong [style.color]="(d.saldo ?? 0) > 0 ? 'var(--critico-texto)' : 'inherit'">{{ (d.saldo ?? 0) | dinero }}</strong></div>
            @if ((d.saldoAFavor ?? 0) > 0) {
              <div><span class="hoja-etiqueta">A favor del cliente</span><br /><strong style="color: var(--critico-texto)">{{ (d.saldoAFavor ?? 0) | dinero }}</strong>
                @if (puedeReembolsar(d)) { <button type="button" class="btn-primary btn-sm" style="margin-left: 0.6rem" (click)="reembolsando.set(true)">Reembolsar</button> }</div>
            }
          </div>
          @if (pagos().length === 0) { <p class="sin-datos" style="padding: 1rem">Todavía no se han registrado pagos.</p> } @else {
            <div class="tabla-wrap"><table>
              <thead><tr><th>Recibo</th><th>Fecha</th><th>Forma</th><th class="num">Monto</th><th><span class="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                @for (p of pagos(); track p._id) {
                  <tr [style.opacity]="p.estado === 'anulado' ? 0.55 : 1">
                    <td><span class="celda-doble"><span class="principal">{{ p.numero }}</span>@if (p.estado === 'anulado') { <span class="secundaria" style="color: var(--agotado-texto)">Anulado: {{ p.motivoAnulacion }}</span> } @else if (p.nota) { <span class="secundaria">{{ p.nota }}</span> }</span></td>
                    <td>{{ p.fecha | date:'d MMM y' }}</td>
                    <td>{{ etiquetaMetodo[p.metodo] }}@if (p.referencia) { <span style="color: var(--texto-tenue)"> ({{ p.referencia }})</span> }</td>
                    <td class="num"><strong [style.text-decoration]="p.estado === 'anulado' ? 'line-through' : 'none'" [style.color]="p.tipo === 'reembolso' ? 'var(--critico-texto)' : 'inherit'">{{ p.tipo === 'reembolso' ? '− ' : '' }}{{ p.monto | dinero }}</strong></td>
                    <td><span class="acciones" style="justify-content: flex-end">
                      <button type="button" class="btn-icono" (click)="reciboPdf(p)" title="Descargar recibo" [attr.aria-label]="'Descargar ' + p.numero"><app-icon name="pdf" [size]="17" /></button>
                      @if (p.estado === 'vigente' && authService.tieneRol(['admin'])) { <button type="button" class="btn-icono peligro" (click)="anulandoPago.set(p)" title="Anular pago" [attr.aria-label]="'Anular ' + p.numero"><app-icon name="papelera" [size]="17" /></button> }
                    </span></td>
                  </tr>
                }
              </tbody>
            </table></div>
          }
        </section>

        @if (reembolsando()) { <app-pago-modal modo="reembolso" [destino]="{ id: d._id, referencia: d.numero, contraparte: d.cliente.nombre, saldo: d.saldoAFavor ?? 0 }" (registrado)="alReembolsar($event)" (cerrar)="reembolsando.set(false)" /> }
        @if (registrando()) { <app-pago-modal modo="cobro" [destino]="{ id: d._id, referencia: d.numero, contraparte: d.cliente.nombre, saldo: d.saldo ?? 0 }" (registrado)="alPagar($event)" (cerrar)="registrando.set(false)" /> }
        @if (anulandoPago(); as ap) {
          <app-modal titulo="Anular pago" [descripcion]="ap.numero + ' · ' + (ap.monto | dinero)" (cerrar)="anulandoPago.set(null)">
            <div class="form-group"><label for="apd-motivo">Motivo</label><input id="apd-motivo" type="text" [ngModel]="motivoPago()" (ngModelChange)="motivoPago.set($event)" placeholder="Ej. Cheque devuelto por el banco" (keydown.enter)="anularPago()" /></div>
            @if (errorPago()) { <div class="error-alert" role="alert">{{ errorPago() }}</div> }
            <div pie>
              <button type="button" class="btn-secondary" (click)="anulandoPago.set(null)">Cancelar</button>
              <button type="button" class="btn-danger" style="min-height: 40px; font-size: 0.9rem" (click)="anularPago()" [disabled]="motivoPago().trim().length < 5 || guardando()">{{ guardando() ? 'Anulando…' : 'Anular pago' }}</button>
            </div>
          </app-modal>
        }
      }

      @if (anulando()) {
        <app-modal titulo="Anular documento" [descripcion]="textoAnular(d)" (cerrar)="anulando.set(false)">
          <div class="form-group">
            <label for="an-motivo">Motivo de la anulación</label>
            <input id="an-motivo" type="text" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)" placeholder="Ej. Error en los datos del cliente" (keydown.enter)="anular()" />
            <span class="ayuda">Mínimo 5 caracteres. Quedará registrado en el documento.</span>
          </div>
          @if (errorAnular()) { <div class="error-alert" role="alert">{{ errorAnular() }}</div> }
          <div pie>
            <button type="button" class="btn-secondary" (click)="anulando.set(false)">Cancelar</button>
            <button type="button" class="btn-danger" style="min-height: 40px; font-size: 0.9rem" (click)="anular()" [disabled]="motivo().trim().length < 5 || guardando()">{{ guardando() ? 'Anulando…' : 'Anular documento' }}</button>
          </div>
        </app-modal>
      }
    } @else {
      <div class="panel vacio" style="margin-top: 1rem">
        <span class="icono-vacio"><app-icon name="alerta" [size]="26" /></span>
        <strong>No encontramos este documento</strong>
        <a routerLink="/documentos" class="btn-secondary">Volver a la lista</a>
      </div>
    }
    }
  `,
  styles: [`
    .hoja { background: #fff; border: 1px solid var(--linea); border-radius: var(--radio); padding: 2rem 2.25rem; max-width: 900px; position: relative; overflow: hidden; }
    .hoja.anulada::after { content: 'ANULADA'; position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-24deg); font-family: var(--fuente-titulo); font-size: 6rem; font-weight: 800; color: rgba(179, 38, 30, 0.14); pointer-events: none; }
    .hoja-cabecera { display: flex; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding-bottom: 1.25rem; border-bottom: 3px solid var(--ambar); font-size: 0.88rem; color: var(--texto-suave); }
    .hoja-empresa { font-family: var(--fuente-titulo); font-size: 1.3rem; color: var(--tinta); }
    .hoja-numero { text-align: right; display: flex; flex-direction: column; }
    .hoja-numero span { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.04em; }
    .hoja-numero strong { font-family: var(--fuente-titulo); font-size: 1.8rem; color: var(--primario); }
    .hoja-partes { display: flex; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding: 1.25rem 0; font-size: 0.9rem; }
    .hoja-partes > div { display: flex; flex-direction: column; }
    .hoja-etiqueta { font-size: 0.78rem; color: var(--texto-suave); }
    .hoja-totales { display: grid; grid-template-columns: 1fr auto; gap: 0.35rem 2rem; margin: 1.25rem 0 0 auto; max-width: 340px; }
    .hoja-totales dt { color: var(--texto-suave); } .hoja-totales dd { margin: 0; text-align: right; }
    .hoja-totales .total { font-family: var(--fuente-titulo); font-size: 1.25rem; font-weight: 700; color: var(--tinta); padding-top: 0.5rem; border-top: 1px solid var(--linea-fuerte); }
    .hoja-notas { margin: 1.25rem 0 0; font-size: 0.9rem; }
    .hoja-legal { margin: 1.25rem 0 0; font-size: 0.75rem; color: var(--texto-tenue); }
  `]
})
export class DetalleDocumentoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private documentoService = inject(DocumentoService);
  private notificacion = inject(NotificacionService);
  private pdf = inject(DocumentosPdfService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);
  private carteraService = inject(CarteraService);
  private configService = inject(ConfiguracionService);
  authService = inject(AuthService);

  readonly etiquetaMetodo = ETIQUETA_METODO;
  pagos = signal<Pago[]>([]);
  registrando = signal(false);
  reembolsando = signal(false);
  anulandoPago = signal<Pago | null>(null);
  motivoPago = signal('');
  errorPago = signal('');
  doc = signal<DocumentoVenta | null>(null);
  cargando = signal(true);
  generando = signal(false);
  anulando = signal(false);
  motivo = signal('');
  errorAnular = signal('');
  guardando = signal(false);

  ngOnInit(): void {
    this.configService.obtener().subscribe({ error: () => {} });
    this.cargar();
    this.tiempoReal.alCambiar('documentos', 'pagos', 'cartera').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.documentoService.obtener(this.route.snapshot.paramMap.get('id')!).subscribe({
      next: (d) => { this.doc.set(d); this.cargando.set(false); if (d.tipo === 'factura') this.cargarPagos(d._id); },
      error: () => { this.doc.set(null); this.cargando.set(false); }
    });
  }

  /** Une las partes que existan (las plantillas de Angular no permiten usar Boolean directamente). */
  unir(partes: (string | undefined)[], separador = ', '): string {
    return partes.filter((p) => !!p).join(separador);
  }

  cargarPagos(id: string): void { this.carteraService.pagosDeDocumento(id).subscribe({ next: (p) => this.pagos.set(p), error: () => {} }); }
  chipPago(e?: string): string { return e === 'pagada' ? 'chip-ok' : e === 'parcial' ? 'chip-aviso' : e === 'acreditada' ? 'chip-neutro' : 'chip-info'; }
  etiquetaPago(e?: string): string { return e === 'pagada' ? 'Pagada' : e === 'parcial' ? 'Abonada' : e === 'acreditada' ? 'Acreditada' : 'Pendiente'; }
  puedeReembolsar(d: DocumentoVenta): boolean { return d.tipo === 'factura' && d.estado === 'emitida' && (d.saldoAFavor ?? 0) > 0 && this.authService.tieneRol(['admin', 'ventas']); }
  alReembolsar(p: Pago): void {
    this.reembolsando.set(false);
    this.notificacion.exito(`Reembolso registrado: ${p.numero}`);
    this.cargar();
  }
  puedeCobrar(d: DocumentoVenta): boolean { return d.tipo === 'factura' && d.estado === 'emitida' && (d.saldo ?? 0) > 0 && this.authService.tieneRol(['admin', 'ventas']); }
  textoAnular(d: DocumentoVenta): string {
    const pagado = d.pagado ?? 0;
    return `Se anulará ${d.numero}. Su número no se reutiliza.` + (pagado > 0 ? ` Sus pagos registrados (${formatearDinero(pagado)}) también se anularán.` : '');
  }

  alPagar(p: Pago): void {
    this.registrando.set(false);
    this.notificacion.exito(`Pago registrado: recibo ${p.numero}`);
    this.cargar();
  }

  async reciboPdf(p: Pago): Promise<void> {
    this.carteraService.obtenerPago(p._id).subscribe({
      next: async (completo) => { try { await this.pdf.recibo(completo, this.configService.actual()); } catch { this.notificacion.error('No se pudo generar el PDF'); } },
      error: () => this.notificacion.error('No se pudo obtener el recibo')
    });
  }

  anularPago(): void {
    const p = this.anulandoPago();
    if (!p || this.motivoPago().trim().length < 5) return;
    this.guardando.set(true);
    this.errorPago.set('');
    this.carteraService.anularPago(p._id, this.motivoPago().trim()).subscribe({
      next: () => { this.guardando.set(false); this.anulandoPago.set(null); this.motivoPago.set(''); this.notificacion.exito('Pago anulado'); this.cargar(); },
      error: (err) => { this.guardando.set(false); this.errorPago.set(err.error?.mensaje || 'No se pudo anular el pago'); }
    });
  }

  async descargar(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    this.generando.set(true);
    try { await this.pdf.documentoVenta(d); }
    catch { this.notificacion.error('No se pudo generar el PDF. Inténtalo de nuevo.'); }
    finally { this.generando.set(false); }
  }

  anular(): void {
    const d = this.doc();
    if (!d || this.motivo().trim().length < 5) return;
    this.guardando.set(true);
    this.errorAnular.set('');
    this.documentoService.anular(d._id, this.motivo().trim()).subscribe({
      next: () => { this.guardando.set(false); this.anulando.set(false); this.motivo.set(''); this.notificacion.exito('Documento anulado'); this.cargar(); },
      error: (err) => { this.guardando.set(false); this.errorAnular.set(err.error?.mensaje || 'No se pudo anular el documento'); }
    });
  }
}
