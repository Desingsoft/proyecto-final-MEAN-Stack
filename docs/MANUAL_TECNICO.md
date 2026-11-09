# Manual técnico

## Requisitos
- Node.js 22 compatible con la versión Angular del proyecto; npm.
- MongoDB accesible mediante `MONGODB_URI`; replica set para transacciones.
- Variables de entorno en `backend/.env` a partir de `backend/.env.example`.

## Desarrollo local (PowerShell)
```powershell
cd backend
npm ci
npm run dev
# En otra terminal:
cd frontend
npm ci
npm start
```

## Configuración y seguridad
- Nunca incluir `.env`, contraseñas, tokens o respaldos con datos personales en el ZIP o repositorio.
- Configurar `JWT_SECRET` largo y aleatorio, `CORS_ORIGINS` y credenciales SMTP desde el entorno.
- Validar los permisos de cada rol antes de habilitar usuarios reales.
- Mantener actualizado el inventario de dependencias; evitar `npm audit fix --force` sin revisión.

## Inventario y transacciones
- Conciliar existencias por bodega usando `backend/scripts/conciliarBodegas.js` antes de migrar stock.
- Documentar la bodega de origen en cada salida y la bodega de retorno en cancelaciones.
- Reversar salidas solo una vez y vincular movimientos a su pedido/devolución.
- No ejecutar restauraciones sobre la base de producción; utilizar una base aislada y verificar conteos.

## Orden de verificación al final
1. Sintaxis y dependencias.
2. Compilación Angular.
3. Conexión MongoDB y permisos.
4. Pruebas de transacciones y concurrencia.
5. SMTP con cuenta de pruebas.
6. Restauración aislada y comprobación de integridad.
7. Pruebas responsive, accesibilidad y regresión.

## Diagnóstico de memoria en Windows
`VirtualAlloc errno=1455` indica agotamiento de memoria comprometida: revisar archivo de paginación y memoria disponible antes de atribuirlo al código.
