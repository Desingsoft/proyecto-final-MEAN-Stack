# Fase 72 — Integridad de egresos fuera de la conciliación principal

La segunda pasada de la auditoría financiera ahora valida también `monto` (entero positivo seguro) y `estado` (`vigente` o `anulado`) de egresos sin orden, con orden inexistente y asociados a órdenes fuera del filtro principal. Se preservan los diagnósticos de vínculo y se omiten las validaciones repetidas de órdenes ya conciliadas. La consulta MongoDB proyecta los dos campos necesarios. No se realizan escrituras.

## Ejecución

Desde `backend`: `npm test` y, con `MONGODB_URI` configurado, `npm run auditar:egresos-compras`.

## Limitaciones

Las pruebas automatizadas de esta fase utilizan objetos de prueba, no una instancia MongoDB real. Se requiere compilar Angular y realizar pruebas transaccionales e integrales antes de producción. Los importes se interpretan como unidades enteras según el modelo actual.
