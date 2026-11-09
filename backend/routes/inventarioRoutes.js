const { objeto, identificador, monto, porcentaje, items, claveIdempotencia, aplicar } = require('../middlewares/validacionesComerciales');
/**
 * Archivo: inventarioRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const { cargar } = require('../middlewares/alcanceSucursal');
const { porBodega } = require('../middlewares/sucursalOperaciones');

router.get('/movimientos', verifyToken, permiso('inventario.leer'), cargar, inventarioController.obtenerMovimientos);
// Solo bodegas activas de las sucursales autorizadas, para selector de transferencias.
router.get('/bodegas-autorizadas', verifyToken, checkRole(['admin', 'bodeguero']), permiso('inventario.leer'), cargar, async (req, res, next) => {
  try {
    const Bodega = require('../models/Bodega');
    const filtro = req.alcanceSucursales === null ? {} : { sucursal: { $in: req.alcanceSucursales } };
    const bodegas = await Bodega.find({ activa: true, sucursal: { $exists: true, $ne: null }, ...filtro }).select('nombre sucursal').sort({ nombre: 1 }).lean();
    res.json(bodegas);
  } catch (error) { next(error); }
});
router.get('/transferencias', verifyToken, checkRole(['admin', 'bodeguero']), permiso('inventario.leer'), cargar, inventarioController.listarTransferencias);
router.get('/transferencias/:id', verifyToken, checkRole(['admin', 'bodeguero']), permiso('inventario.leer'), cargar, inventarioController.obtenerTransferencia);
router.post('/transferencias', verifyToken, checkRole(['admin', 'bodeguero']), permiso('inventario.crear'), cargar, ...aplicar(objeto), inventarioController.transferir);
router.post('/movimiento', verifyToken, checkRole(['admin', 'bodeguero']), permiso('inventario.crear'), ...aplicar(objeto), ...porBodega('bodega'), inventarioController.registrar);

module.exports = router;
