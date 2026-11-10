# Fase 12 — Formularios financieros y comerciales

## Cambios
- CarteraService envía `Idempotency-Key` en cobros, egresos y reembolsos.
- PagoModal genera un UUID seguro por intento, conserva la misma clave **y el mismo cuerpo** durante reintentos, deshabilita edición del formulario y evita doble clic.
- Errores HTTP estandarizados en pagos, devoluciones y creación de pedidos.
- Devoluciones: validación local de unidades y monto de reembolso; el servidor sigue siendo autoridad.
- Comentarios de reglas de negocio y utilidad compartida de idempotencia.

## Riesgos que siguen abiertos (alta prioridad)
1. El backend responde 409 ante clave repetida, pero **no devuelve el resultado del primer intento**. Ante 409 o error de red debe consultarse el movimiento antes de generar una clave nueva.
2. El backend de devoluciones **no implementa una clave de idempotencia**. La protección del formulario contra doble clic no garantiza unicidad entre pestañas, reintentos o sesiones.
3. Los pagos simultáneos con **claves diferentes** aún requieren serialización/bloqueo transaccional del saldo.
4. La validación de stock, cantidades devueltas y precios históricos debe ocurrir en backend con transacciones y restricciones de datos.
5. El proyecto aún requiere compilación Angular, pruebas unitarias, de integración y pruebas reales MongoDB, todas aplazadas por solicitud del usuario.

## Recomendación para pruebas finales
Probar doble clic, pérdida de conexión después de guardar, reintento con misma clave, concurrencia con claves distintas, devolución duplicada y saldo insuficiente.
