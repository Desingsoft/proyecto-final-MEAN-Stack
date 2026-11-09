/**
 * Archivo: avanzado.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Panel móvil de gestión avanzada: indicadores, bodegas, conteos, cotizaciones y auditoría. */
@Component({selector:'app-avanzado',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="advanced">
  <h1>Centro de gestión</h1>
  <p>Inventario avanzado, cotizaciones, alertas y trazabilidad.</p>
  <div class="advanced-kpis">
    <article><strong>{{ indicadores.productos || 0 }}</strong><span>Productos activos</span></article>
    <article><strong>{{ indicadores.pedidos || 0 }}</strong><span>Pedidos</span></article>
    <article><strong>{{ indicadores.stockBajo || 0 }}</strong><span>Alertas de stock</span></article>
    <article><strong>{{ indicadores.ventas || 0 | number:'1.0-0' }}</strong><span>Ventas registradas</span></article>
  </div>
  <nav class="advanced-tabs" aria-label="Secciones de gestión">
    <button *ngFor="let t of tabs" type="button" [attr.aria-pressed]="seccion===t" (click)="seccion=t">{{t}}</button>
  </nav>
  <p *ngIf="mensaje" role="status">{{mensaje}}</p>
  <section *ngIf="seccion==='Bodegas'">
    <h2>Bodegas</h2>
    <form (ngSubmit)="crearBodega()"><label>Nombre <input name="nombre" [(ngModel)]="nuevaBodega" required maxlength="100"></label><button type="submit">Agregar bodega</button></form>
    <ul><li *ngFor="let b of bodegas">{{b.nombre}} — {{b.direccion || 'Sin dirección'}}</li></ul>
  </section>
  <section *ngIf="seccion==='Conteo físico'">
    <h2>Registrar conteo físico</h2><p>Este registro ajusta el stock de la bodega y el stock total del producto.</p>
    <form (ngSubmit)="registrarConteo()">
      <label>Producto <select name="producto" [(ngModel)]="conteo.producto" required><option value="">Seleccionar</option><option *ngFor="let p of productos" [value]="p._id">{{p.nombre}} ({{p.sku}})</option></select></label>
      <label>Bodega <select name="bodega" [(ngModel)]="conteo.bodega" required><option value="">Seleccionar</option><option *ngFor="let b of bodegas" [value]="b._id">{{b.nombre}}</option></select></label>
      <label>Cantidad contada <input name="cantidad" type="number" min="0" step="1" [(ngModel)]="conteo.cantidadContada" required></label>
      <button type="submit">Guardar conteo</button>
    </form>
  </section>
  <section *ngIf="seccion==='Cotizaciones'"><h2>Cotizaciones</h2>
    <form (ngSubmit)="crearCotizacion()" aria-label="Nueva cotización">
      <label>Cliente <input name="clienteCot" [(ngModel)]="cotNueva.cliente" required maxlength="150"></label>
      <label>Producto <select name="productoCot" [(ngModel)]="cotNueva.producto" required><option value="">Seleccionar</option><option *ngFor="let p of productos" [value]="p._id">{{p.nombre}}</option></select></label>
      <label>Cantidad <input name="cantidadCot" type="number" min="1" step="1" [(ngModel)]="cotNueva.cantidad" required></label>
      <label>Descuento (%) <input name="descuentoCot" type="number" min="0" max="100" [(ngModel)]="cotNueva.descuento"></label>
      <button type="submit">Crear cotización</button>
    </form><p>Consulta y seguimiento de cotizaciones.</p><div class="advanced-scroll"><table><thead><tr><th>Cliente</th><th>Estado</th><th>Total</th><th>Acción</th></tr></thead><tbody><tr *ngFor="let c of cotizaciones"><td>{{c.cliente}}</td><td>{{c.estado}}</td><td>{{c.total | number:'1.2-2'}}</td><td><button *ngIf="c.estado==='aceptada'" (click)="convertir(c)">Crear pedido</button><button *ngIf="c.estado==='borrador'" (click)="aceptar(c)">Aceptar</button></td></tr></tbody></table></div></section>
  <section *ngIf="seccion==='Códigos de barras'">
    <h2>Consultar código de barras</h2><p>Compatible con lectores USB y Bluetooth que escriben como teclado.</p>
    <form (ngSubmit)="buscarCodigo()"><label>Código <input name="codigo" [(ngModel)]="codigo" autocomplete="off" required></label><button type="submit">Buscar producto</button></form>
    <p *ngIf="productoEscaneado">{{productoEscaneado.nombre}} — SKU {{productoEscaneado.sku}} — Stock {{productoEscaneado.stock}}</p>
  </section>
  <section *ngIf="seccion==='Alertas'"><h2>Productos bajo mínimo</h2><ul><li *ngFor="let p of alertas">{{p.nombre}}: {{p.stock}} disponibles (mínimo {{p.stockMinimo}})</li></ul></section>
  <section *ngIf="seccion==='Auditoría'"><h2>Actividad reciente</h2><button (click)="cargarAuditoria()">Consultar registros (administrador)</button><div class="advanced-scroll"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Resultado</th></tr></thead><tbody><tr *ngFor="let a of auditoria"><td>{{a.fecha | date:'short'}}</td><td>{{a.usuario?.nombre}}</td><td>{{a.metodo}} {{a.ruta}}</td><td>{{a.estado}}</td></tr></tbody></table></div></section>
</section>
`,styles:[`.advanced{max-width:1200px;margin:auto;padding:1rem}.advanced-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:1rem}.advanced-kpis article{padding:1.1rem;border:1px solid #d6dce4;border-radius:12px;background:var(--surface,#fff);display:grid;gap:.4rem}.advanced-kpis strong{font-size:1.7rem}.advanced-tabs{display:flex;gap:.5rem;overflow-x:auto;padding:1rem 0}.advanced-tabs button{white-space:nowrap;min-height:44px}.advanced form{display:flex;flex-wrap:wrap;gap:1rem;align-items:end}.advanced label{display:grid;gap:.4rem;flex:1 1 180px}.advanced input,.advanced select,.advanced button{min-height:44px;max-width:100%;padding:.6rem}.advanced-scroll{overflow-x:auto}.advanced table{width:100%;min-width:520px}.advanced td,.advanced th{padding:.6rem;text-align:left}@media(max-width:600px){.advanced{padding:.5rem}.advanced form{display:grid}.advanced-tabs{position:relative}}`]})
export class AvanzadoComponent implements OnInit {
  private http=inject(HttpClient);
  private api=environment.apiUrl+'/avanzado';
  tabs=['Bodegas','Conteo físico','Cotizaciones','Códigos de barras','Alertas','Auditoría'];
  seccion='Bodegas'; mensaje=''; nuevaBodega='';
  indicadores:any={}; bodegas:any[]=[]; productos:any[]=[]; cotizaciones:any[]=[]; alertas:any[]=[]; auditoria:any[]=[];
  conteo={producto:'',bodega:'',cantidadContada:0};
  cotNueva={cliente:'',producto:'',cantidad:1,descuento:0};
  codigo='';productoEscaneado:any=null;
  /** Busca por código exacto y muestra un error comprensible cuando no existe. */
  buscarCodigo(){this.productoEscaneado=null;this.http.get<any>(this.api+'/codigo-barras/'+encodeURIComponent(this.codigo.trim())).subscribe({next:p=>{this.productoEscaneado=p;this.mensaje='Producto encontrado'},error:e=>this.mensaje=e.error?.mensaje||'No se pudo buscar el código'});}
  /** Crea una cotización sencilla; el precio se toma del catálogo visible. */
  crearCotizacion(){const p=this.productos.find(x=>x._id===this.cotNueva.producto);if(!p||!this.cotNueva.cliente.trim()||!Number.isInteger(this.cotNueva.cantidad)||this.cotNueva.cantidad<1)return;
    const payload={cliente:this.cotNueva.cliente,items:[{producto:p._id,cantidad:this.cotNueva.cantidad,precioUnitario:p.precio}],descuentoPorcentaje:this.cotNueva.descuento};
    this.http.post(this.api+'/cotizaciones',payload).subscribe({next:()=>{this.mensaje='Cotización creada';this.recargar()},error:e=>this.mensaje=e.error?.mensaje||'No se pudo crear la cotización'});
  }
  /** Cambia una cotización de borrador a aceptada. */
  aceptar(c:any){this.http.patch(this.api+'/cotizaciones/'+c._id+'/estado',{estado:'aceptada'}).subscribe({next:()=>this.recargar(),error:e=>this.mensaje=e.error?.mensaje||'No se pudo aceptar'});}
  /** Solicita la creación de un pedido con validación de existencias en servidor. */
  convertir(c:any){this.http.post(this.api+'/cotizaciones/'+c._id+'/convertir',{}).subscribe({next:()=>{this.mensaje='Pedido creado';this.recargar()},error:e=>this.mensaje=e.error?.mensaje||'No se pudo convertir'});}

  /** Inicializa catálogos y estadísticas del panel. */
  ngOnInit(){this.recargar();}
  /** Consulta las colecciones sin detener el resto del panel si falla una solicitud. */
  recargar(){
    this.http.get<any>(this.api+'/indicadores').subscribe({next:v=>this.indicadores=v,error:()=>this.mensaje='No se pudieron cargar los indicadores'});
    this.http.get<any[]>(this.api+'/bodegas').subscribe(v=>this.bodegas=v);
    this.http.get<any[]>(environment.apiUrl+'/productos').subscribe({next:v=>this.productos=Array.isArray(v)?v:(v as any).productos||[],error:()=>{}});
    this.http.get<any[]>(this.api+'/cotizaciones').subscribe(v=>this.cotizaciones=v);
    this.http.get<any>(this.api+'/alertas').subscribe(v=>this.alertas=v.productos||[]);
  }
  /** Crea una ubicación nueva con los permisos que valide el backend. */
  crearBodega(){if(!this.nuevaBodega.trim())return;this.http.post(this.api+'/bodegas',{nombre:this.nuevaBodega.trim()}).subscribe({next:()=>{this.nuevaBodega='';this.mensaje='Bodega creada';this.recargar()},error:e=>this.mensaje=e.error?.mensaje||'No fue posible crear la bodega'});}
  /** Registra un conteo; el servidor aplica el ajuste dentro de una transacción. */
  registrarConteo(){this.http.post(this.api+'/conteos',this.conteo).subscribe({next:()=>{this.mensaje='Conteo registrado';this.recargar()},error:e=>this.mensaje=e.error?.mensaje||'No se pudo registrar el conteo'});}
  /** Muestra eventos de auditoría únicamente cuando el usuario tiene permiso. */
  cargarAuditoria(){this.http.get<any[]>(this.api+'/auditoria').subscribe({next:v=>this.auditoria=v,error:e=>this.mensaje=e.error?.mensaje||'Acceso denegado'});}
}
