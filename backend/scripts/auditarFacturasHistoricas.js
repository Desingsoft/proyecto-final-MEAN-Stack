/**
 * Auditoría de solo lectura de facturas antiguas sin instantánea fiscal por línea.
 * Ejecutar manualmente con MongoDB configurado: npm run auditar:facturas
 * NO migra ni cambia documentos. Exporta un reporte JSON sin datos personales.
 */
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Documento = require('../models/Documento');
const CAMPOS = ['descuentoValor', 'base', 'ivaPorcentaje', 'ivaValor', 'total'];
const esImporte = (v) => Number.isSafeInteger(v) && v >= 0;
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  await mongoose.connect(process.env.MONGODB_URI);
  const pendientes = [];
  let examinadas = 0;
  const cursor = Documento.find({ tipo: 'factura' }).select('_id numero estado items total base ivaValor descuentoValor').lean().cursor();
  for await (const factura of cursor) {
    examinadas++;
    const errores = [];
    if (!Array.isArray(factura.items) || factura.items.length === 0) errores.push('sin_items');
    const skus = new Set();
    for (const [indice, item] of (factura.items || []).entries()) {
      if (!item.sku || skus.has(item.sku)) errores.push(`sku_ausente_o_duplicado:${indice}`);
      skus.add(item.sku);
      if (!Number.isSafeInteger(item.cantidad) || item.cantidad < 1) errores.push(`cantidad_invalida:${indice}`);
      for (const campo of CAMPOS) {
        const correcto = campo === 'ivaPorcentaje' ? Number.isFinite(item[campo]) && item[campo] >= 0 : esImporte(item[campo]);
        if (!correcto) errores.push(`falta_o_invalido:${indice}.${campo}`);
      }
      if (esImporte(item.base) && esImporte(item.ivaValor) && esImporte(item.total) && item.base + item.ivaValor !== item.total) {
        errores.push(`descuadre_linea:${indice}`);
      }
    }
    if (!errores.length) {
      for (const campo of ['total', 'base', 'ivaValor', 'descuentoValor']) {
        const suma = factura.items.reduce((n, i) => n + (i[campo] || 0), 0);
        if (suma !== factura[campo]) errores.push(`descuadre_documento:${campo}`);
      }
    }
    if (errores.length) pendientes.push({ id: String(factura._id), numero: factura.numero, errores });
  }
  const reporte = { fecha: new Date().toISOString(), examinadas, requierenRevision: pendientes.length, pendientes };
  const destino = path.resolve(process.cwd(), 'reporte-facturas-historicas.json');
  fs.writeFileSync(destino, JSON.stringify(reporte, null, 2));
  console.log(`Auditadas: ${examinadas}. Requieren revisión: ${pendientes.length}. Reporte: ${destino}`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
