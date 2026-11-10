# Requisitos backend — autenticación, validación y CRUD

## Tecnologías
Node.js, Express 4, MongoDB, Mongoose 8, bcrypt, jsonwebtoken y express-validator 7.

## Modelos
- `Usuario`: nombre, email único, hash de contraseña, rol, estado, bloqueo, recuperación y revocación de JWT.
- `Producto`: nombre, SKU único, precio, costo, stock y stock mínimo, categoría, código de barras y proveedor.

## Autenticación JWT
- `POST /api/auth/login`: email y password; responde `token` y `usuario` (200) o 401.
- `POST /api/auth/registro`: requiere `Authorization: Bearer <token>` de administrador; nombre, email, password (12–128 caracteres), role opcional; responde 201.
- `POST /api/auth/recuperar`: email; respuesta neutra para evitar enumeración.
- `POST /api/auth/restablecer`: token de recuperación y password nueva.
- La primera cuenta administradora se crea mediante `npm run crear:admin` con variables de entorno seguras; no se abre el registro público.

## CRUD de productos
Todos requieren JWT. Crear, actualizar y eliminar requieren los permisos y roles definidos en `productoRoutes.js`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/productos` | Crear producto (201); stock inicial 0 |
| GET | `/api/productos` | Listar productos con paginación y filtros |
| GET | `/api/productos/:id` | Consultar un producto |
| PUT | `/api/productos/:id` | Actualizar datos comerciales |
| DELETE | `/api/productos/:id` | Desactivar producto (borrado lógico) |

Ejemplo POST:
```json
{"nombre":"Cuaderno","sku":"CUA-001","precio":12000,"costo":8000,"stockMinimo":5}
```

**Regla de integridad:** el CRUD no modifica el stock ni permite asignar `activo`; los movimientos de inventario deben gestionar existencias y auditoría. Las solicitudes inválidas devuelven HTTP 422 con `errores` (campo y mensaje). JWT faltante o inválido: 401; rol o permiso insuficiente: 403.

## Instalación
En `backend/`, ejecutar `npm install` para incorporar `express-validator` y actualizar `package-lock.json`; después `npm run dev` con MongoDB y `.env` configurados. No publicar secretos ni contraseñas en el repositorio.

## Limitaciones y pruebas posteriores
No se ejecutaron pruebas funcionales ni de integración, según la planificación acordada. Revisar el CRUD y las validaciones del resto de los módulos en la siguiente etapa, y ejecutar las pruebas completas al final.
