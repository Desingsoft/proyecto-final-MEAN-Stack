# Correcciones de Angular para la sustentación del bootcamp

Se trabajó sobre el código incluido en el RAR entregado por el usuario.

## Errores de las capturas corregidos

1. Propiedades privadas leídas por plantillas: `clavePendiente` en PagoModalComponent, `datosPendientes` en DevolucionFormModalComponent y `sedeResultadoReposicion` en EmpresaComponent ahora son accesibles desde la vista. No se modifica la lógica de idempotencia.
2. Formulario de productos: el resultado de `getRawValue()` se normaliza a los tipos del modelo `Producto`, evitando `null` en campos de texto y números. El proveedor vacío se omite.
3. Tarjeta de producto: se sustituye el `@else if (producto(); as p)` inválido por `@else { @if (producto(); as p) { ... } }`, conservando el diseño y consulta HTTP.
4. Reposición: la API requiere `bodega`. Ahora se consultan bodegas autorizadas, se selecciona una y se envía su ID en el movimiento; se bloquea el registro sin bodega y se muestra error si no pueden cargarse.

## Validación y limitaciones

Se comprobó la presencia de los cambios en los archivos. **No se ha conseguido compilar Angular en este entorno**: `npm ci` no terminó por problemas de instalación de dependencias. El código debe verificarse en el equipo del usuario, donde npm ya instaló dependencias. Pueden aparecer otros errores que no figuran en las cinco capturas.

## En Windows (PowerShell)

1. Haz copia de seguridad de la carpeta original.
2. Sustituye los archivos del proyecto por los de este ZIP, sin sobrescribir tu `backend/.env`.
3. Abre una terminal en `frontend` y ejecuta `npm run build`.
4. Si compila, ejecuta `npm start` y abre `http://localhost:4200`.
5. Si aparece otro error, comparte el texto de la terminal para corregirlo.

No subas `.env`, contraseñas ni `node_modules` a GitHub.
