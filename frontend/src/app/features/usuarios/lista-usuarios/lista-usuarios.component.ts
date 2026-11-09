/**
 * Archivo: lista-usuarios.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { TiempoRealService } from '../../../shared/services/tiempo-real.service';
import { DESCRIPCION_ROL, ETIQUETA_ROL, RolUsuario, Usuario } from '../../../core/models/usuario.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

type FiltroRol = '' | RolUsuario;
type FiltroEstado = 'todos' | 'activos' | 'inactivos';

const CLASE_ROL: Record<RolUsuario, string> = { admin: 'chip-primario', bodeguero: 'chip-aviso', ventas: 'chip-info' };

@Component({
  selector: 'app-lista-usuarios',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule, ReactiveFormsModule, IconComponent, ModalComponent],
  templateUrl: './lista-usuarios.component.html'
})
export class ListaUsuariosComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private notificacion = inject(NotificacionService);
  private confirmService = inject(ConfirmService);
  private tiempoReal = inject(TiempoRealService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  readonly roles: RolUsuario[] = ['admin', 'bodeguero', 'ventas'];
  readonly etiquetaRol = ETIQUETA_ROL;
  readonly descripcionRol = DESCRIPCION_ROL;
  readonly claseRol = CLASE_ROL;

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  error = signal(false);
  buscar = signal('');
  filtroRol = signal<FiltroRol>('');
  filtroEstado = signal<FiltroEstado>('todos');

  // Edición
  editando = signal<Usuario | null>(null);
  guardando = signal(false);
  errorModal = signal('');
  formEditar = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['ventas' as RolUsuario, Validators.required],
    fechaNacimiento: [''],
    sexo: ['prefiero_no_decir'],
    ciudad: ['', [Validators.maxLength(100)]]
  });

  // Contraseña
  restableciendo = signal<Usuario | null>(null);
  nuevaPassword = signal('');

  miId = computed(() => (this.authService.usuarioActual() as any)?._id ?? (this.authService.usuarioActual() as any)?.id ?? null);

  visibles = computed(() => {
    const texto = this.buscar().trim().toLowerCase();
    return this.usuarios().filter((u) => {
      const activo = u.activo !== false;
      return (
        (!texto || u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto)) &&
        (!this.filtroRol() || u.role === this.filtroRol()) &&
        (this.filtroEstado() === 'todos' || (this.filtroEstado() === 'activos' ? activo : !activo))
      );
    });
  });

  resumen = computed(() => {
    const lista = this.usuarios();
    return {
      total: lista.length,
      activos: lista.filter((u) => u.activo !== false).length,
      inactivos: lista.filter((u) => u.activo === false).length
    };
  });

  conteoRol = (rol: RolUsuario) => this.usuarios().filter((u) => u.role === rol).length;

  ngOnInit(): void {
    this.cargar();
    this.tiempoReal.alCambiar('usuarios').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cargar());
  }

  cargar(): void {
    this.usuarioService.listar().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.cargando.set(false);
        this.error.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      }
    });
  }

  esYo(usuario: Usuario): boolean {
    return !!usuario._id && usuario._id === this.miId();
  }

  iniciales(nombre: string): string {
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
  }

  // --- Activar / desactivar ---
  async alternarActivo(usuario: Usuario): Promise<void> {
    const activar = usuario.activo === false;
    if (!activar) {
      const ok = await this.confirmService.confirmar({
        titulo: 'Desactivar usuario',
        mensaje: `${usuario.nombre} ya no podrá iniciar sesión. Sus pedidos y movimientos se conservan, y puedes reactivarlo cuando quieras.`,
        confirmar: 'Desactivar',
        peligro: true
      });
      if (!ok) { this.cargar(); return; } // restablece el interruptor visual
    }

    this.usuarioService.actualizar(usuario._id!, { activo: activar }).subscribe({
      next: (actualizado) => {
        this.reemplazar(actualizado);
        this.notificacion.exito(activar ? `${usuario.nombre} fue reactivado` : `${usuario.nombre} fue desactivado`);
      },
      error: (err) => {
        this.notificacion.error(err.error?.mensaje || 'No se pudo cambiar el estado');
        this.cargar();
      }
    });
  }

  private reemplazar(actualizado: Usuario): void {
    this.usuarios.update((lista) => lista.map((u) => (u._id === actualizado._id ? { ...u, ...actualizado } : u)));
  }

  // --- Editar ---
  abrirEdicion(usuario: Usuario): void {
    this.errorModal.set('');
    this.formEditar.setValue({ nombre: usuario.nombre, email: usuario.email, role: usuario.role, fechaNacimiento: usuario.fechaNacimiento?.slice(0, 10) || '', sexo: usuario.sexo || 'prefiero_no_decir', ciudad: usuario.ciudad || '' });
    this.editando.set(usuario);
  }

  cerrarEdicion(): void {
    if (!this.guardando()) this.editando.set(null);
  }

  rolSeleccionado(): RolUsuario {
    return (this.formEditar.value.role as RolUsuario) ?? 'ventas';
  }

  guardarEdicion(): void {
    const usuario = this.editando();
    if (!usuario || this.formEditar.invalid) return;

    const { nombre, email, role, fechaNacimiento, sexo, ciudad } = this.formEditar.getRawValue();
    this.guardando.set(true);
    this.errorModal.set('');
    this.usuarioService.actualizar(usuario._id!, { nombre: nombre!, email: email!, role: role!, ...(fechaNacimiento ? { fechaNacimiento } : {}), ...(ciudad ? { ciudad } : {}), sexo: sexo as any }).subscribe({
      next: (actualizado) => {
        this.reemplazar(actualizado);
        this.guardando.set(false);
        this.editando.set(null);
        this.notificacion.exito('Cambios guardados');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorModal.set(err.error?.mensaje || 'No se pudieron guardar los cambios');
      }
    });
  }

  // --- Restablecer contraseña ---
  abrirPassword(usuario: Usuario): void {
    this.errorModal.set('');
    this.nuevaPassword.set('');
    this.restableciendo.set(usuario);
  }

  cerrarPassword(): void {
    if (!this.guardando()) this.restableciendo.set(null);
  }

  generarPassword(): void {
    const caracteres = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const valores = crypto.getRandomValues(new Uint32Array(10));
    this.nuevaPassword.set(Array.from(valores, (v) => caracteres[v % caracteres.length]).join(''));
  }

  async copiarPassword(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.nuevaPassword());
      this.notificacion.info('Contraseña copiada al portapapeles');
    } catch {
      this.notificacion.error('No se pudo copiar; selecciónala y cópiala manualmente');
    }
  }

  guardarPassword(): void {
    const usuario = this.restableciendo();
    if (!usuario || this.nuevaPassword().length < 6) return;

    this.guardando.set(true);
    this.errorModal.set('');
    this.usuarioService.restablecerPassword(usuario._id!, this.nuevaPassword()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.restableciendo.set(null);
        this.notificacion.exito(`Contraseña de ${usuario.nombre} restablecida`);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorModal.set(err.error?.mensaje || 'No se pudo restablecer la contraseña');
      }
    });
  }
}
