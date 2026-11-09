/**
 * Archivo: authController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

const Usuario = require('../models/Usuario');

/**
 * Controlador login: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Normaliza el correo y evita consultas inválidas o contraseñas no textuales.
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
    }
    const correo = email.trim().toLowerCase();
    const usuario = await Usuario.findOne({ email: correo });
    // Respuesta idéntica para usuario inexistente o contraseña errónea.
    if (!usuario) return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      return res.status(429).json({ mensaje: 'Cuenta bloqueada temporalmente. Intenta más tarde.' });
    }
    if (!(await usuario.compararPassword(password))) {
      usuario.intentosFallidos = (usuario.intentosFallidos || 0) + 1;
      if (usuario.intentosFallidos >= 5) {
        usuario.bloqueadoHasta = new Date(Date.now() + 15 * 60 * 1000);
        usuario.intentosFallidos = 0;
      }
      await usuario.save();
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = undefined;
    await usuario.save();
    if (usuario.activo === false) {
      return res.status(403).json({ mensaje: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const token = jwt.sign(
      { id: usuario._id, role: usuario.role, version: usuario.versionToken || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      token,
      usuario: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, role: usuario.role }
    });
  } catch (error) {
    console.error('Error de autenticación:', error);
    res.status(500).json({ mensaje: 'No se pudo iniciar sesión' });
  }
};

// POST /api/auth/registro - opcional, útil para crear el primer admin o nuevos usuarios
/**
 * Controlador registro: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.registro = async (req, res) => {
  try {
    const { nombre, email, password, role, fechaNacimiento, sexo, ciudad } = req.body;
    // Validación del lado del servidor: no confiar en los controles del formulario.
    if (typeof nombre !== 'string' || !nombre.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ mensaje: 'Nombre, correo válido y contraseña de mínimo 8 caracteres son obligatorios' });
    }
    const correo = email.trim().toLowerCase();
    const rolesPermitidos = ['admin', 'ventas', 'bodeguero'];
    if (role !== undefined && !rolesPermitidos.includes(role)) return res.status(400).json({ mensaje: 'Rol inválido' });
    const existente = await Usuario.findOne({ email: correo });
    if (existente) return res.status(400).json({ mensaje: 'El correo ya está registrado' });

    const usuario = new Usuario({ nombre: nombre.trim(), email: correo, password, role, fechaNacimiento, sexo, ciudad: ciudad.trim() });
    await usuario.save();

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, role: usuario.role }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(400).json({ mensaje: 'No se pudo registrar el usuario' });
  }
};

// POST /api/auth/recuperar: respuesta neutra para no revelar correos registrados.
/**
 * Controlador solicitarRecuperacion: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.solicitarRecuperacion = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const mensaje = 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.';
  if (!email || email.length > 254) return res.status(400).json({ mensaje: 'Correo inválido' });
  const usuario = await Usuario.findOne({ email, activo: true });
  // No generar tokens inutilizables cuando el servicio de correo está deshabilitado.
  if (usuario && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.RESET_URL) {
    const token = crypto.randomBytes(32).toString('hex');
    usuario.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    usuario.resetExpira = new Date(Date.now() + 15 * 60 * 1000);
    await usuario.save();
    // El token solo se envía por SMTP configurado; nunca se devuelve en API ni logs.
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.RESET_URL) {
      try {
        const nodemailer = require('nodemailer');
        const transport = nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
        const url = new URL(process.env.RESET_URL);
        url.searchParams.set('token', token);
        await transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:usuario.email,subject:'Recuperación de contraseña',text:`Abre este enlace durante los próximos 15 minutos: ${url.toString()}`});
      } catch (error) { console.error('No se pudo enviar el correo de recuperación:', error.message); }
    }
  }
  return res.json({ mensaje });
};

// POST /api/auth/restablecer: token de un solo uso y nueva contraseña segura.
/**
 * Controlador restablecer: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.restablecer = async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return res.status(400).json({ mensaje: 'Token inválido o contraseña menor de 12 caracteres' });
  }
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const usuario = await Usuario.findOne({ resetTokenHash: hash, resetExpira: { $gt: new Date() } }).select('+resetTokenHash');
  if (!usuario) return res.status(400).json({ mensaje: 'Enlace inválido o vencido' });
  usuario.password = password;
  usuario.resetTokenHash = undefined;
  usuario.resetExpira = undefined;
  usuario.versionToken = (usuario.versionToken || 0) + 1;
  usuario.intentosFallidos = 0;
  usuario.bloqueadoHasta = undefined;
  await usuario.save();
  res.json({ mensaje: 'Contraseña actualizada. Inicia sesión nuevamente.' });
};
