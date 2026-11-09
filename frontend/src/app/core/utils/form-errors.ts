/** Utilidades compartidas para formularios reactivos Angular. */
import { AbstractControl, FormGroup } from '@angular/forms';

/** Mensajes de validación consistentes entre pantallas. */
export function mensajeControl(control: AbstractControl | null, etiqueta = 'Este campo'): string | null {
  if (!control || !control.invalid || !(control.touched || control.dirty)) return null;
  if (control.hasError('required')) return `${etiqueta} es obligatorio.`;
  if (control.hasError('email')) return 'Ingresa un correo electrónico válido.';
  if (control.hasError('minlength')) return `${etiqueta} requiere al menos ${control.getError('minlength').requiredLength} caracteres.`;
  if (control.hasError('maxlength')) return `${etiqueta} supera el máximo de ${control.getError('maxlength').requiredLength} caracteres.`;
  if (control.hasError('min')) return `${etiqueta} debe ser mayor o igual a ${control.getError('min').min}.`;
  if (control.hasError('max')) return `${etiqueta} debe ser menor o igual a ${control.getError('max').max}.`;
  if (control.hasError('pattern')) return `${etiqueta} tiene un formato inválido.`;
  return `${etiqueta} contiene un valor inválido.`;
}

/** Marca los campos como tocados para anunciar los errores tras enviar. */
export function mostrarErroresFormulario(formulario: FormGroup): boolean {
  if (formulario.valid) return false;
  formulario.markAllAsTouched();
  return true;
}
