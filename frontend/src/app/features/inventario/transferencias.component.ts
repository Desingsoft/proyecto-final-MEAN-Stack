/** Transferencias de inventario entre bodegas autorizadas. El servidor vuelve a validar ambas sedes. */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService, BodegaTransferencia, TransferenciaRegistro } from '../../core/services/inventario.service';
import { ProductoService } from '../../core/services/producto.service';
import { Producto } from '../../core/models/producto.model';

@Component({ selector: 'app-transferencias', standalone: true, imports: [CommonModule, FormsModule], template: `
<section class="transferencias"><h1>Transferencias entre bodegas</h1>
<p>Seleccione el producto y dos bodegas diferentes. Solo aparecen bodegas autorizadas para su usuario.</p>
<p role="alert" *ngIf="error">{{error}}</p><p role="status" *ngIf="mensaje">{{mensaje}}</p>
<form (ngSubmit)="confirmar()">
<label>Producto <select name="producto" [(ngModel)]="producto" required><option value="">Seleccione</option><option *ngFor="let p of productos" [value]="p._id">{{p.nombre}}</option></select></label>
<label>Bodega origen <select name="origen" [(ngModel)]="origen" required><option value="">Seleccione</option><option *ngFor="let b of bodegas" [value]="b._id">{{b.nombre}}</option></select></label>
<label>Bodega destino <select name="destino" [(ngModel)]="destino" required><option value="">Seleccione</option><option *ngFor="let b of bodegas" [value]="b._id">{{b.nombre}}</option></select></label>
<label>Cantidad <input type="number" name="cantidad" [(ngModel)]="cantidad" min="1" step="1" required></label>
<label>Motivo <input name="motivo" [(ngModel)]="motivo" maxlength="200"></label>
<button type="submit" [disabled]="enviando || !producto || !origen || !destino || origen===destino || !cantidad || cantidad<1 || cantidad%1!==0">{{enviando ? 'Registrando...' : 'Confirmar transferencia'}}</button>
</form>
<h2>Últimas transferencias autorizadas</h2>
<button type="button" (click)="cargarHistorial()" [disabled]="consultando">Actualizar historial</button>
<p *ngIf="!historial.length && !consultando">No hay transferencias disponibles para las bodegas autorizadas.</p>
<ul><li *ngFor="let t of historial">{{t.createdAt | date:'short'}} — {{t.cantidad}} unidades — {{nombreBodega(t.origen)}} → {{nombreBodega(t.destino)}} — {{t.motivo}}</li></ul>
<nav aria-label="Paginación de transferencias" *ngIf="totalPaginas > 1">
<button type="button" (click)="cargarHistorial(pagina - 1)" [disabled]="consultando || pagina <= 1">Anterior</button>
<span> Página {{pagina}} de {{totalPaginas}} ({{totalTransferencias}} registros) </span>
<button type="button" (click)="cargarHistorial(pagina + 1)" [disabled]="consultando || pagina >= totalPaginas">Siguiente</button>
</nav>
</section>`, styles: [`.transferencias{max-width:640px;padding:1rem;margin:auto}label{display:block;margin:1rem 0}select,input{display:block;width:100%;padding:.6rem;min-height:44px}button{min-height:44px}`] })
export class TransferenciasComponent implements OnInit {
  private readonly inventario = inject(InventarioService);
  private readonly productosApi = inject(ProductoService);
  bodegas: BodegaTransferencia[] = []; productos: Producto[] = [];
  producto = ''; origen = ''; destino = ''; cantidad = 1; motivo = '';
  enviando = false; consultando = false; historial: TransferenciaRegistro[] = []; error = ''; mensaje = '';
  pagina = 1; totalPaginas = 0; totalTransferencias = 0;
  private clavePendiente = ''; private huellaPendiente = '';
  ngOnInit(): void {
    this.inventario.getBodegasAutorizadas().subscribe({next: x => this.bodegas = x, error: () => this.error = 'No fue posible consultar las bodegas'});
    this.cargarHistorial();
    this.productosApi.getTodos(1, '', {limite:500}).subscribe({next: x => this.productos = x.productos, error: () => this.error = 'No fue posible consultar productos'});
  }
  nombreBodega(id: string): string { return this.bodegas.find(b => b._id === id)?.nombre || 'Bodega'; }
  cargarHistorial(pagina = this.pagina): void {
    if (this.consultando || pagina < 1) return;
    this.consultando = true;
    this.inventario.getTransferencias(pagina).subscribe({
      next: x => { this.historial = x.transferencias; this.pagina = x.pagina; this.totalPaginas = x.paginas; this.totalTransferencias = x.total; this.consultando = false; },
      error: () => { this.consultando = false; this.error = 'No fue posible consultar el historial'; }
    });
  }
  confirmar(): void {
    if (this.enviando || !this.producto || !this.origen || !this.destino || this.origen === this.destino || !Number.isSafeInteger(this.cantidad) || this.cantidad <= 0) return;
    if (!confirm('¿Registrar la transferencia? Esta operación modifica las existencias.')) return;
    this.error = ''; this.mensaje = ''; this.enviando = true;
    const datos = {producto:this.producto, origen:this.origen, destino:this.destino, cantidad:this.cantidad, motivo:this.motivo};
    const huella = JSON.stringify(datos);
    // Una respuesta perdida no debe generar una segunda transferencia al reintentar.
    if (!this.clavePendiente || this.huellaPendiente !== huella) {
      this.clavePendiente = crypto.randomUUID(); this.huellaPendiente = huella;
    }
    this.inventario.transferir(datos, this.clavePendiente).subscribe({
      next: x => {this.enviando = false; this.mensaje = `Transferencia registrada: ${x.transferenciaId}`; this.clavePendiente = ''; this.huellaPendiente = ''; this.cantidad = 1; this.motivo = ''; this.cargarHistorial(1);},
      error: e => {this.enviando = false; this.error = e?.error?.mensaje || 'No fue posible transferir el inventario';}
    });
  }
}
