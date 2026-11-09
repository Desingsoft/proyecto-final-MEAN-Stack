/**
 * Archivo: verificarSmtp.js
 * Propósito: Script administrativo: ejecución manual; revisar su efecto antes de utilizarlo.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
// Verifica autenticación y conexión SMTP sin enviar correos reales.
require('dotenv').config();
const nodemailer = require('nodemailer');
const requeridas = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM'];
const faltantes = requeridas.filter(clave => !process.env[clave]);
if (faltantes.length) { console.error('Faltan variables:', faltantes.join(', ')); process.exit(1); }
const transporte = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10000
});
transporte.verify().then(() => console.log('SMTP: conexión y autenticación verificadas (sin enviar correo)'))
  .catch(error => { console.error('SMTP no disponible:', error.message); process.exitCode = 1; })
  .finally(() => transporte.close());
