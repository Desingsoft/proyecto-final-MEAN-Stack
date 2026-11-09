# Sistema de Gestión de Inventario y Pedidos para Pymes

Stack: **Angular 18** (frontend, componentes standalone) + **Express + MongoDB/Mongoose** (backend) + **JWT** con roles (`admin`, `bodeguero`, `ventas`).

---

## 📁 Estructura del proyecto

```
proyecto/
├── instalar.bat        → instala dependencias de backend y frontend (Windows)
├── iniciar.bat         → abre backend y frontend en dos ventanas (Windows)
├── docker-compose.yml  → MongoDB (replica set) + backend + frontend con un solo comando
├── .env.example        → variables para Docker Compose
├── backend/            → API REST (Express + Mongoose) · Dockerfile
│   ├── config/         → conexión a MongoDB
│   ├── models/         → Usuario, Producto, Pedido, MovimientoInventario, Proveedor
│   ├── middlewares/    → verifyToken, checkRole, errorHandler
│   ├── controllers/    → lógica de negocio (incluye reportes y usuarios)
│   ├── routes/         → definición de endpoints
│   ├── utils/          → fechas de negocio, niveles de stock, eventos en tiempo real
│   ├── scripts/        → crearAdmin.js, seedDemo.js
│   ├── server.js       → punto de entrada
│   └── .env.example    → variables de entorno necesarias
└── frontend/           → Aplicación Angular · Dockerfile + nginx.conf
    ├── angular.json, tsconfig*.json
    └── src/
        ├── app/
        │   ├── core/       → servicios, guards, interceptor, modelos, configuración regional
        │   ├── shared/     → layout, gráficos, modal, diálogo de confirmación, iconos, exportación, tiempo real
        │   └── features/   → auth, dashboard, productos, clientes, pedidos, devoluciones, documentos, cartera,
        │                         reposición, órdenes de compra, inventario, proveedores, reportes, usuarios, configuración
        ├── environments/   → URL del backend (dev/prod)
        └── index.html, main.ts, styles.css
```

---

## 🚀 Puesta en marcha

### 1. Requisitos

