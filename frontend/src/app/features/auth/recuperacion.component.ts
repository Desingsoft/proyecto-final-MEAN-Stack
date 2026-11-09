/**
 * Archivo: recuperacion.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
/** Pantalla pública para solicitar un enlace o restablecer la contraseña. */
@Component({selector:'app-recuperacion',standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<main class="recuperacion"><h1>Recuperar acceso</h1>
<p *ngIf="mensaje" role="status">{{mensaje}}</p>
<form (ngSubmit)="enviar()">
 <ng-container *ngIf="!token; else restablecer"><label>Correo electrónico <input type="email" name="email" autocomplete="email" [(ngModel)]="email" required></label><button type="submit">Solicitar enlace</button></ng-container>
 <ng-template #restablecer><label>Nueva contraseña (mínimo 12 caracteres) <input type="password" name="password" autocomplete="new-password" minlength="12" [(ngModel)]="password" required></label><button type="submit">Cambiar contraseña</button></ng-template>
</form><a routerLink="/login">Volver a iniciar sesión</a></main>
`,styles:[`.recuperacion{max-width:420px;margin:8vh auto;padding:1.5rem;border:1px solid #ddd;border-radius:12px}.recuperacion form,.recuperacion label{display:grid;gap:1rem}.recuperacion input,.recuperacion button{min-height:44px;padding:.65rem}.recuperacion a{display:block;margin-top:1rem}`]})
export class RecuperacionComponent {
 private http=inject(HttpClient); private route=inject(ActivatedRoute);
 email='';password='';mensaje='';token=this.route.snapshot.queryParamMap.get('token')||'';
 /** Solicita un correo o consume un token de un solo uso. */
 enviar(){const url=this.token?'restablecer':'recuperar';const body=this.token?{token:this.token,password:this.password}:{email:this.email};this.http.post<any>(environment.apiUrl+'/auth/'+url,body).subscribe({next:r=>this.mensaje=r.mensaje,error:e=>this.mensaje=e.error?.mensaje||'No fue posible completar la solicitud'});}
}
