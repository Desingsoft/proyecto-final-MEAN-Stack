/**
 * Archivo: eventoRoutes.js
 * Propósito: Enrutador Express: define endpoints, autenticación y autorización.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const permiso = require('../middlewares/permiso'); // Control granular por operación.
const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const { suscribir } = require('../utils/eventos');

// GET /api/eventos - canal de cambios en tiempo real (text/event-stream)
router.get('/', verifyToken, permiso('eventos.leer'), (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 4000\n\n');
  res.write(`event: conectado\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  suscribir(res);
});

module.exports = router;
