# Actualización del acceso y registro — Bootcamp

## Diseño
- Login en dos columnas con jerarquía visual, fondo de bodega estilizado, título y subtítulo por encima de la ilustración mediante `z-index` y `isolation`.
- Formulario de acceso y pestaña «Crear usuario»; diseño adaptable a móvil.
- Diseño de referencia generado aparte; interfaz implementada con HTML/CSS accesibles, no como imagen estática.

## Registro público
- `POST /api/auth/registro-publico` permite únicamente `ventas` y `bodeguero`.
- `admin` se crea únicamente desde la ruta protegida `/api/auth/registro` con token JWT y rol admin.
- Requiere nombre, email válido, fecha de nacimiento real, edad 2–120 coherente con la fecha, género, contraseña de 12–128 caracteres con mayúscula, minúscula, número y símbolo.
- Se aplica Express Validator en servidor y validación adicional en el formulario.
- Password se almacena con hash bcrypt mediante el middleware Mongoose existente.

## Instalación
1. Respalda tu proyecto local y el `.env` privado.
2. Sustituye el código por esta versión, conservando tu `.env` local.
3. Ejecuta `cd backend && npm install` y `cd frontend && npm install`.
4. En `frontend`, ejecuta `npm start`. En `backend`, inicia tu servidor como de costumbre.
5. Prueba registro `ventas`, registro `bodeguero`, login con ambos y rechazo de contraseña sin símbolo, correo inválido, edad 0 y rol admin por API.

## Limitaciones y seguridad
- No se pudo ejecutar una compilación Angular ni pruebas de integración con MongoDB en este entorno; se verificó sintaxis JS.
- Registro público crea cuentas operativas directamente; para producción conviene aprobación por administrador o invitación por correo, rate limit distribuido, CAPTCHA y verificación de email.
- No subas `.env` ni credenciales a GitHub.
