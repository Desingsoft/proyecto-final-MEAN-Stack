# Requisitos frontend — Fase 9

## Arquitectura
Angular 18 con componentes standalone, rutas lazy-load, formularios reactivos, servicios HTTP tipados y controles de acceso por rol. El backend valida nuevamente toda entrada.

## Funcionalidades
- **Login**: se reutiliza el formulario y servicio JWT existentes; no se almacena la contraseña en el perfil.
- **Registro administrativo**: `/usuarios/nuevo` solicita nombre, correo, contraseña (mínimo 12 caracteres), fecha de nacimiento, sexo, ciudad y rol. La API `/api/auth/registro` exige sesión de administrador.
- **CRUD**: catálogo de productos existente permite alta, listado, edición y desactivación lógica, conservando el historial.
- **CARD de consulta**: desde el nombre del producto se accede a `/productos/ficha/:id`, que consume `GET /api/productos/:id` y muestra la ficha de solo lectura.
- **Edición de perfil de terceros**: el administrador puede actualizar datos demográficos desde la edición de usuarios.
- **Responsive**: controles táctiles, desplazamiento horizontal de tablas, formularios flexibles y foco visible.

## Privacidad y seguridad
La fecha de nacimiento y el sexo son datos personales. Deben tratarse bajo políticas de privacidad, acceso restringido, retención limitada y finalidad informada. La autenticación y autorización reales siempre las aplica Express.

## Organización
`features/` agrupa pantallas por dominio, `core/models` define contratos TypeScript, `core/services` contiene acceso a la API, `shared` agrupa componentes reutilizables. Los comentarios explican la intención y las reglas no obvias, evitando repetir literalmente cada instrucción.

## Validaciones diferidas
Por decisión del usuario se dejan para la fase final: compilación Angular, pruebas de interfaz, pruebas de API, accesibilidad automatizada y revisión visual en dispositivos.