- **Node.js** 18 o superior (recomendado 20+).
- **MongoDB** en modo *replica set* (necesario para las transacciones): **MongoDB Atlas** (ya lo es) o MongoDB local configurado como se explica en [Transacciones de MongoDB](#transacciones-de-mongodb).

### 2. Instalación

**En Windows (rápido):** doble clic en `instalar.bat`. Instala ambos proyectos y crea `backend\.env` si no existe.

**Manual:**

```powershell
cd backend
npm install
Copy-Item .env.example .env     # en macOS/Linux: cp .env.example .env

cd ../frontend
npm install
```

Abre `backend/.env` y revisa:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/inventario_pedidos
JWT_SECRET=escribe_aqui_un_secreto_largo_y_aleatorio
NODE_ENV=development
```

> 💡 Genera un `JWT_SECRET` seguro con:
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3. Crear el primer administrador

```powershell
cd backend
npm run crear:admin
```

Te pide nombre, correo y contraseña. También puedes pasarlos directamente:
`npm run crear:admin -- "Tu Nombre" correo@empresa.com TuContraseña`.
Es seguro repetirlo: si el correo ya existe, no lo duplica.

### 4. (Opcional) Cargar datos de demostración

Para ver el panel y los reportes con información, sin escribir datos a mano:

```powershell
cd backend
npm run seed:demo                 # crea proveedores, productos, clientes, pedidos, facturas, órdenes de compra y movimientos de ejemplo
npm run seed:demo -- --limpiar    # los elimina (solo borra los datos de demostración)
```

Solo se ejecuta si todavía no tienes productos propios.

### 5. Iniciar

**En Windows:** doble clic en `iniciar.bat` (abre dos ventanas).

**Manual**, en dos terminales:

```powershell
cd backend  ; npm run dev     # http://localhost:3000/api/health  ->  { "estado": "ok" }
cd frontend ; npm start       # http://localhost:4200
```

En el backend debes ver `MongoDB conectado correctamente` y `Servidor corriendo en el puerto 3000`. Abre `http://localhost:4200` e inicia sesión con el administrador del paso 3.

---

## ✨ Funcionalidades

- **Panel:** cinta de estado del inventario (saludable, bajo, crítico, agotado), indicadores con periodo seleccionable (7/14/30/90 días) y comparación con el periodo anterior, gráfico de ventas, pedidos por estado, más vendidos y productos que requieren atención.
- **Reposición:** productos en o bajo su stock mínimo, agrupados por proveedor, con cantidad sugerida editable, registro de entrada de mercancía y **lista de compra** en Excel o PDF.
- **Reportes:** ventas, inventario y movimientos, con rango de fechas, gráficos, tablas con filtros y exportación a Excel y PDF.
- **Órdenes de compra:** crea borradores a mano o **directamente desde Reposición** (uno por proveedor), márcalas como enviadas y registra la llegada de la mercancía, total o parcial. Al recibir, el stock sube solo, queda un movimiento de entrada con el número de la orden y, si quieres, se actualiza el costo del producto. Cada orden se descarga en PDF para enviarla al proveedor.
- **Clientes:** ficha con documento, contacto y dirección de facturación, historial de compras (total comprado, ticket promedio, última compra) y selector con autocompletado al crear un pedido.
- **Descuentos, remisiones y facturas:** el pedido admite un descuento en porcentaje; desde su detalle se emite una **remisión** o una **factura** (IVA desglosado, contado o crédito con vencimiento), con numeración consecutiva, copia fija de los datos del momento, vista previa, **PDF** y anulación con motivo.
- **Devoluciones y notas crédito:** desde el detalle de un pedido enviado o completado eliges qué productos devuelve el cliente, cuántos, **en qué estado** (los que están bien vuelven al inventario; los dañados se descartan) y por qué motivo.
  - Si el pedido tiene **factura**, se emite una **nota crédito** (con el IVA y el descuento de esa venta) que reduce lo que el cliente debe. Si ya había pagado, queda con **saldo a favor** y se le puede **reembolsar** (al registrar la devolución o después desde Cartera), con su comprobante en PDF.
  - Las **ventas del panel y de los reportes son netas** de devoluciones. La pantalla **Devoluciones** muestra cuánto se devuelve, por qué motivo y qué productos más; se exporta a Excel y PDF. Un administrador puede anular una devolución (el stock y la factura se restituyen).
- **Cartera:** control de lo que te deben y lo que debes.
  - **Por cobrar:** las facturas a crédito con su saldo, vencimiento y días de mora; indicadores (por cobrar, vencido, vence en 7 días, cobrado en el mes), antigüedad por tramos y los clientes que más deben. Se registran **abonos** (totales o parciales) con forma de pago y referencia, y cada uno genera su **recibo de caja** en PDF.
  - **Por cliente:** saldo, mora y cupo disponible de cada cliente, con su **estado de cuenta en PDF**.
  - **Cupo y plazo de crédito** por cliente: una factura a crédito que supere el cupo se bloquea, salvo que un administrador la autorice.
  - **Recaudos:** todos los pagos recibidos en un periodo, por forma de pago, exportables a Excel o PDF.
  - **Por pagar:** lo que debes a tus proveedores por la mercancía recibida, con la factura del proveedor, su vencimiento y **comprobantes de egreso**; y **Pagos realizados** con el historial.
  - Las facturas **de contado** quedan pagadas al emitirse y generan su recibo automáticamente. El panel muestra la cartera por cobrar y por pagar.
- **Configuración:** datos de tu empresa, IVA, si tus precios ya lo incluyen, prefijos de numeración y nota al pie de las facturas.
- **Productos, pedidos, proveedores e inventario:** CRUD completo, carrito con validación de stock, descuento automático de stock en transacción y devolución al cancelar.
- **Usuarios:** listar, editar nombre/correo/rol, activar o desactivar, restablecer contraseña; cada persona cambia su contraseña en **Mi perfil**.
- **Clientes** (admin, ventas; eliminar solo admin): `GET /clientes?buscar=&pagina=`, `GET /clientes/:id` (con estadísticas), `POST /clientes`, `PUT /clientes/:id`, `DELETE /clientes/:id`

**Órdenes de compra** (admin, bodeguero): `GET /ordenes-compra?estado=&proveedor=&buscar=`, `GET /ordenes-compra/:id`, `POST /ordenes-compra`, `POST /ordenes-compra/desde-reposicion`, `PUT /ordenes-compra/:id` (solo borradores), `PATCH /ordenes-compra/:id/estado`, `POST /ordenes-compra/:id/recibir`

**Documentos** (admin, ventas; anular solo admin): `GET /documentos?tipo=&estado=&buscar=`, `GET /documentos/pedido/:pedidoId`, `GET /documentos/:id`, `POST /documentos`, `PATCH /documentos/:id/anular`

**Devoluciones** (admin, ventas; anular solo admin): `GET /devoluciones?desde=&hasta=&motivo=&estado=`, `GET /devoluciones/pedido/:pedidoId`, `GET /devoluciones/:id`, `POST /devoluciones`, `PATCH /devoluciones/:id/anular`

**Cartera** (por cobrar: admin, ventas · por pagar: solo admin): `GET /cartera/cobrar/resumen`, `GET /cartera/cobrar?situacion=vencida|porVencer|vigente&buscar=`, `GET /cartera/cobrar/clientes`, `GET /cartera/cobrar/estado-cuenta/:clienteId`, `GET /cartera/cobrar/a-favor`, `GET /cartera/pagar/resumen`, `GET /cartera/pagar`

**Pagos:** `POST /pagos/cobro` (abono de un cliente), `POST /pagos/reembolso` (devolver dinero a un cliente), `POST /pagos/egreso` (pago a un proveedor, solo admin), `GET /pagos?tipo=cobro|egreso&desde=&hasta=&metodo=`, `GET /pagos/documento/:id`, `GET /pagos/orden/:id`, `GET /pagos/:id`, `PATCH /pagos/:id/anular` (solo admin)

**Configuración:** `GET /configuracion` (todos), `PUT /configuracion` (admin)

**Tiempo real:** las pantallas se actualizan solas cuando alguien crea un pedido, mueve el inventario o cambia usuarios (indicador "En vivo" en el panel).
- **Interfaz:** barra lateral, versión móvil, diálogos de confirmación propios, moneda y fechas en español de Colombia.

---

## 👥 Roles y permisos

| Acción                                   | admin | bodeguero | ventas |
|-------------------------------------------|:-----:|:---------:|:------:|
| Ver panel (cifras de ventas)              | ✅    | ❌ (sin ventas) | ✅ |
| Ver valor del inventario en el panel      | ✅    | ❌        | ❌     |
| Ver productos / proveedores / pedidos     | ✅    | ✅        | ✅     |
| Crear / eliminar productos                | ✅    | ❌        | ❌     |
| Editar productos (ajustar stock)          | ✅    | ✅        | ❌     |
| Crear pedidos                             | ✅    | ❌        | ✅     |
| Cambiar estado de pedidos                 | ✅    | ✅        | ✅     |
| Inventario (movimientos) y **reposición** | ✅    | ✅        | ❌     |
| Crear / editar / eliminar proveedores     | ✅    | ❌        | ❌     |
| Reporte de **ventas**                     | ✅    | ❌        | ✅     |
| Reportes de **inventario** y **movimientos** | ✅ | ✅        | ❌     |
| Clientes (ver, crear, editar)             | ✅    | ❌        | ✅     |
| Emitir remisiones y facturas              | ✅    | ❌        | ✅     |
| Anular documentos / eliminar clientes     | ✅    | ❌        | ❌     |
| Órdenes de compra (crear, enviar, recibir)| ✅    | ✅        | ❌     |
| Registrar devoluciones y reembolsos       | ✅    | ❌        | ✅     |
| Anular una devolución                     | ✅    | ❌        | ❌     |
| Cartera por cobrar: ver y registrar abonos | ✅   | ❌        | ✅     |
| Anular un pago / autorizar un cupo superado | ✅  | ❌        | ❌     |
| Cuentas por pagar y pagos a proveedores   | ✅    | ❌        | ❌     |
| Configuración de la empresa               | ✅    | ❌        | ❌     |
| Gestionar usuarios                        | ✅    | ❌        | ❌     |
| Cambiar la propia contraseña              | ✅    | ✅        | ✅     |

---

## 🗺️ Mapa de rutas del frontend

| Ruta                        | Acceso                 |
|------------------------------|------------------------|
| `/login`                     | Público                |
| `/dashboard`                 | Todos                  |
| `/productos`, `/pedidos`, `/proveedores`, `/pedidos/:id` | Todos |
| `/productos/nuevo`           | admin                  |
| `/productos/editar/:id`      | admin, bodeguero       |
| `/pedidos/nuevo`             | admin, ventas          |
| `/inventario`, `/reposicion` | admin, bodeguero       |
| `/proveedores/nuevo`, `/proveedores/editar/:id` | admin |
| `/clientes`, `/clientes/:id` | admin, ventas          |
| `/documentos`, `/documentos/:id` | admin, ventas      |
| `/ordenes-compra`, `/ordenes-compra/nueva`, `/ordenes-compra/editar/:id`, `/ordenes-compra/:id` | admin, bodeguero |
| `/devoluciones`              | admin, ventas          |
| `/cartera/cobrar`, `/cartera/clientes`, `/cartera/recaudos` | admin, ventas |
| `/cartera/pagar`, `/cartera/pagos-realizados` | admin     |
| `/configuracion`             | admin                  |
| `/reportes/ventas`           | admin, ventas          |
| `/reportes/inventario`, `/reportes/movimientos` | admin, bodeguero |
| `/usuarios`, `/usuarios/nuevo` | admin                |
| `/perfil`                    | Todos                  |

---

## 🔌 Endpoints del backend

Base URL: `http://localhost:3000/api`. Todas las rutas (salvo `/auth/login`) requieren `Authorization: Bearer <token>`.

**Auth:** `POST /auth/login`, `POST /auth/registro` (solo admin)

**Productos:** `GET /productos?buscar=&categoria=&estadoStock=bajo|agotado&pagina=&limite=`, `GET /productos/stock-bajo`, `GET /productos/categorias`, `GET /productos/reposicion` (admin, bodeguero), `GET|POST|PUT|DELETE /productos/:id`

**Pedidos:** `GET /pedidos?estado=&pagina=`, `GET /pedidos/resumen`, `GET /pedidos/:id`, `POST /pedidos`, `PATCH /pedidos/:id/estado`

**Inventario:** `GET /inventario/movimientos`, `POST /inventario/movimiento`

**Proveedores:** `GET|POST|PUT|DELETE /proveedores`

**Usuarios** (admin, salvo `yo`): `GET /usuarios`, `PATCH /usuarios/:id`, `PATCH /usuarios/:id/password`, `GET /usuarios/yo`, `PATCH /usuarios/yo/password`

**Reportes:** `GET /reportes/dashboard?dias=`, `GET /reportes/ventas?desde=&hasta=`, `GET /reportes/inventario`, `GET /reportes/movimientos?desde=&hasta=` (fechas `AAAA-MM-DD`)

**Tiempo real:** `GET /eventos` (Server-Sent Events con la lista de recursos que cambiaron)

---

## 🐳 Docker Compose (instalación en un comando)

Levanta **MongoDB con replica set, el backend y el frontend** sin instalar Node ni MongoDB. Requiere [Docker](https://docs.docker.com/get-docker/) con Compose v2.

```bash
cp .env.example .env        # en PowerShell: Copy-Item .env.example .env
# edita .env: JWT_SECRET (obligatorio) y ADMIN_EMAIL / ADMIN_PASSWORD
docker compose up -d --build
```

Abre **http://localhost:8080** (cambia el puerto con `WEB_PORT`). El administrador inicial se crea solo, una vez, con `ADMIN_*`.

| Comando | Para qué |
|---|---|
| `docker compose logs -f backend` | Ver el registro del backend |
| `docker compose ps` | Ver el estado de los servicios |
| `docker compose down` | Detener (los datos se conservan) |
| `docker compose up -d --build` | Actualizar después de cambiar el código |
| `docker compose down -v` | Detener **y borrar todos los datos** |

- **Datos:** viven en el volumen `mongo-data` y sobreviven a reinicios y actualizaciones.
- **Cómo funciona:** nginx sirve la aplicación Angular y reenvía `/api` al backend (incluido el canal en vivo), así que todo se abre desde un solo puerto.
- **Copia de seguridad:** `docker compose exec mongo mongodump --archive --db inventario_pedidos > respaldo.archive`
- **Restaurar:** `docker compose exec -T mongo mongorestore --archive --drop < respaldo.archive`
- **Demo:** `docker compose exec backend node scripts/seedDemo.js` (solo si no tienes productos propios).
- **MongoDB Compass:** descomenta `ports` en el servicio `mongo` de `docker-compose.yml` y conéctate a `mongodb://127.0.0.1:27017/?directConnection=true`.
- **HTTPS:** para publicarlo en internet, ponlo detrás de un proxy con certificados (por ejemplo Caddy o Traefik) y expón solo ese proxy.

---

## ⚙️ Notas técnicas importantes

### Transacciones de MongoDB
Crear pedidos y registrar movimientos usa **transacciones**, que **requieren que MongoDB corra como *replica set***. El backend te avisa al arrancar si no lo está.

- **MongoDB Atlas:** ya viene así, no hay que hacer nada.
- **MongoDB local en Windows** (servicio):
  1. Abre `C:\Program Files\MongoDB\Server\<versión>\bin\mongod.cfg` **como administrador** y agrega al final, sin tabuladores y con `replication:` pegado al borde izquierdo:
     ```yaml
     replication:
       replSetName: rs0
     ```
  2. Reinicia el servicio (PowerShell como administrador): `Restart-Service MongoDB`.
  3. Abre `mongosh`, presiona Enter en la pregunta de conexión y ejecuta una sola vez: `rs.initiate()`. Comprueba con `rs.status()` que aparezca `PRIMARY`.
- **MongoDB local en otros sistemas:** `mongod --replSet rs0 --dbpath /ruta/a/tu/data` y luego `rs.initiate()` en `mongosh`.

### Órdenes de compra: ciclo de vida
`borrador → enviada → parcial → recibida`, o `cancelada` (desde borrador o enviada). Un borrador se puede editar; una vez enviada ya no. Se pueden registrar varias recepciones; cada una suma al stock y crea un movimiento de entrada `compra OC-0001` dentro de una **transacción** (si algo falla, no queda nada a medias). Una orden parcial puede cerrarse aunque falten unidades.

### Facturación: alcance y límites
Las **remisiones y facturas** de esta aplicación son documentos **internos**: llevan numeración propia, desglose de IVA y datos de tu empresa y del cliente, pero **no son facturas electrónicas de la DIAN** y no sustituyen la facturación electrónica obligatoria. Cada PDF lo indica en su pie. Si necesitas facturar electrónicamente, lo habitual es integrarse con un proveedor tecnológico autorizado.

- Los precios de tus productos se interpretan según **"Mis precios ya incluyen IVA"** (Configuración): si está activo, la factura desglosa el IVA y el total no cambia; si no, el IVA se suma.
- El descuento del pedido reduce el total. Los reportes de ventas ya lo consideran.
- Cada documento guarda una **copia** de los datos de la empresa, del cliente y de las líneas al emitirse: si luego editas al cliente o los precios, el documento ya emitido no cambia.
- Un pedido admite **una factura vigente y una remisión vigente**. Para emitir otra hay que anular la anterior (su número no se reutiliza). No se puede cancelar un pedido con factura vigente; sus remisiones se anulan solas al cancelarlo.

### Devoluciones y notas crédito: reglas de negocio
- **Qué se puede devolver:** productos de pedidos **enviados o completados**, hasta lo que se vendió menos lo ya devuelto. Un pedido que aún no se entregó se cancela, no se devuelve.
- **Valor reconocido:** el precio al que se vendió, con el **descuento del pedido** y, si la factura suma el IVA aparte, con ese IVA. Las notas crédito de una factura nunca pueden sumar más que la factura.
- **Inventario:** lo devuelto **en buen estado** vuelve al stock y deja un movimiento de entrada `devolución DV-0001`. Lo **dañado** no vuelve (se registra como descartado).
- **Con factura:** se emite la nota crédito `NC-0001`, que queda ligada a la factura. El saldo de la factura = total − notas crédito − pagos (+ reembolsos). Si el resultado es negativo, es **saldo a favor del cliente**.
- **Reembolso:** devuelve dinero hasta el saldo a favor. Se valida **antes** de registrar la devolución, así que si el monto no cuadra no queda nada a medias.
- **Sin factura** (solo remisión o ninguna): se registra la devolución y vuelve el inventario, pero no hay nota crédito ni reembolso.
- **Anular una devolución** (solo administrador): las unidades reintegradas salen otra vez del inventario (si no hay stock suficiente, se rechaza), la nota crédito se anula y la factura recupera lo que se había acreditado. Una factura con notas crédito vigentes no se puede anular, y un pedido con devoluciones no se puede cancelar.
- **Reportes:** las ventas del panel y del reporte de ventas se muestran **netas**: lo vendido menos lo devuelto, en la fecha en que se registra la devolución.
- **Consecutivos:** devoluciones `DV-0001`, notas crédito `NC-0001` y reembolsos `RE-0001`, con prefijos configurables. Nunca se reutilizan.

### Cartera: reglas de negocio
- **Qué es cartera:** solo las **facturas vigentes con saldo**. Las remisiones no se pagan. Una factura anulada sale de la cartera.
- **Saldo** = total de la factura − pagos vigentes. Se recalcula siempre desde los pagos, así que anular un pago restituye el saldo exacto.
- **Un abono nunca puede superar el saldo.** El monto es un número entero de pesos y la fecha no puede ser futura.
- **Vencimiento y mora:** el plazo sale del cliente (si lo tiene) o de la configuración. Los días de mora se cuentan por días del negocio (zona horaria configurada). Los tramos son: al día, 1–30, 31–60, 61–90 y más de 90 días.
- **Contado:** la factura se emite ya pagada y crea su recibo con la forma de pago elegida.
- **Cupo de crédito:** lo que el cliente ya debe más la nueva factura a crédito no puede superar su cupo (0 = sin límite). Los administradores pueden autorizar el exceso. No limita las ventas de contado.
- **Anular una factura** anula también sus pagos (quedan registrados como anulados con el motivo).
- **Cuentas por pagar:** se debe el valor de lo **ya recibido** de cada orden de compra (no de lo pedido). El plazo empieza al llegar la primera mercancía y se calcula con los días de crédito del proveedor; se puede fijar el vencimiento y registrar el número de la factura del proveedor.
- **Consecutivos:** recibos `RC-0001` y egresos `CE-0001`, con prefijos configurables. Nunca se reutilizan.
- Las facturas emitidas **antes** de existir la cartera siguen funcionando: las de contado se consideran pagadas y las de crédito, pendientes.

### Tiempo real
El backend publica un aviso cada vez que una escritura termina bien (`utils/eventos.js`) y los navegadores conectados (`GET /eventos`) recargan solo lo que cambió. Si la conexión se cae, se reintenta sola y, al volver, todas las pantallas se actualizan. El panel además se refresca por temporizador mientras el canal en vivo no esté conectado.

### Sesión expirada
El token JWT dura 2 horas. Un token inválido o vencido responde `401` y el frontend cierra la sesión y vuelve al login. `403` se reserva para permisos insuficientes por rol. Un usuario **desactivado** no puede iniciar sesión, pero una sesión ya abierta sigue hasta que expire su token.

### Zona horaria de los reportes
"Hoy" y "este mes" se calculan en la zona del negocio, no en la del servidor. Por defecto Colombia (UTC-5); cámbialo con `ZONA_OFFSET_HORAS` en `backend/.env`. La moneda y la región del frontend están en `frontend/src/app/core/config/formato.ts` (por defecto `COP` y `es-CO`).

### Borrado lógico
Productos y proveedores no se eliminan físicamente: se marca `activo: false`.

### Orden de rutas
En `app.routes.ts`, `pedidos/nuevo` va **antes** que `pedidos/:id`; en el backend, `/usuarios/yo` va antes que `/usuarios/:id`. Si se invierte el orden, "nuevo" o "yo" se interpretarían como un id.

---

## 🧩 Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| `"nodemon" no se reconoce como un comando` | Faltan las dependencias del backend | `cd backend` y `npm install` |
| `Cannot find tsconfig file "tsconfig.app.json"` o `Could not resolve ...main.ts` | La carpeta `frontend` está incompleta (se copió solo una parte del proyecto) | Usa el proyecto completo; deben existir `frontend/tsconfig.app.json` y `frontend/src/main.ts` |
| `Falta configurar: MONGODB_URI, JWT_SECRET` | No existe `backend/.env` | `Copy-Item .env.example .env` y complétalo |
| `The uri parameter ... must be a string, got undefined` | El `.env` no existe, está en otra carpeta o se llama `.env.txt` | Debe llamarse exactamente `.env` y estar en `backend/`; reinicia con `Ctrl + C` y `npm run dev` |
| `El puerto 3000 ya está en uso` / `EADDRINUSE` | Hay otro backend abierto | Ciérralo con `Ctrl + C`, o `Get-NetTCPConnection -LocalPort 3000` para hallar el proceso y `Stop-Process -Id <número>` |
| `AVISO: MongoDB NO está en modo replica set` o `Transaction numbers are only allowed on a replica set member` | MongoDB local sin replica set | Ver [Transacciones de MongoDB](#transacciones-de-mongodb) |
| El servicio `MongoDB` no inicia (error 2186) | `mongod.cfg` mal formado (sangría o tabuladores) | Revisa que `replication:` esté sin sangría y `replSetName` con dos espacios |
| `NoReplicationEnabled` al ejecutar `rs.initiate()` | El servicio arrancó con la configuración anterior | Corrige `mongod.cfg` y ejecuta `Restart-Service MongoDB` |
| Página en blanco en `localhost:4200` | Error de ejecución del frontend | Abre `F12` → Consola y revisa el error; comprueba que `angular.json` tenga `"polyfills": ["zone.js"]` |
| Login responde 401 | Usuario inexistente o contraseña incorrecta | Crea el admin con `npm run crear:admin` |
| Login responde 403 "cuenta desactivada" | Un administrador desactivó la cuenta | Reactívala desde **Usuarios** |
| El panel sale vacío | No hay datos todavía | Crea productos y pedidos, o usa `npm run seed:demo` |
| `docker compose up` dice `Define JWT_SECRET` | No existe `.env` o `JWT_SECRET` está vacío | `cp .env.example .env` y completa `JWT_SECRET` |
| El backend en Docker reinicia sin parar | MongoDB aún no está listo o `JWT_SECRET` falta | `docker compose logs backend mongo`; espera a que `mongo` aparezca como *healthy* |
| Puerto 8080 en uso con Docker | Otra aplicación usa ese puerto | Cambia `WEB_PORT` en `.env` y repite `docker compose up -d` |
| No puedo entrar tras `docker compose up` | El administrador inicial no se creó | Revisa `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 6 caracteres) y `docker compose logs backend` |
| Al registrar un pago: "supera el saldo pendiente" | El abono es mayor a lo que falta | Usa el botón **Total** o un monto menor |
| Al emitir a crédito: "Supera el cupo de crédito" | El cliente alcanzaría su límite | Un administrador puede **Autorizar y emitir**, o sube el cupo en la ficha del cliente |
| Al devolver: "solo se pueden devolver N unidades" | Ya se devolvió parte de ese producto | Revisa el panel "Devoluciones" del pedido |
| Al devolver: "Solo se pueden devolver productos de pedidos enviados o completados" | El pedido aún no se entregó | Cancélalo en lugar de devolverlo |
| Al cancelar un pedido: "tiene devoluciones registradas" | Cancelar devolvería el stock dos veces | Anula primero sus devoluciones (administrador) |
| Al anular una devolución: "No hay stock suficiente" | Esas unidades ya se vendieron de nuevo | Repón el inventario y vuelve a intentarlo |
| Una factura no aparece en la cartera | Es de contado, está anulada o ya está pagada | Solo las facturas a crédito con saldo cuentan como cartera |
| Al emitir una factura: "ya tiene una factura vigente" | Cada pedido admite una vigente | Anúlala (admin) desde **Facturas y remisiones** y emite otra |
| Al cancelar un pedido: "Anula antes la factura" | El pedido tiene factura vigente | Anula la factura primero |
| El indicador "En vivo" no aparece | El backend no está corriendo o hay un proxy que corta conexiones largas | Verifica `http://localhost:3000/api/health`; el panel sigue actualizándose por temporizador |

---

## Revisión técnica y mejoras (4 de noviembre de 2026)

### Tecnologías comprobadas

- **Frontend:** Angular 18, TypeScript 5.4, HTML y CSS; RxJS y Zone.js.
- **Backend:** Node.js, JavaScript CommonJS, Express 4, Mongoose 8.
- **Persistencia:** MongoDB (las transacciones requieren replica set).
- **Autenticación:** JSON Web Tokens (JWT) y contraseñas con bcrypt.
- **Exportación:** jsPDF, jsPDF-AutoTable y XLSX.
- **Infraestructura:** Docker Compose, Docker y Nginx.
- **Actualización en tiempo real:** Server-Sent Events (SSE).

### Cambios aplicados en esta revisión

1. Validación explícita de los campos del inicio de sesión y registro, normalización de correos y comprobación de roles contra el esquema MongoDB (`admin`, `bodeguero`, `ventas`).
2. Los errores internos de autenticación ya no revelan detalles técnicos al cliente.
3. Verificación estricta del encabezado `Authorization: Bearer <token>`.
4. Límite de 1 MB para cuerpos JSON, cabeceras HTTP defensivas y restricción opcional de orígenes mediante `CORS_ORIGINS`.
5. `/api/health` devuelve HTTP 503 si MongoDB no está conectado y HTTP 200 cuando sí lo está.
6. Respuestas JSON para rutas API inexistentes.
7. CSS adicional para pantallas pequeñas, tablas desplazables y foco de teclado visible.
8. Pruebas de humo con el ejecutor integrado de Node.js (`cd backend && npm test`).

### Configuración recomendada de producción

Configurar `NODE_ENV=production`, una clave `JWT_SECRET` aleatoria y larga, `MONGODB_URI` con credenciales limitadas y `CORS_ORIGINS` con los dominios HTTPS autorizados. Nunca publicar archivos `.env` ni credenciales en repositorios. Mantener copias de seguridad y restauraciones ensayadas.

### Pruebas y limitaciones de esta entrega

Las pruebas de humo verifican la sintaxis del backend y archivos esenciales, **no** la lógica de negocio ni la conexión real a MongoDB. Antes de publicar se deben ejecutar `npm ci`, `npm test` y `npm run build` en un entorno con dependencias instaladas, además de probar los flujos de pedidos, inventario, pagos, cartera y devoluciones contra una base de datos de prueba en replica set. La revisión no equivale a una auditoría de seguridad exhaustiva.

### Mejoras pendientes priorizadas

- **Alta:** pruebas de integración para transacciones y concurrencia de inventario, controles de acceso por objeto, rate limiting en login, políticas de contraseñas y recuperación segura de cuenta.
- **Alta:** actualizar dependencias con análisis de vulnerabilidades y revisar la seguridad de almacenamiento del JWT en `localStorage` (considerar cookies HttpOnly + CSRF).
- **Media:** auditoría de cambios con usuario y fecha, paginación del lado del servidor, manejo unificado de validaciones y observabilidad.
- **Media:** pruebas de interfaz en dispositivos reales, accesibilidad WCAG y escenarios offline.
- **Según negocio:** multiempresa, sucursales, códigos de barras, alertas de stock, respaldo/restauración y permisos granulares. Estas funciones **no se presentan como implementadas**.

### Mapa de documentación del código

- `backend/server.js`: arranque, middleware, rutas y salud.
- `backend/controllers/`: operaciones de cada módulo de negocio.
- `backend/models/`: esquemas y restricciones de persistencia.
- `backend/routes/`: endpoints y controles de acceso.
- `backend/middlewares/`: autenticación, autorización y errores.
- `backend/utils/`: utilidades de negocio y eventos SSE.
- `frontend/src/app/features/`: pantallas y flujos por módulo.
- `frontend/src/app/core/`: servicios, modelos y lógica compartida.
- `frontend/src/styles.css`: diseño global y reglas responsive.

Los archivos modificados contienen comentarios de intención en los bloques nuevos. No se han comentado automáticamente todas las variables de todos los archivos existentes, porque añadir comentarios genéricos sin revisar cada flujo podría introducir documentación incorrecta.


## Ampliación funcional — noviembre de 2026

### Tecnologías
Frontend Angular 18, TypeScript, HTML y CSS; backend Node.js/Express 4 (JavaScript); MongoDB/Mongoose 8; autenticación JWT y bcrypt. Comunicación mediante API REST.

### Implementado en esta iteración
- Recuperación de contraseña con token aleatorio de un solo uso, hash SHA-256 y expiración de 15 minutos. La entrega del enlace **requiere SMTP configurado**. Pantallas `/recuperar` y `/restablecer?token=...`.
- Bloqueo de cuenta durante 15 minutos después de cinco contraseñas erróneas; revocación de sesiones anteriores al restablecer.
- Middleware de permisos individuales (`permisos`) y auditoría básica de operaciones de escritura (método, ruta, usuario, fecha, resultado, IP; sin cuerpos ni secretos).
- Catálogo de bodegas, existencias por bodega y conteos físicos con transacción MongoDB. **Importante:** el inventario histórico existente se mantiene global y **no se distribuye automáticamente** entre bodegas; antes de usar conteos hay que conciliar/migrar existencias iniciales.
- Campo opcional `codigoBarras` en producto, consulta de alertas de stock bajo, cotizaciones independientes, indicadores y notificaciones persistentes (API).
- Panel Angular `/avanzado` con indicadores, bodegas, conteos, listado de cotizaciones, alertas y consulta de auditoría.
- Mejoras de diseño responsive, controles táctiles y scroll horizontal de tablas.
- Script manual `backend/scripts/backup.sh` con `mongodump` (necesita MongoDB Database Tools, credenciales y programación externa).

### Configuración adicional
Ejecuta `npm install` dentro de `backend` para instalar `nodemailer`. Define `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` y `RESET_URL` en `backend/.env` para habilitar el envío de correos. **Nunca publiques `.env` ni archivos de respaldo.** Usa MongoDB como conjunto de réplicas para las transacciones de conteo. La cuenta inicial debe crearse con `npm run crear:admin`.

### Endpoints adicionales (JWT requerido salvo recuperación)
- `POST /api/auth/recuperar`, `POST /api/auth/restablecer`.
- `GET,POST /api/avanzado/bodegas` (crear requiere `inventario.bodegas` o admin).
- `GET /api/avanzado/existencias`, `GET,POST /api/avanzado/conteos` (crear requiere `inventario.conteos` o admin).
- `GET /api/avanzado/alertas`, `GET /api/avanzado/indicadores`.
- `GET /api/avanzado/auditoria` (requiere `auditoria.leer` o admin).
- `GET /api/avanzado/notificaciones`, `PATCH /api/avanzado/notificaciones/:id/leida`.
- `GET,POST /api/avanzado/cotizaciones`, `PATCH /api/avanzado/cotizaciones/:id/estado` (escritura requiere `ventas.cotizaciones` o admin).

### Limitaciones y trabajo pendiente
- Los módulos anteriores de pedidos, devoluciones parciales y descuentos ya existían; se preservaron. No se ha verificado aún toda la lógica financiera con una base real.
- El código de barras tiene persistencia en modelo; **falta integrar captura/consulta en los formularios y lectores**.
- Las notificaciones están disponibles en API, pero **falta programar su generación automática y visualización global**.
- El respaldo es **manual** y no incluye restauración probada, cifrado ni retención programada.
- El panel muestra cotizaciones, pero **todavía falta el formulario visual de creación y conversión a pedido**.
- El permiso granular está implementado para las rutas nuevas; las rutas anteriores siguen usando `checkRole`. Es necesario definir una matriz de permisos y extender la autorización.
- La auditoría no es inmutable y no garantiza registro si la base de datos falla; para cumplimiento normativo se requiere almacenamiento externo de eventos.
- La recuperación SMTP y la compilación Angular requieren dependencias instaladas. Se recomienda probar flujos end-to-end, concurrencia y compatibilidad con la base de datos de producción en entorno de pruebas antes del despliegue.

### Comprobaciones
`cd backend && npm install && npm test` ejecuta pruebas unitarias estructurales. `cd frontend && npm install && npm run build` compila Angular. Estas pruebas no sustituyen integración con MongoDB ni validación de seguridad.


## Integración incremental (noviembre de 2026)

- **Escáner:** `GET /api/avanzado/codigo-barras/:codigo` busca coincidencia exacta. Un lector USB/Bluetooth tipo teclado puede ingresar el código en el formulario. No se incluye todavía escaneo por cámara.
- **Cotización a pedido:** `POST /api/avanzado/cotizaciones/:id/convertir` requiere cotización aceptada y permiso `ventas.cotizaciones`; usa el controlador existente para validar stock. **Pendiente:** endurecer atomicidad entre creación de pedido y enlace de cotización ante fallos de proceso.
- **Permisos:** se incorporan permisos granulares para escrituras de productos y pedidos; otros endpoints aún requieren revisión. Los permisos deben asignarse explícitamente a usuarios no administradores.
- **Conciliación:** ejecutar `cd backend && node scripts/conciliarBodegas.js` con `MONGODB_URI` configurado. Genera `conciliacion-bodegas.json` sin modificar inventario. Validar las diferencias antes de cualquier distribución por bodega.
- **Respaldos:** ejecutar `bash scripts/backup.sh` con `MONGODB_URI`. Restaurar SOLO en una base aislada de pruebas mediante `CONFIRMAR_RESTAURACION=SI_EN_PRUEBAS bash scripts/restaurar-backup.sh archivo.archive.gz`. Verificar después conteos y referencias.
- **SMTP:** configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` y `RESET_URL` en `backend/.env`. Probar con buzón de pruebas, sin publicar credenciales.
- **Dependencias:** ejecutar `npm ci` en `backend/` y `frontend/` por separado; luego `npm test` en backend y `npm run build` en frontend.
- **Pendientes:** notificaciones programadas, interfaz completa de cotizaciones, integración de todas las rutas con permisos y pruebas E2E de restauración. No usar esta ampliación en producción sin verificaciones.


## Integración fase 2: permisos, alertas, cotizaciones y recuperación

- **Permisos granulares:** las rutas de clientes, proveedores, inventario, órdenes de compra, pagos, cartera, devoluciones, documentos, usuarios, reportes, eventos y configuración ahora requieren permiso `modulo.leer|crear|editar|eliminar` según el método HTTP, además del rol existente. **Migración obligatoria:** asignar permisos a usuarios no administradores antes de habilitar la actualización; de lo contrario recibirán 403. No conceder permisos masivos automáticamente.
- **Cotización a pedido:** la conversión valida estado y vencimiento, descuenta stock, crea pedido y registra vínculo dentro de la misma transacción MongoDB. Exige replica set, índices creados y prueba de concurrencia real antes de producción. Los precios de la cotización no se preservan todavía: el pedido utiliza precios vigentes del catálogo; validar política comercial.
- **Notificaciones:** monitor de stock bajo y pedidos pendientes, cada `ALERTAS_INTERVALO_MIN` (15 por defecto; 0 desactiva). Se guardan en MongoDB; **no se envían correos automáticos**. En varias réplicas usar un solo scheduler.
- **SMTP:** copiar `backend/.env.example` a `backend/.env`, configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`, `RESET_URL`; usar contraseña de aplicación o credenciales de proveedor. No subir `.env` al repositorio. Validar entrega real de correo y DNS SPF/DKIM/DMARC antes de producción.
- **Dependencias:** desde `backend/` ejecutar `npm ci`, luego `npm test`; desde `frontend/` ejecutar `npm ci` y `npm run build`. Requiere Node.js compatible y acceso al registro npm.
- **Conciliación:** `cd backend && node scripts/conciliarBodegas.js`; revisar diferencias, respaldar y aprobar antes de asignar stock por bodega. Nunca crear existencias de bodegas desde stock global sin aprobación.
- **Restauración:** crear backup con `scripts/backup.sh`; para ensayar usar `MONGODB_URI` (origen), `MONGODB_TEST_URI` (destino aislado), y `bash scripts/probar-restauracion.sh respaldo.archive.gz`. Nunca usar producción como destino.
- **Lector:** compatible con lector USB/Bluetooth en modo teclado; cámara de móvil, EAN/UPC y pruebas de hardware quedan pendientes.
- **Pendientes críticos:** pruebas end-to-end de frontend, validación de precios en cotizaciones, índices y permisos en usuarios existentes, restauración real con MongoDB disponible.


## Fase 3 — Correcciones de integridad y validación (noviembre de 2026)

### Conversión atómica de cotizaciones

`POST /api/avanzado/cotizaciones/:id/convertir` delega la creación al controlador
`pedidoController.crear`, pasando `cotizacionRef`. La creación del pedido, el descuento
de stock, los movimientos y la vinculación de la cotización se realizan en una misma
transacción MongoDB. El modelo `Pedido` incluye un índice único de `cotizacionRef`.
Se eliminó el enlace asíncrono posterior a la respuesta HTTP. Los descuentos se
calculan con la lógica actual de pedidos (precios vigentes del producto); **revisar
con negocio si deben respetarse precios congelados de la cotización**.

**Requisito:** MongoDB replica set, incluidos entornos locales de pruebas.
No activar `PERMITIR_SIN_TRANSACCION` en uso real; el código ahora solo permite
esa excepción cuando `NODE_ENV=test`. Antes de operar, crear y verificar los
índices únicos y probar dos conversiones simultáneas de la misma cotización.

### SMTP y recuperación de contraseña

Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
`SMTP_SECURE` y `RESET_URL` en `backend/.env` (nunca subir credenciales).
Comprobar la conexión sin enviar correo con `cd backend && npm run smtp:verificar`.
Después realizar una recuperación real desde una cuenta de pruebas, verificar
la recepción, caducidad y un solo uso del enlace. Sin SMTP configurado no se
genera un token de recuperación inutilizable.

### Instalación y pruebas pendientes de infraestructura

```bash
cd backend && npm ci && npm test
cd ../frontend && npm ci && npm run build
```

La prueba automatizada `backend/tests/conversion-integridad.test.js` verifica
invariantes de código, **no sustituye** las pruebas de integración concurrente.
La restauración de respaldo debe hacerse únicamente en una base aislada, vacía,
con credenciales y URL distintas a producción:

```bash
cd backend
MONGODB_URI='mongodb://origen/mi_base' \
MONGODB_TEST_URI='mongodb://pruebas/base_vacia' \
bash scripts/probar-restauracion.sh /ruta/respaldo.archive.gz
```

Validar posteriormente recuentos, integridad de pedidos, productos, clientes y
movimientos. No se ha efectuado una restauración real en esta entrega.

### Estado real de esta entrega

- Se corrigió la ruta de conversión y se agregó validación condicional de stock.
- Se eliminaron duplicaciones del controlador de recuperación.
- Se incorporó verificador SMTP comentado y pruebas de regresión estructurales.
- Se conservan los permisos granulares y el monitor de alertas de la Fase 2.
- **No verificado en este entorno:** conexión SMTP, compilación Angular,
  integración MongoDB, concurrencia real ni restauración de respaldos.

## Fase 4 — Precios aprobados y validación de servicios

### Precios de cotizaciones
- Al crear una cotización se toma el precio del catálogo en el servidor y se guarda una instantánea por línea. Los precios enviados desde el navegador no se consideran fuente autorizada.
- Al convertirla, el controlador vuelve a leer la cotización aceptada dentro de la transacción MongoDB y utiliza sus precios guardados, no los precios actuales del catálogo.
- Se verifican productos, cantidades, cliente, descuento, subtotal y total. Si hay discrepancias, la operación se rechaza.
- Para descuentos especiales o negociación de precios se requiere una funcionalidad de aprobación adicional; no se deben editar documentos directamente en la base de datos.

### Preparar entorno local de prueba (sin compartir secretos)
1. Instalar Node.js compatible, npm, MongoDB y MongoDB Database Tools (`mongodump` y `mongorestore`).
2. En `backend`, copiar `.env.example` a `.env` y establecer `JWT_SECRET` aleatorio, `MONGODB_URI` de **pruebas** y configuración SMTP de una cuenta de pruebas.
3. Configurar MongoDB como replica set; las transacciones del sistema lo requieren. No activar `PERMITIR_SIN_TRANSACCION` fuera de pruebas.
4. Ejecutar `cd backend && npm ci && npm test && npm run smtp:verificar`.
5. Ejecutar `cd frontend && npm ci && npm run build`; revisar el nombre exacto del comando en `frontend/package.json`.
6. Realizar una cotización aceptada de prueba, cambiar el precio de catálogo y convertirla. Confirmar que el pedido conserve el precio cotizado y que un segundo intento devuelva conflicto sin descontar stock.
7. Crear un respaldo de una base **de pruebas**, restaurarlo en otra base aislada y comparar recuentos de documentos y valores de inventario. Nunca restaurar encima de producción.

**Límites de validación:** las pruebas unitarias no reemplazan una prueba de concurrencia, un envío SMTP real ni una restauración efectiva. No se deben introducir contraseñas en archivos versionados ni en el README.


## Auditoría estática y documentación — noviembre de 2026

Esta edición añade encabezados explicativos a los archivos JavaScript y TypeScript, y documentación JSDoc a controladores HTTP que no la tenían. **Los encabezados no equivalen a documentación individual de todas las variables y métodos**; se debe completar esa tarea conforme se refactorice cada módulo. No se ejecutaron pruebas funcionales ni integración por solicitud del propietario.

### Correcciones preventivas aplicadas

- La lista de pedidos restringe `limite` a 1–100, valida `pagina` y permite únicamente campos de ordenamiento conocidos.
- La creación de pedidos rechaza productos repetidos, identificadores inválidos y cantidades no enteras o no positivas, antes de modificar inventario.
- Se preservaron rutas, contratos HTTP y la estructura original de datos.

### Riesgos pendientes (NO corregidos en esta entrega)

1. **Crítico:** cancelar pedidos ejecuta anulaciones documentales, reposición de stock y cambio de estado fuera de una transacción única; pueden quedar estados parciales. Refactorizar con sesión transaccional y transiciones válidas.
2. **Alto:** verificar que devoluciones, ajustes y transferencias entre bodegas sean atómicos y que los movimientos registren ubicación y referencia de origen.
3. **Alto:** comprobar permisos de lectura/escritura por recurso, no solo por rol o ruta; revisar filtrado de datos personales.
4. **Alto:** revisar la exposición de `error.message` en respuestas HTTP y normalizar errores seguros; registrar detalles únicamente en servidor.
5. **Alto:** realizar revisión de dependencias con `npm audit` en un entorno controlado; el usuario reportó 70 alertas en frontend, incluidas 3 críticas. No ejecutar actualizaciones forzadas sin análisis de compatibilidad.
6. **Medio:** iniciar monitores programados tras confirmar conexión con MongoDB, gestionar cierre y evitar ejecuciones duplicadas en despliegues con varias réplicas.
7. **Medio:** añadir validación de esquemas para cuerpos y parámetros, índices de consulta y límites de tasa a endpoints sensibles.
8. **Medio:** revisar consistencia de precios, impuestos, redondeos y estados de cotizaciones y pedidos.
9. **Medio:** documentar políticas de retención, cifrado y restauración de copias; jamás restaurar sobre producción sin aprobación.
10. **Medio:** incorporar documentación OpenAPI, diagramas de flujos, matriz de permisos y pruebas de regresión al finalizar el refactor.

### Convenciones de documentación

- **Funciones públicas:** JSDoc con propósito, parámetros, retorno, errores y efectos secundarios.
- **Variables:** explicar las que representen reglas comerciales o tengan unidades no obvias; evitar comentarios triviales.
- **Controladores:** documentar contrato HTTP, validaciones y permisos.
- **Modelos:** documentar campos sensibles, índices y relaciones.
- **Transacciones:** identificar explícitamente qué escrituras deben confirmarse juntas.
- **Frontend:** documentar entradas, salidas, estados, servicios y mensajes de error.

### Estado de validación

Revisión estática y documentación únicamente. Compilación Angular, pruebas automatizadas, MongoDB real, SMTP y restauración de respaldos: **pendientes**.

## Revisión secuencial de integridad (noviembre de 2026)
Consultar [REVISION_SECUENCIAL.md](REVISION_SECUENCIAL.md) para conocer las correcciones de cancelación transaccional, conciliación de existencias, tratamiento de errores y secuenciación de arranque. Los cambios se entregan para revisión; las pruebas funcionales e integrales se realizarán al finalizar las fases de código.


## Revisión de integridad transaccional
Consultar [INTEGRIDAD_TRANSACCIONAL.md](INTEGRIDAD_TRANSACCIONAL.md) para reglas de estados, trazabilidad, bodegas y pendientes de cartera.

## Documentación técnica — Fase 6

- [Arquitectura](docs/ARQUITECTURA.md)
- [Manual técnico](docs/MANUAL_TECNICO.md)
- [Manual de usuario](docs/MANUAL_USUARIO.md)
- [Inventario de API](docs/INVENTARIO_API.md)
- [Revisión secuencial](docs/REVISION_FASE6.md)

**Nota:** se posponen las pruebas funcionales y de integración para la fase final.


## Fase 7 — endurecimiento y documentación
Consultar `docs/REVISION_FASE7.md` y `docs/openapi-preliminar.json`. **Los pagos nuevos requieren encabezado `Idempotency-Key`** (16–128 caracteres alfanuméricos, guion o guion bajo); actualizar los clientes Angular antes de habilitar pagos. La conciliación es de solo lectura.


## Requisitos de backend: JWT, express-validator y CRUD

Consultar [docs/REQUISITOS_BACKEND.md](docs/REQUISITOS_BACKEND.md). El backend incluye autenticación JWT, modelos Usuario/Producto, CRUD de productos y validaciones declarativas. Ejecutar `npm install` en `backend/` para instalar la dependencia nueva.

## Requisitos frontend (Fase 9)
Ver [docs/REQUISITOS_FRONTEND.md](docs/REQUISITOS_FRONTEND.md) para registro con datos de perfil, ficha CARD, CRUD y diseño adaptable.


## Fase 10: accesibilidad y experiencia móvil

Ver [docs/REVISION_FRONTEND_FASE10.md](docs/REVISION_FRONTEND_FASE10.md) para cambios, decisiones y pendientes.

### Fase 11 — Organización y validaciones del frontend

Consultar [`docs/REVISION_FRONTEND_FASE11.md`](docs/REVISION_FRONTEND_FASE11.md). Se añadieron utilidades compartidas de errores HTTP y formularios, tipos para el resumen de pedidos y comentarios de mantenimiento. Las pruebas de ejecución se mantienen pendientes para la fase final.


### Fase 12 — Integración financiera Angular
Ver [docs/REVISION_FRONTEND_FASE12.md](docs/REVISION_FRONTEND_FASE12.md) para cambios y riesgos pendientes.

## Fase 13 — operaciones concurrentes

Consultar [docs/REVISION_FASE13.md](docs/REVISION_FASE13.md) para cambios y riesgos pendientes. Las pruebas funcionales se realizarán al final.


### Fase 14
Consultar `docs/REVISION_FASE14.md` para reposiciones multibodega, histórico fiscal y reintentos seguros.


## Fase 15
Histórico fiscal por línea e idempotencia de devoluciones. Véase `docs/REVISION_FASE15.md`.

## Fase 16 — Integridad fiscal e idempotencia

Consultar `docs/REVISION_FASE16.md`. Para identificar facturas históricas incompletas (solo lectura): `cd backend && npm run auditar:facturas`.


### Fase 17 — Seguridad y validaciones
Consultar `docs/REVISION_FASE17.md` para el alcance y los pendientes de validación.


### Fase 18 — Seguridad y validaciones
Ver [`docs/REVISION_FASE18.md`](docs/REVISION_FASE18.md) para matriz de roles, protección del login, validaciones de usuarios/clientes y limitaciones.


## Fase 19 — Seguridad y validaciones
Ver [docs/REVISION_FASE19.md](docs/REVISION_FASE19.md).


## Fase 20: titularidad y navegación
Ver [docs/REVISION_FASE20.md](docs/REVISION_FASE20.md).


### Fase 21 — Titularidad financiera
Ver `docs/REVISION_FASE21.md` para controles de acceso de pagos, devoluciones, cartera y reportes.


## Fase 22 — Auditoría operativa

Consulta [docs/REVISION_FASE22.md](docs/REVISION_FASE22.md) para las correcciones de seguridad y el plan de evolución empresarial.


## Fase 23 — Funciones empresariales

Consultar [docs/REVISION_FASE23.md](docs/REVISION_FASE23.md) para los ocho módulos, endpoints y limitaciones. Las nuevas rutas están bajo `/api/empresa` y requieren JWT.


### Fase 24
Ver `docs/REVISION_FASE24.md` para las mejoras de caja, aprobación concurrente y auditoría y sus límites.


## Fase 25
Ver `docs/REVISION_FASE25.md` para alcance empresarial y limitaciones.


## Fase 26
Ver `docs/REVISION_FASE26.md` para segregación parcial por sede, importación JSON atómica y contrato fiscal.


Fase 27: ver [alcance por sucursal y contrato fiscal](docs/REVISION_FASE27.md).

### Fase 28 — Escrituras por sucursal y proveedor electrónico
Ver [docs/REVISION_FASE28.md](docs/REVISION_FASE28.md). Se agregan verificaciones de sede para operaciones comerciales de escritura y un adaptador HTTP configurable, **sin emisión DIAN real**.


Fase 31: ver `docs/REVISION_FASE31.md` para recepciones por bodega y transferencias transaccionales.


Fase 32: consultar `docs/REVISION_FASE32.md` (cartera por sucursal y formulario de transferencias).

- [Revisión de Fase 34](docs/REVISION_FASE34.md): idempotencia y atomicidad de transferencias.

- [Fase 35 — Auditoría de transferencias](docs/REVISION_FASE35.md)

- [Fase 36: diagnóstico de inventario por sucursal](docs/REVISION_FASE36.md)


Fase 37: ver `docs/REVISION_FASE37.md` para los controles de concurrencia de movimientos manuales.

### Fase 38 — Pruebas de comportamiento

Ver [`docs/REVISION_FASE38.md`](docs/REVISION_FASE38.md) para los casos automatizados de transferencias y sus limitaciones.


### Fase 39
Ver [docs/REVISION_FASE39.md](docs/REVISION_FASE39.md) para pruebas de integridad y concurrencia opcional.


## Fase 40

Estabilización de movimientos manuales: transacciones, idempotencia opcional y selector de bodega Angular. Ver [revisión técnica](docs/REVISION_FASE40.md).

### Fase 41 — Verificación operativa
Consultar `docs/REVISION_FASE41.md`. Comando de diagnóstico de solo lectura: `cd backend && npm run verificar:preparacion`.

## Fase 42: estabilización y puerta de calidad

Ver [`docs/REVISION_FASE42.md`](docs/REVISION_FASE42.md). El backend incluye `npm run verificar:calidad`; el informe no considera exitosa la compilación Angular cuando no están sus dependencias. Los movimientos manuales ahora exigen `Idempotency-Key`.

- [Fase 43: puerta de calidad y transacciones](docs/REVISION_FASE43.md)

## Fase 44

Ver [revisión técnica de la Fase 44](docs/REVISION_FASE44.md): pruebas de autorización por sucursal, filtro de movimientos y revisión de referencias Angular.


## Fase 45 — CI y pruebas de integración
Ver [docs/REVISION_FASE45.md](docs/REVISION_FASE45.md). Se agregó `.github/workflows/calidad.yml` para ejecutar pruebas del backend y compilación Angular en GitHub Actions; el flujo aún requiere ejecutarse en un repositorio remoto.


### Fase 46 — Integración CI obligatoria
Se corrigió el arranque de MongoDB en replica set en GitHub Actions y se añadió un ejecutor que rechaza pruebas de integración omitidas. Ver [docs/REVISION_FASE46.md](docs/REVISION_FASE46.md).

- Fase 47: pruebas reales de rollback e índices únicos (preparadas para CI), diagnóstico de dependencias y [revisión](docs/REVISION_FASE47.md).

- Fase 48: ver `docs/REVISION_FASE48.md`.


### Fase 49
Véase `docs/REVISION_FASE49.md` para la paginación del historial de transferencias y sus límites.

### Fase 50 — Auditoría cruzada de transferencias

Consultar [`docs/REVISION_FASE50.md`](docs/REVISION_FASE50.md). Con MongoDB configurado, ejecutar `cd backend && npm run auditar:transferencias-completo` para revisar en modo solo lectura las transferencias y sus movimientos asociados.

### Fase 51 — Importación Excel y reposición protegida

La pantalla administrativa `/empresa` permite leer XLSX/XLS, validar y confirmar lotes de hasta 200 productos nuevos. La importación es transaccional y no carga existencias. El pronóstico global de reposición está limitado a administradores. Ver `docs/REVISION_FASE51.md`.

- Fase 52: [reposición segregada por sucursal](docs/REVISION_FASE52.md).

- Fase 53: ver `docs/REVISION_FASE53.md` (reposición por proveedor y compras en tránsito).

- **Fase 54:** demanda comercial por pedidos y separación de órdenes de compra vencidas en reposición (`docs/REVISION_FASE54.md`).

- Fase 55: ver `docs/REVISION_FASE55.md` para clasificación de compras por horizonte y fecha esperada.

### Fase 56 — Horizonte por producto
La clasificación de compras en camino considera el plazo de entrega de cada proveedor por línea, en lugar de aplicar un único horizonte general a todos los productos. Consulte `docs/REVISION_FASE56.md`.

### Fase 57
La reposición por sucursal muestra indicadores de calidad del pronóstico y permite exportar el resultado autorizado en CSV. Ver `docs/REVISION_FASE57.md`.

- Fase 58: consistencia de pronósticos y protección contra respuestas HTTP obsoletas; ver `docs/REVISION_FASE58.md`.

- Fase 59: seguimiento paginado y segregado de compras pendientes por sucursal (`docs/REVISION_FASE59.md`).

- Fase 60: exportación CSV de página de compras pendientes y controles de rango numérico (`docs/REVISION_FASE60.md`).

### Fase 61: auditoría de recepciones de compras
Consultar `docs/REVISION_FASE61.md` y ejecutar `npm run auditar:recepciones-compras` desde backend.

## Fase 62
Consultar `docs/REVISION_FASE62.md` para la auditoría escalable de compras.


Fase 63: auditoría de integridad de compras con filtros operativos; consultar `docs/REVISION_FASE63.md`.

- Fase 64: auditoría de recepciones con rango de fechas y validación estricta (ver `docs/REVISION_FASE64.md`).

- Fase 65: conciliación monetaria de órdenes de compra. Ver `docs/REVISION_FASE65.md`.

- **Fase 66:** auditoría de trazabilidad temporal e identificadores duplicados de recepciones (`docs/REVISION_FASE66.md`).

- Fase 67: conciliación de egresos a proveedores (`docs/REVISION_FASE67.md`).

- Fase 68: auditoría de egresos sin orden o con orden inexistente. Ver `docs/REVISION_FASE68.md`.

- **Fase 69:** auditoría de vínculos cruzados de egresos fuera del alcance de la primera conciliación. Ver `docs/REVISION_FASE69.md`.


### Fase 70
Ver [conciliación financiera con memoria acotada](docs/REVISION_FASE70.md).


Fase 71: controles de referencias de sucursal y proveedor en egresos. Ver `docs/REVISION_FASE71.md`.


**Fase 72:** ver `docs/REVISION_FASE72.md` para la validación de importes y estados en egresos huérfanos y órdenes fuera del filtro de conciliación.

- **Fase 73:** puerta de calidad con conteos TAP verificados, advertencias por pruebas omitidas y bloqueo explícito por compilación no disponible (`docs/REVISION_FASE73.md`).
# proyecto-final-MEAN-Stack
# proyecto-final-MEAN-Stack
