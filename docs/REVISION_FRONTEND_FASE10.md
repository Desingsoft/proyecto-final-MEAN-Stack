# Fase 10 — Accesibilidad, organización y experiencia móvil

## Cambios incorporados

- **Navegación por teclado:** enlace «Saltar al contenido principal», destino `main` enfocable, estado `aria-expanded` en el menú móvil y cierre mediante Escape.
- **Ventanas modales:** foco inicial en el primer control habilitado, ciclo de foco con Tab/Shift+Tab y restauración del foco al cerrar. Se mantiene la salida con Escape.
- **Formulario de usuarios:** atributos `aria-invalid` ligados a validaciones reactivas y aviso general de errores accesible con `role="alert"`.
- **Diseño:** estilos de enfoque, accesibilidad para movimiento reducido y contenedores adaptables en pantallas estrechas.

## Arquitectura conservada

Se mantiene `features/` para vistas de negocio, `core/` para servicios, modelos y protección de rutas, y `shared/` para elementos reutilizables. La autorización real sigue siendo responsabilidad del backend; ocultar botones no sustituye permisos HTTP.

## Riesgos y mejoras pendientes

- Revisar campo por campo los mensajes de error de todos los formularios, con `aria-describedby` específico.
- Evaluar contraste, orden de tabulación, tablas extensas, modales anidados y navegación con lectores de pantalla.
- Reducir CSS repetido heredado de fases anteriores tras una inspección visual para evitar regresiones.
- Evitar `any` en los contratos de servicios; tipar las respuestas y errores HTTP.
- Ejecutar al final la compilación Angular, pruebas funcionales, revisión móvil y pruebas de accesibilidad, conforme a la decisión del proyecto.

**Alcance:** estos son cambios de código; no se afirma que el frontend haya sido compilado o probado en navegador.
