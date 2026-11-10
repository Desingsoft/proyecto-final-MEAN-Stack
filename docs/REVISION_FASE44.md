# Fase 44 — Endurecimiento de autorización y verificación del frontend

## Alcance

Se parte de la Fase 43, sin eliminar módulos ni alterar datos empresariales.

### Cambios de código

1. `backend/controllers/inventarioController.js`: el listado de movimientos respeta un filtro de sucursal explícito, valida ObjectId y rechaza solicitudes a sedes fuera del alcance autorizado. Se mantiene el filtro de todas las sedes asignadas cuando no se solicita una sede particular.
2. `backend/tests/fase44-autorizacion-operaciones.test.js`: 10 pruebas de comportamiento de middleware de escritura (bodega, pedido, documento, inactivos, inexistentes y administrador), con modelos simulados.
3. `backend/tests/fase44-consulta-movimientos.test.js`: 5 pruebas de comportamiento del filtro de movimientos (sede asignada, ajena, inválida y administrador).
4. `backend/scripts/verificarReferenciasAngular.js`: análisis estático de referencias locales en TypeScript y archivos `templateUrl`, `styleUrl` y `styleUrls`.
5. `backend/tests/fase44-referencias-angular.test.js`: 2 pruebas de la verificación y su inclusión en la puerta de calidad.
6. `backend/scripts/puertaCalidad.js`: ejecuta también la verificación de referencias Angular sin requerir Angular CLI.
7. `backend/package.json`: nuevo comando `npm run verificar:referencias-angular`.

### Comandos

```bash
cd backend
npm test
npm run verificar:referencias-angular
npm run verificar:calidad
```

### Límites de las verificaciones

- Las pruebas de middleware usan dobles de modelos, no MongoDB real.
- La comprobación de referencias Angular **no** valida tipado, templates, estilos ni bundles; se requiere `npm ci && npm run build` en frontend.
- La prueba MongoDB real permanece omitida sin una conexión de prueba configurada.
- La puerta de calidad se mantiene **no aprobada** hasta completar la compilación y las pruebas de integración.
- No se modifica información histórica, saldos ni se ejecutan migraciones.

### Próximas prioridades

1. Instalar dependencias del frontend y compilar en un entorno con acceso a paquetes.
2. Ejecutar integración de MongoDB con replica set y usuarios de varias sedes.
3. Pruebas de extremo a extremo de compras, inventario, pagos, cartera y facturación.
4. Seleccionar proveedor autorizado y configurar la integración electrónica DIAN; no se ha emitido ninguna factura real.
