# Fase 38 — Pruebas de comportamiento de transferencias

## Alcance

Se agregaron nueve pruebas de comportamiento en `backend/tests/fase38-transferencias-comportamiento.test.js` mediante el módulo nativo `node:test` y dobles de prueba de los modelos MongoDB.

Los casos cubren: transferencia válida, insuficiencia de saldo, restricción de sede, reversión simulada ante fallo, reintento idempotente, reutilización indebida de clave, validación de parámetros, revocación de permiso antes de reintento y producto inexistente.

**Importante:** los dobles de prueba simulan la reversión de la transacción. No verifican el comportamiento real de MongoDB, los índices únicos, la concurrencia ni las propiedades ACID del servidor.

## Ejecución

Desde `backend`:

```bash
node --test tests/fase38-transferencias-comportamiento.test.js
npm test
```

## Resultado en el entorno de desarrollo

Se ejecutó `node --test tests/*.test.js` y finalizaron correctamente las 43 pruebas disponibles. No se instaló ni inició MongoDB. No se compiló Angular.

## Próximas validaciones obligatorias

1. Instalar dependencias y configurar MongoDB como replica set de pruebas.
2. Verificar índice único de `TransferenciaInventario.claveIdempotencia` y `Existencia(producto,bodega)`.
3. Ejecutar transferencias simultáneas con stock limitado, inyección de fallos reales y reintentos concurrentes.
4. Probar JWT y permisos de dos usuarios con sucursales diferentes sobre endpoints reales.
5. Compilar Angular y comprobar los flujos de UI y errores de red.
6. Conciliar inventario histórico antes de una migración o despliegue productivo.

La versión sigue siendo de desarrollo; las pruebas simuladas no certifican aptitud para producción.
