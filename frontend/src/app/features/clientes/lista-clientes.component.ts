/**
 * Archivo: lista-clientes.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../shared/services/notificacion.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { TiempoRealService } from '../../shared/services/tiempo-real.service';
import { Cliente } from '../../core/models/negocio.model';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ClienteFormModalComponent } from './cliente-form-modal.component';

@Component({
  selector: 'app-lista-clientes',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent, ClienteFormModalComponent],
  template: `
    <header class="page-header">
      <div>
        <h1>Clientes</h1>
        <p class="subtitulo">Tus clientes con sus datos de facturación y su historial de compras.</p>
      </div>
      <button type="button" class="btn-primary" (click)="editando.set({})"><app-icon name="mas" [size]="18" /> Nuevo cliente</button>
    </header>

    <section class="panel">
      <div class="barra-filtros">
        <label class="buscador">
          <span class="sr-only">Buscar clientes</span>
          <app-icon name="buscar" [size]="17" />
          <input type="search" placeholder="Buscar por nombre, documento, correo o teléfono" [ngModel]="buscar()" (ngModelChange)="busqueda$.next($event.trim())" />
        </label>
        <span class="espaciador"></span>
        <span class="nota" style="color: var(--texto-suave); font-size: 0.85rem">{{ total() }} clientes</span>
      </div>

      @if (cargando() && clientes().length === 0) {
        <div class="skeleton" style="height: 300px"></div>
      } @else if (clientes().length === 0) {
        <div class="vacio">
          <span class="icono-vacio"><app-icon name="usuarios" [size]="26" /></span>
          <strong>{{ buscar() ? 'No encontramos clientes' : 'Aún no tienes clientes' }}</strong>
          <p>{{ buscar() ? 'Prueba con otra búsqueda.' : 'Registra a tus clientes para facturarles más rápido y ver cuánto te compran.' }}</p>
          @if (!buscar()) { <button type="button" class="btn-primary" (click)="editando.set({})">Crear el primero</button> }
        </div>
      } @else {
        <div class="tabla-wrap" [style.opacity]="cargando() ? 0.55 : 1" style="transition: opacity 0.15s">
          <table>
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Ciudad</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              @for (c of clientes(); track c._id) {
                <tr>
                  <td>
                    <span class="celda-doble">
                      <a [routerLink]="['/clientes', c._id]" class="principal">{{ c.nombre }}</a>
                      <span class="secundaria">{{ c.documento ? c.tipoDocumento + ' ' + c.documento : 'Sin documento' }}</span>
                    </span>
                  </td>
                  <td>
                    <span class="celda-doble">
                      <span>{{ c.telefono || '—' }}</span>
                      <span class="secundaria">{{ c.email || '' }}</span>
                    </span>
                  </td>
                  <td>{{ c.ciudad || '—' }}</td>
                  <td>
                    <span class="acciones" style="justify-content: flex-end">
                      <a [routerLink]="['/clientes', c._id]" class="btn-icono" title="Ver ficha" [attr.aria-label]="'Ver ficha de ' + c.nombre"><app-icon name="ojo" [size]="17" /></a>
                      <button type="button" class="btn-icono" (click)="editando.set(c)" title="Editar" [attr.aria-label]="'Editar ' + c.nombre"><app-icon name="editar" [size]="17" /></button>
                      @if (authService.tieneRol(['admin'])) {
                        <button type="button" class="btn-icono peligro" (click)="eliminar(c)" title="Eliminar" [attr.aria-label]="'Eliminar ' + c.nombre"><app-icon name="papelera" [size]="17" /></button>
                      }
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginacion">
          <button type="button" (click)="cambiarPagina(pagina() - 1)" [disabled]="pagina() === 1">Anterior</button>
          <span>Página {{ pagina() }} de {{ paginas() }}</span>
          <button type="button" (click)="cambiarPagina(pagina() + 1)" [disabled]="pagina() === paginas()">Siguiente</button>
        </div>
      }
    </section>

    @if (editando(); as c) {
      <app-cliente-form-modal [cliente]="c._id ? c : null" (guardado)="alGuardar($event)" (cerrar)="editando.set(null)" />
    }
  `
})
export class ListaClientesComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private notificacion = inject(NotificacionService);
  private confirmService = inject(ConfirmService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);
  authService = inject(AuthService);

  clientes = signal<Cliente[]>([]);
  total = signal(0);
  pagina = signal(1);
  paginas = signal(1);
  buscar = signal('');
  cargando = signal(true);
  editando = signal<Partial<Cliente> | null>(null);
  busqueda$ = new Subject<string>();

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((t) => {
      this.buscar.set(t);
      this.pagina.set(1);
      this.cargar();
    });
    this.tiempoReal.alCambiar('clientes').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
    this.cargar();
  }

  cargar(): void {
    this.clienteService.listar(this.pagina(), this.buscar()).subscribe({
      next: (r) => { this.clientes.set(r.clientes); this.total.set(r.total); this.paginas.set(Math.max(r.paginas, 1)); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  cambiarPagina(p: number): void { if (p >= 1 && p <= this.paginas()) { this.pagina.set(p); this.cargar(); } }

  alGuardar(cliente: Cliente): void {
    this.notificacion.exito(this.editando()?._id ? 'Cliente actualizado' : `Cliente "${cliente.nombre}" creado`);
    this.editando.set(null);
    this.cargar();
  }

  async eliminar(c: Cliente): Promise<void> {
    const ok = await this.confirmService.confirmar({
      titulo: 'Eliminar cliente',
      mensaje: `"${c.nombre}" dejará de aparecer en la lista. Sus pedidos y documentos se conservan.`,
      confirmar: 'Eliminar', peligro: true
    });
    if (!ok) return;
    this.clienteService.eliminar(c._id!).subscribe({
      next: () => { this.notificacion.exito('Cliente eliminado'); this.cargar(); },
      error: (err) => this.notificacion.error(err.error?.mensaje || 'No se pudo eliminar el cliente')
    });
  }
}
