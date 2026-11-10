/**
 * Archivo: form-producto.component.ts
 * Propósito: Componente Angular: presenta interfaz y gestiona eventos del usuario.
 * Nota: las reglas críticas deben validarse también en el backend.
 */
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductoService } from '../../../core/services/producto.service';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { NotificacionService } from '../../../shared/services/notificacion.service';
import { Proveedor } from '../../../core/models/proveedor.model';
import { obtenerMensajeApi } from '../../../core/utils/api-error';
import { mostrarErroresFormulario, mensajeControl } from '../../../core/utils/form-errors';
import { Producto } from '../../../core/models/producto.model';

@Component({
  selector: 'app-form-producto',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './form-producto.component.html'
})
export class FormProductoComponent implements OnInit {
  private fb = inject(FormBuilder);

  productoId = signal<string | null>(null);
  esEdicion = signal(false);
  cargando = signal(false);
  errorMsg = signal('');
  proveedores = signal<Proveedor[]>([]);

  /** Formulario reactivo; los datos se validan de nuevo en el backend. */
  productoForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    sku: ['', [Validators.required, Validators.maxLength(80)]],
    categoria: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    costo: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [5, [Validators.required, Validators.min(0)]],
    proveedor: ['']
  });

  constructor(
    private productoService: ProductoService,
    private proveedorService: ProveedorService,
    private notificacionService: NotificacionService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.proveedorService.getTodos().subscribe({
      next: (proveedores) => this.proveedores.set(proveedores)
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productoId.set(id);
      this.esEdicion.set(true);
      this.cargarProducto(id);
    }
  }

  /** Recupera el producto que se está editando. */
  cargarProducto(id: string): void {
    this.cargando.set(true);
    this.productoService.getPorId(id).subscribe({
      next: (producto) => {
        this.productoForm.patchValue({
          ...producto,
          // el backend devuelve el proveedor poblado ({_id, nombre}); el <select> necesita solo el id
          proveedor: this.obtenerIdProveedor(producto.proveedor)
        });
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el producto');
        this.cargando.set(false);
      }
    });
  }

  /** Normaliza el proveedor poblado por MongoDB o recibido como identificador. */
  private obtenerIdProveedor(proveedor: Producto['proveedor']): string {
    if (typeof proveedor === 'string') return proveedor;
    return proveedor?._id || '';
  }

  /** Devuelve un mensaje reutilizable para los campos del formulario. */
  errorCampo(nombre: string, etiqueta: string): string | null {
    return mensajeControl(this.productoForm.get(nombre), etiqueta);
  }

  /** Crea o actualiza el producto sin enviar un proveedor vacío. */
  onSubmit(): void {
    if (mostrarErroresFormulario(this.productoForm)) return;

    this.cargando.set(true);
    const valores = this.productoForm.getRawValue();
    // Los controles admiten null; la API exige tipos concretos para el producto.
    const datos: Producto = {
      nombre: valores.nombre ?? '',
      sku: valores.sku ?? '',
      categoria: valores.categoria ?? '',
      precio: valores.precio ?? 0,
      costo: valores.costo ?? 0,
      stock: valores.stock ?? 0,
      stockMinimo: valores.stockMinimo ?? 0,
      proveedor: valores.proveedor || undefined
    };
    if (!datos.proveedor) delete datos.proveedor; // evita enviar '' como ObjectId

    const operacion = this.esEdicion()
      ? this.productoService.actualizar(this.productoId()!, datos)
      : this.productoService.crear(datos);

    operacion.subscribe({
      next: () => {
        this.notificacionService.exito(this.esEdicion() ? 'Producto actualizado' : 'Producto creado');
        this.router.navigate(['/productos']);
      },
      error: (err) => {
        this.errorMsg.set(obtenerMensajeApi(err, 'Error al guardar el producto'));
        this.cargando.set(false);
      }
    });
  }
}
