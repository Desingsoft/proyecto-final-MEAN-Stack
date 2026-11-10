# Fase 55: Horizonte de abastecimiento y fechas inciertas

La reposición por sucursal distingue cuatro clases de órdenes de compra abiertas: entregas dentro del horizonte de abastecimiento, atrasadas, sin fecha y posteriores al horizonte. Solo las entregas dentro del horizonte reducen la compra sugerida. Las demás se informan en columnas separadas. Las comparaciones se hacen por día UTC, evitando marcar como atrasada una entrega prevista para el mismo día. Se rechazan fechas inválidas y cantidades de compra inconsistentes.

**Limitación:** no se consideran reservas, estacionalidad, devoluciones ni retrasos probabilísticos. El horizonte se toma del parámetro `plazo` de la consulta, y no se adapta individualmente al plazo de cada proveedor para clasificar la fecha. Compilación Angular y pruebas MongoDB real pendientes.
