/**
 * Archivo: usuarioController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

const ROLES = ['admin', 'bodeguero', 'ventas'];
const MIN_PASSWORD = 12;

const sinPassword = (usuario) => {
  const { password, resetTokenHash, resetExpira, intentosFallidos, bloqueadoHasta, ...resto } = usuario.toObject ? usuario.toObject() : usuario;
  return resto;
};

const idValido = (id) => mongoose.isValidObjectId(id);

// Cuenta los admins activos que quedarían tras el cambio, sin contar al usuario indicado.
const otrosAdminsActivos = (idExcluido) =>
  Usuario.countDocuments({ role: 'admin', activo: { $ne: false }, _id: { $ne: idExcluido } });

// GET /api/usuarios?buscar=&role=&activo=
/**
 * Controlador listar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.listar = async (req, res) => {
  try {
    const { buscar, role, activo } = req.query;
    const filtro = {};

    if (role && ROLES.includes(role)) filtro.role = role;
    if (activo === 'true') filtro.activo = { $ne: false };
    if (activo === 'false') filtro.activo = false;
    if (buscar) {
      const patron = buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtro.$or = [
        { nombre: { $regex: patron, $options: 'i' } },
        { email: { $regex: patron, $options: 'i' } }
      ];
    }

    const usuarios = await Usuario.find(filtro).select('-password').sort({ nombre: 1 }).lean();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los usuarios' });
  }
};

// PATCH /api/usuarios/:id  { nombre?, email?, role?, activo? }
/**
 * Controlador actualizar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    if (!idValido(id)) return res.status(400).json({ mensaje: 'Identificador de usuario inválido' });

    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const { nombre, email, role, activo, fechaNacimiento, sexo, ciudad } = req.body;
    const esUnoMismo = String(usuario._id) === String(req.usuario.id);
    const eraAdminActivo = usuario.role === 'admin' && usuario.activo !== false;

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ mensaje: 'Rol inválido' });
    }
    if (nombre !== undefined && !String(nombre).trim()) {
      return res.status(400).json({ mensaje: 'El nombre no puede estar vacío' });
    }

    const dejaDeSerAdmin = role !== undefined && role !== 'admin';
    const seDesactiva = activo === false;

    if (esUnoMismo && (seDesactiva || dejaDeSerAdmin)) {
      return res.status(400).json({
        mensaje: 'No puedes desactivar tu propia cuenta ni quitarte el rol de administrador'
      });
    }
    if (eraAdminActivo && (seDesactiva || dejaDeSerAdmin) && (await otrosAdminsActivos(usuario._id)) === 0) {
      return res.status(400).json({ mensaje: 'Debe quedar al menos un administrador activo' });
    }

    if (email !== undefined) {
      const nuevoEmail = String(email).trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(nuevoEmail)) {
        return res.status(400).json({ mensaje: 'El correo electrónico no es válido' });
      }
      const repetido = await Usuario.findOne({ email: nuevoEmail, _id: { $ne: usuario._id } });
      if (repetido) return res.status(400).json({ mensaje: 'Ese correo ya está registrado' });
      usuario.email = nuevoEmail;
    }
    if (nombre !== undefined) usuario.nombre = String(nombre).trim();
    if (role !== undefined) usuario.role = role;
    if (activo !== undefined) usuario.activo = Boolean(activo);

    // Actualización controlada de los campos adicionales del perfil.
    if (fechaNacimiento !== undefined) {
      const fecha = new Date(fechaNacimiento);
      if (typeof fechaNacimiento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) || Number.isNaN(fecha.getTime()) || fecha > new Date() || fecha < new Date('1900-01-01')) return res.status(400).json({ mensaje: 'Fecha de nacimiento inválida' });
      usuario.fechaNacimiento = fecha;
    }
    if (sexo !== undefined) {
      if (!['femenino', 'masculino', 'otro', 'prefiero_no_decir'].includes(sexo)) return res.status(400).json({ mensaje: 'Sexo inválido' });
      usuario.sexo = sexo;
    }
    if (ciudad !== undefined) {
      if (typeof ciudad !== 'string' || ciudad.trim().length < 2 || ciudad.trim().length > 100) return res.status(400).json({ mensaje: 'Ciudad inválida' });
      usuario.ciudad = ciudad.trim();
    }
    await usuario.save();
    res.json(sinPassword(usuario));
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar el usuario', error: error.message });
  }
};

// PATCH /api/usuarios/:id/password  { password }  (un admin restablece la contraseña de otro)
/**
 * Controlador restablecerPassword: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.restablecerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!idValido(id)) return res.status(400).json({ mensaje: 'Identificador de usuario inválido' });
    if (!password || String(password).length < MIN_PASSWORD) {
      return res.status(400).json({ mensaje: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    usuario.password = String(password); // el hook pre('save') la cifra
    await usuario.save();
    res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al restablecer la contraseña', error: error.message });
  }
};

// GET /api/usuarios/yo
/**
 * Controlador yo: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.yo = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password').lean();
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener tu perfil' });
  }
};

// PATCH /api/usuarios/yo/password  { passwordActual, passwordNueva }
/**
 * Controlador cambiarMiPassword: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.cambiarMiPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ mensaje: 'Debes indicar la contraseña actual y la nueva' });
    }
    if (String(passwordNueva).length < MIN_PASSWORD) {
      return res.status(400).json({ mensaje: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres` });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    if (!(await usuario.compararPassword(passwordActual))) {
      return res.status(400).json({ mensaje: 'La contraseña actual no es correcta' });
    }
    if (passwordActual === passwordNueva) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe ser distinta de la actual' });
    }

    usuario.password = String(passwordNueva);
    await usuario.save();
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al cambiar la contraseña', error: error.message });
  }
};
