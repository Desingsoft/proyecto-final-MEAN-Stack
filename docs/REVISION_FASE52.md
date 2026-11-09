# Fase 52 — Reposición por sucursal

## Implementado
- `GET /api/empresa/sucursales/:id/reposicion`: autenticación, permiso de lectura de inventario y validación de acceso a la sucursal en base de datos.
- Calcula existencias desde bodegas activas de la sede; nunca usa `Producto.stock` como stock local.
- Excluye salidas marcadas con `transferenciaId` para no confundir traslados internos con demanda.
- Parámetros `dias` y `plazo` enteros con límites explícitos.
- Pantalla de administración empresarial con selector de sede y tabla de sugerencias.
- Pruebas unitarias del cálculo y validación de parámetros.

## Limitaciones
- La demanda se aproxima con salidas históricas, no exclusivamente ventas confirmadas; se requiere depurar causas de movimientos y vincular plazos reales de proveedores.
- No descuenta pedidos pendientes de recepción ni aplica estacionalidad.
- La pantalla se agregó al módulo administrativo; no reemplaza una vista de bodega dedicada.
- Falta compilación real de Angular y pruebas de integración con MongoDB.
