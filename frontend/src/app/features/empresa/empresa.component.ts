/** Panel administrativo: consume endpoints protegidos; no sustituye autorización del backend. */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';

interface FilaImportacion { sku:string; nombre:string; precio:number; costo:number; categoria?:string; stockMinimo?:number; }
interface ResultadoImportacion { total:number; errores:{fila?:number;sku?:string;motivo:string}[]; validas:number; puedeConfirmar:boolean; }
interface CompraPendiente { orden:string; producto:string; sku:string|null; nombre:string|null; cantidad:number; fechaEsperada:string|null; diasEntrega:number; clasificacion:string; }
interface ReporteCompras { sucursal:string; pagina:number; paginas:number; total:number; filas:CompraPendiente[]; nota:string; }
interface Cierre { _id: string; fecha: string; diferencia: number; efectivoDeclarado: number; }
interface Aprobacion { _id: string; estado: string; monto: number; motivo?: string; }
interface Sucursal { _id: string; codigo: string; nombre: string; direccion?: string; }
interface UsuarioSede { _id:string; nombre:string; email:string; sucursales:string[]; }
interface BodegaSede { _id:string; nombre:string; sucursal?:string; }
interface Auditoria { _id: string; fecha: string; metodo?: string; ruta?: string; motivo?: string; }
@Component({selector:'app-empresa',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="empresa"><h1>Administración empresarial</h1><p>Consultas y decisiones administrativas. Los datos proceden de la API.</p>
<p *ngIf="error" role="alert">{{error}}</p><p *ngIf="mensaje" role="status">{{mensaje}}</p>
<div class="bloques">
<article><h2>Cierres de caja</h2><button (click)="cargar()">Actualizar</button><ul><li *ngFor="let c of cierres">{{c.fecha}} — Diferencia: {{c.diferencia | number:'1.2-2'}}</li></ul></article>
<article><h2>Aprobaciones de compras</h2><ul><li *ngFor="let a of aprobaciones">{{a.estado}} — {{a.monto | number:'1.2-2'}}
<button *ngIf="a.estado==='pendiente'" (click)="decidir(a,'aprobada')">Aprobar</button>
<button *ngIf="a.estado==='pendiente'" (click)="decidir(a,'rechazada')">Rechazar</button></li></ul></article>
<article><h2>Sucursales</h2><ul><li *ngFor="let s of sucursales">{{s.codigo}} — {{s.nombre}}</li></ul>
<form (ngSubmit)="crearSucursal()"><label>Código <input name="codigo" [(ngModel)]="codigo" required maxlength="20"></label>
<label>Nombre <input name="nombre" [(ngModel)]="nombre" required maxlength="100"></label><button [disabled]="!codigo.trim()||!nombre.trim()">Crear sede</button></form></article>
<article><h2>Asignación de usuarios</h2><button (click)="cargarAsignaciones()">Actualizar asignaciones</button>
<div *ngFor="let u of usuariosSede"><strong>{{u.nombre}}</strong> ({{u.email}})
<label>Sucursales (selección múltiple)<select multiple [ngModel]="u.sucursales" (ngModelChange)="u.sucursales=$event" [name]="'u'+u._id">
<option *ngFor="let s of sucursales" [value]="s._id">{{s.nombre}}</option></select></label>
<button (click)="guardarUsuario(u)">Guardar asignación</button></div></article>
<article><h2>Asignación de bodegas</h2><div *ngFor="let b of bodegasSede"><strong>{{b.nombre}}</strong>
<select [(ngModel)]="b.sucursal" [name]="'b'+b._id"><option value="">Seleccionar sede</option><option *ngFor="let s of sucursales" [value]="s._id">{{s.nombre}}</option></select>
<button [disabled]="!b.sucursal" (click)="guardarBodega(b)">Guardar bodega</button></div></article>
<article><h2>Importación de productos desde Excel</h2>
<p>Solo se crean productos nuevos. El stock inicial siempre es cero; las existencias se ingresan desde inventario.</p>
<label>Archivo .xlsx o .xls <input type="file" accept=".xlsx,.xls" (change)="leerExcel($event)" [disabled]="importando"></label>
<p>Columnas obligatorias: sku, nombre, precio, costo. Opcionales: categoria, stockMinimo.</p>
<p *ngIf="filasExcel.length">{{filasExcel.length}} filas preparadas. Se mostrarán como máximo 200 por lote.</p>
<button type="button" (click)="previsualizarImportacion()" [disabled]="!filasExcel.length||importando">Validar en servidor</button>
<div *ngIf="resultadoImportacion"><p>Válidas: {{resultadoImportacion.validas}} / {{resultadoImportacion.total}}</p>
<ul><li *ngFor="let e of resultadoImportacion.errores">Fila {{e.fila || '-'}} {{e.sku || ''}}: {{e.motivo}}</li></ul>
<button type="button" (click)="confirmarImportacion()" [disabled]="!resultadoImportacion.puedeConfirmar||importando">Confirmar importación</button></div>
</article>
<article><h2>Reposición por sucursal</h2>
<label>Sede <select [(ngModel)]="sedeReposicion" name="sedeReposicion"><option value="">Seleccionar</option><option *ngFor="let s of sucursales" [value]="s._id">{{s.nombre}}</option></select></label>
<label>Días de historial <input type="number" min="7" max="365" [(ngModel)]="diasReposicion" name="diasReposicion"></label>
<label>Plazo estimado (días) <input type="number" min="1" max="180" [(ngModel)]="plazoReposicion" name="plazoReposicion"></label>
<button type="button" (click)="cargarReposicion()" [disabled]="!sedeReposicion">Calcular</button>
<p *ngIf="reposicion && sedeResultadoReposicion === sedeReposicion">{{reposicion.nota}}</p>
<p *ngIf="reposicion && sedeResultadoReposicion === sedeReposicion">Productos a reponer: {{reposicion.resumen.productosPorReponer}} · Unidades sugeridas: {{reposicion.resumen.unidadesSugeridas}} · Sin demanda histórica: {{reposicion.resumen.productosSinDemanda}} · Para revisar: {{reposicion.resumen.productosPorRevisar}}</p>
<button type="button" *ngIf="reposicion && sedeResultadoReposicion === sedeReposicion" (click)="exportarReposicionCSV()">Exportar reposición CSV</button>
<div *ngIf="reposicion && sedeResultadoReposicion === sedeReposicion" class="tabla-reposicion"><table><thead><tr><th>SKU</th><th>Stock sede</th><th>Salidas</th><th>Entrega (días)</th><th>En camino</th><th>Atrasado</th><th>Sin fecha</th><th>Fuera de plazo</th><th>Punto pedido</th><th>Sugerido</th><th>Calidad estimación</th></tr></thead><tbody>
<tr *ngFor="let f of reposicion.filas"><td>{{f.sku}}</td><td>{{f.stockSucursal}}</td><td>{{f.salidasPeriodo}}</td><td>{{f.diasEntrega}}</td><td>{{f.enCamino}}</td><td>{{f.enCaminoVencido || 0}}</td><td>{{f.enCaminoSinFecha || 0}}</td><td>{{f.enCaminoFueraPlazo || 0}}</td><td>{{f.puntoPedido}}</td><td>{{f.cantidadSugerida}}</td><td>{{f.calidadEstimacion}}</td></tr>
</tbody></table></div></article>
<article><h2>Seguimiento de compras pendientes</h2>
<p>Consulta las compras enviadas y parcialmente recibidas de la sede seleccionada para reposición.</p>
<button type="button" (click)="cargarCompras(1)" [disabled]="!sedeReposicion">Consultar compras</button>
<div *ngIf="compras && sedeResultadoCompras===sedeReposicion">
<p>Órdenes abiertas: {{compras.total}} · Página {{compras.pagina}} de {{compras.paginas || 1}}</p>
<p>{{compras.nota}}</p>
<button type="button" (click)="exportarComprasCSV()" [disabled]="!compras.filas.length">Exportar página CSV</button>
<div class="tabla-reposicion"><table><thead><tr><th>SKU</th><th>Producto</th><th>Pendiente</th><th>Entrega esperada</th><th>Clasificación</th></tr></thead><tbody>
<tr *ngFor="let f of compras.filas"><td>{{f.sku || '-'}}</td><td>{{f.nombre || '-'}}</td><td>{{f.cantidad}}</td><td>{{f.fechaEsperada | date:'yyyy-MM-dd'}}</td><td>{{f.clasificacion}}</td></tr>
</tbody></table></div>
<button type="button" (click)="cargarCompras(compras.pagina-1)" [disabled]="compras.pagina<=1">Anterior</button>
<button type="button" (click)="cargarCompras(compras.pagina+1)" [disabled]="compras.pagina>=compras.paginas">Siguiente</button>
</div></article>
<article><h2>Auditoría</h2><ul><li *ngFor="let a of eventos">{{a.fecha | date:'short'}} — {{a.metodo}} {{a.ruta}} {{a.motivo}}</li></ul></article>
</div></section>`,styles:[`.empresa{padding:1rem;max-width:1100px;margin:auto}.bloques{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:1rem}article{border:1px solid #ccc;border-radius:10px;padding:1rem;min-width:0}li{margin:.6rem 0;overflow-wrap:anywhere}button,input{min-height:44px;margin:.2rem}label{display:block}`]})
export class EmpresaComponent implements OnInit {
 private readonly http=inject(HttpClient);private readonly api=`${environment.apiUrl}/empresa`;
 cierres:Cierre[]=[];aprobaciones:Aprobacion[]=[];sucursales:Sucursal[]=[];eventos:Auditoria[]=[];
 usuariosSede:UsuarioSede[]=[];bodegasSede:BodegaSede[]=[];
 codigo='';nombre='';error='';mensaje='';
 private solicitudReposicion=0; sedeResultadoReposicion='';
 private solicitudCompras=0; sedeResultadoCompras=''; compras:ReporteCompras|null=null; private parametrosCompras='';
 sedeReposicion='';diasReposicion=90;plazoReposicion=7;reposicion:{nota:string;resumen:{productosPorReponer:number;unidadesSugeridas:number;productosSinDemanda:number;productosPorRevisar:number};filas:Array<{sku:string;stockSucursal:number;salidasPeriodo:number;diasEntrega:number;enCamino:number;enCaminoVencido?:number;enCaminoSinFecha?:number;enCaminoFueraPlazo?:number;puntoPedido:number;cantidadSugerida:number;calidadEstimacion:string}>}|null=null;
 filasExcel:FilaImportacion[]=[];resultadoImportacion:ResultadoImportacion|null=null;importando=false;
 ngOnInit():void{this.cargar();this.cargarAsignaciones();}
 cargar():void{
  this.http.get<Cierre[]>(`${this.api}/caja/cierres`).subscribe({next:x=>this.cierres=x,error:()=>this.error='No se pudieron consultar los cierres'});
  this.http.get<Aprobacion[]>(`${this.api}/compras/aprobaciones`).subscribe({next:x=>this.aprobaciones=x,error:()=>this.error='No se pudieron consultar las aprobaciones'});
  this.http.get<Sucursal[]>(`${this.api}/sucursales`).subscribe({next:x=>this.sucursales=x,error:()=>this.error='No se pudieron consultar las sucursales'});
  this.http.get<{registros:Auditoria[]}>(`${this.api}/auditoria`).subscribe({next:x=>this.eventos=x.registros,error:()=>this.error='No se pudo consultar la auditoría'});
 }
 decidir(a:Aprobacion,estado:'aprobada'|'rechazada'):void{
  if(!confirm(`¿Confirmar decisión: ${estado}?`))return;
  this.http.patch(`${this.api}/compras/aprobaciones/${a._id}`,{estado}).subscribe({next:()=>{this.mensaje='Decisión registrada';this.cargar();},error:()=>this.error='No se pudo registrar la decisión'});
 }
 crearSucursal():void{
  this.http.post(`${this.api}/sucursales`,{codigo:this.codigo.trim(),nombre:this.nombre.trim()}).subscribe({next:()=>{this.mensaje='Sucursal creada';this.codigo='';this.nombre='';this.cargar();},error:()=>this.error='No se pudo crear la sucursal'});
 }
 cargarAsignaciones():void{
  this.http.get<UsuarioSede[]>(`${this.api}/sucursales/asignaciones/usuarios`).subscribe({next:x=>this.usuariosSede=x.map(u=>({...u,sucursales:(u.sucursales||[]).map(String)})),error:()=>this.error='No se pudieron cargar usuarios'});
  this.http.get<BodegaSede[]>(`${this.api}/sucursales/asignaciones/bodegas`).subscribe({next:x=>this.bodegasSede=x,error:()=>this.error='No se pudieron cargar bodegas'});
 }
 cargarCompras(pagina:number):void{
  this.error='';this.compras=null;this.sedeResultadoCompras='';this.parametrosCompras='';
  const solicitud=++this.solicitudCompras;
  if(!this.sedeReposicion||!Number.isSafeInteger(pagina)||pagina<1)return;
  const sede=this.sedeReposicion;
  const plazo=String(this.plazoReposicion);
  this.http.get<ReporteCompras>(`${this.api}/sucursales/${sede}/compras-pendientes`,
    {params:{pagina:String(pagina),limite:'20',plazo}}).subscribe({
    next:r=>{if(solicitud===this.solicitudCompras&&sede===this.sedeReposicion){this.compras=r;this.sedeResultadoCompras=sede;this.parametrosCompras=plazo;}},
    error:e=>{if(solicitud===this.solicitudCompras)this.error=e?.error?.mensaje||'No se pudieron consultar las compras pendientes';}
  });
 }
 /** Exporta solo la página recibida de la API y evita fórmulas CSV. */
 exportarComprasCSV():void{
  if(!this.compras||!this.sedeResultadoCompras||this.sedeResultadoCompras!==this.sedeReposicion||this.parametrosCompras!==String(this.plazoReposicion))return;
  const columnas=['orden','sku','nombre','cantidad','fechaEsperada','diasEntrega','clasificacion'] as const;
  const celda=(valor:unknown):string=>{
   const texto=String(valor??'');
   return '"'+(/^[\s]*[=+@-]/.test(texto)?"'":'')+texto.replace(/"/g,'""')+'"';
  };
  const csv='\uFEFF'+columnas.join(',')+'\r\n'+this.compras.filas.map(f=>columnas.map(c=>celda(f[c])).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const enlace=document.createElement('a');enlace.href=url;
  enlace.download=`compras-pendientes-${this.sedeResultadoCompras}-pagina-${this.compras.pagina}.csv`;
  enlace.click();URL.revokeObjectURL(url);
 }
 cargarReposicion():void{
  this.error='';this.reposicion=null;this.sedeResultadoReposicion='';
  const solicitud=++this.solicitudReposicion;
  if(!this.sedeReposicion)return;
  const sedeConsultada=this.sedeReposicion;
  const params={dias:String(this.diasReposicion),plazo:String(this.plazoReposicion)};
  this.http.get<{nota:string;resumen:{productosPorReponer:number;unidadesSugeridas:number;productosSinDemanda:number;productosPorRevisar:number};filas:Array<{sku:string;stockSucursal:number;salidasPeriodo:number;diasEntrega:number;enCamino:number;enCaminoVencido?:number;enCaminoSinFecha?:number;enCaminoFueraPlazo?:number;puntoPedido:number;cantidadSugerida:number;calidadEstimacion:string}>}>(`${this.api}/sucursales/${sedeConsultada}/reposicion`,{params}).subscribe({
   next:r=>{if(solicitud===this.solicitudReposicion&&sedeConsultada===this.sedeReposicion){this.reposicion=r;this.sedeResultadoReposicion=sedeConsultada;}},
   error:e=>{if(solicitud===this.solicitudReposicion)this.error=e?.error?.mensaje||'No se pudo calcular la reposición de la sede';}
  });
 }
 /** Exporta exclusivamente las filas ya autorizadas por el servidor para la sede seleccionada. */
 exportarReposicionCSV():void{
  if(!this.reposicion||!this.sedeResultadoReposicion||this.sedeResultadoReposicion!==this.sedeReposicion)return;
  const campos=['sku','stockSucursal','salidasPeriodo','diasEntrega','enCamino','enCaminoVencido','enCaminoSinFecha','enCaminoFueraPlazo','puntoPedido','cantidadSugerida','calidadEstimacion'] as const;
  const celda=(valor:unknown):string=>{
   const texto=String(valor??'');
   // Neutralizar fórmulas al abrir el CSV en hojas de cálculo.
   return '"'+(/^[\s]*[=+@-]/.test(texto)?"'":'')+texto.replace(/"/g,'""')+'"';
  };
  const csv='\uFEFF'+campos.join(',')+'\r\n'+this.reposicion.filas.map(f=>campos.map(c=>celda(f[c])).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const enlace=document.createElement('a');enlace.href=url;enlace.download='reposicion-sucursal-'+this.sedeResultadoReposicion+'.csv';
  enlace.click();URL.revokeObjectURL(url);
 }
 guardarUsuario(u:UsuarioSede):void{
  this.http.patch(`${this.api}/sucursales/asignaciones/usuarios/${u._id}`,{sucursales:u.sucursales}).subscribe({next:()=>this.mensaje='Asignación de usuario guardada',error:()=>this.error='No se pudo guardar la asignación'});
 }
 guardarBodega(b:BodegaSede):void{
  this.http.patch(`${this.api}/sucursales/asignaciones/bodegas/${b._id}`,{sucursal:b.sucursal}).subscribe({next:()=>this.mensaje='Bodega asignada',error:()=>this.error='No se pudo asignar la bodega (verifique existencias)'});
 }

 /** La lectura se realiza localmente: el archivo Excel nunca se envía al servidor. */
 async leerExcel(event:Event):Promise<void>{
  this.filasExcel=[];this.resultadoImportacion=null;this.error='';this.mensaje='';
  const input=event.target as HTMLInputElement;
  const archivo=input.files?.[0];
  if(!archivo)return;
  if(!/\.(xlsx|xls)$/i.test(archivo.name)||archivo.size>2*1024*1024){this.error='Seleccione un Excel de máximo 2 MB';return;}
  this.importando=true;
  try{
   const libro=XLSX.read(await archivo.arrayBuffer(),{type:'array',cellDates:false});
   const hoja=libro.Sheets[libro.SheetNames[0]];
   if(!hoja)throw new Error('El archivo no contiene hojas');
   const filas=XLSX.utils.sheet_to_json<Record<string,unknown>>(hoja,{defval:null,raw:true});
   if(filas.length<1||filas.length>200)throw new Error('El lote debe contener entre 1 y 200 productos');
   const columnas=['sku','nombre','precio','costo','categoria','stockMinimo'];
   const cabeceras=Object.keys(filas[0]);
   if(cabeceras.some(k=>!columnas.includes(k))||['sku','nombre','precio','costo'].some(k=>!cabeceras.includes(k)))
    throw new Error('Encabezados inválidos: sku, nombre, precio, costo, categoria, stockMinimo');
   const numero=(valor:unknown,campo:string,fila:number):number=>{
    if(typeof valor==='number'&&Number.isFinite(valor))return valor;
    if(typeof valor==='string'&&/^\d+(?:\.\d+)?$/.test(valor.trim()))return Number(valor.trim());
    throw new Error(`Fila ${fila}: ${campo} debe ser numérico, sin separadores de miles`);
   };
   this.filasExcel=filas.map((f,i)=>{
    const fila=i+2;
    const salida:FilaImportacion={sku:String(f['sku']??'').trim().toUpperCase(),nombre:String(f['nombre']??'').trim(),
     precio:numero(f['precio'],'precio',fila),costo:numero(f['costo'],'costo',fila)};
    if(f['categoria']!==null&&f['categoria']!==undefined)salida.categoria=String(f['categoria']);
    if(f['stockMinimo']!==null&&f['stockMinimo']!==undefined)salida.stockMinimo=numero(f['stockMinimo'],'stockMinimo',fila);
    return salida;
   });
   this.mensaje='Archivo leído. Valide el lote antes de confirmar.';
  }catch(e){this.error=e instanceof Error?e.message:'No se pudo leer el Excel';}
  finally{this.importando=false;}
 }
 previsualizarImportacion():void{
  if(!this.filasExcel.length)return;
  this.importando=true;this.error='';this.resultadoImportacion=null;
  this.http.post<ResultadoImportacion>(`${this.api}/importar/productos/previsualizar`,{filas:this.filasExcel}).subscribe({
   next:r=>{this.resultadoImportacion=r;this.importando=false;},
   error:()=>{this.error='Error al validar el lote en el servidor';this.importando=false;}
  });
 }
 confirmarImportacion():void{
  if(!this.resultadoImportacion?.puedeConfirmar||!this.filasExcel.length||this.importando)return;
  if(!confirm(`¿Importar ${this.filasExcel.length} productos nuevos?`))return;
  this.importando=true;this.error='';
  this.http.post<{creados:number}>(`${this.api}/importar/productos/confirmar`,{filas:this.filasExcel}).subscribe({
   next:r=>{this.mensaje=`Se importaron ${r.creados} productos`;this.filasExcel=[];this.resultadoImportacion=null;this.importando=false;},
   error:e=>{this.error=e?.error?.mensaje||'No se pudo confirmar el lote; revise SKU duplicados';this.resultadoImportacion=null;this.importando=false;}
  });
 }

}
