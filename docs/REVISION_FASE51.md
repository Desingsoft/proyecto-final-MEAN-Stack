# Fase 51 — Importación Excel desde Angular y protección de reposición global

## Cambios efectivos

1. La pantalla `/empresa` admite seleccionar archivos `.xlsx`/`.xls` de hasta 2 MB y extraer hasta 200 filas de la primera hoja mediante la dependencia `xlsx` ya declarada en el frontend. Los encabezados son exactos: `sku`, `nombre`, `precio`, `costo`, y opcionalmente `categoria`, `stockMinimo`.
2. Se validan encabezados, límites y valores numéricos. No se convierten silenciosamente valores con separadores de miles. El archivo original no se sube; se envía JSON al backend.
3. Flujo de dos pasos: `POST /api/empresa/importar/productos/previsualizar` y, tras confirmación explícita, `POST /api/empresa/importar/productos/confirmar`. Este último usa la transacción MongoDB existente y registra stock inicial cero. El backend vuelve a comprobar los SKU antes de insertar.
4. Los endpoints `/api/empresa/reposicion` y `/api/empresa/reposicion/pronostico` se restringieron a administradores, pues su cálculo actual utiliza datos globales de la empresa. Los usuarios locales no deben consultar esos totales hasta contar con un cálculo verdaderamente segregado.
5. Se incorporaron seis pruebas de regresión y seguridad en `backend/tests/fase51-excel-seguridad.test.js`.

## Verificaciones de esta entrega

- `npm test` desde `backend`: 150 aprobadas, 0 fallidas, 3 omitidas por falta de MongoDB de pruebas.
- `npm run verificar:referencias-angular`: 97 archivos TS y 425 referencias locales revisadas, sin errores detectados.
- Sintaxis de `empresaRoutes.js` revisada con `node --check`.
- No se ejecutó compilación Angular porque las dependencias no están instaladas en este entorno. La revisión de referencias no equivale a compilar.

## Limitaciones y riesgos restantes

- No se ha verificado el comportamiento real de `xlsx` en navegador ni la compilación Angular.
- La vista previa no reserva SKU: otro usuario podría crear un producto entre la vista previa y la confirmación; el backend vuelve a validar y rechaza la transacción en caso de conflicto.
- El backend limita a 200 productos por lote y requiere MongoDB con transacciones.
- No se importan existencias desde Excel: se deben ingresar por operaciones de inventario con bodega y sucursal autorizadas.
- La integración real de facturación electrónica sigue pendiente de proveedor autorizado, credenciales y habilitación DIAN.
- Se necesitan pruebas funcionales reales de seguridad multisucursal, concurrencia, compras, ventas, pagos, cartera e inventario.

## Procedimiento manual de aceptación

1. Iniciar MongoDB de pruebas como replica set, backend y frontend.
2. Entrar como administrador y abrir `/empresa`.
3. Preparar Excel con `sku,nombre,precio,costo,categoria,stockMinimo` y 2 productos nuevos.
4. Validar; comprobar que se muestren 2 válidos y que no se creen productos todavía.
5. Confirmar; verificar creación de 2 productos con stock cero.
6. Repetir la importación; verificar que se rechace por SKU duplicado sin inserción parcial.
7. Probar precio negativo, SKU duplicado en archivo, columnas no permitidas, archivo mayor a 2 MB y más de 200 filas.
8. Entrar como bodeguero y verificar que no pueda consultar `/api/empresa/reposicion/pronostico`.

**Estado:** desarrollo, no aprobado para producción.
