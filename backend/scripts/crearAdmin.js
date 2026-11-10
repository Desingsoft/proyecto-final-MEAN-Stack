/**
 * Archivo: crearAdmin.js
 * Propósito: Script administrativo: ejecución manual; revisar su efecto antes de utilizarlo.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
/**
 * Crea un usuario administrador.
 *
 *   npm run crear:admin                                   -> te pide los datos
 *   npm run crear:admin -- "Nombre Apellido" correo@empresa.com TuContraseña
 *
 * Es seguro ejecutarlo varias veces: si el correo ya existe, no lo duplica.
 */
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

const preguntar = (pregunta) =>
  new Promise((resolver) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(pregunta, (respuesta) => { rl.close(); resolver(respuesta.trim()); });
  });

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI: crea el archivo backend/.env a partir de .env.example');

    let [nombre, email, password] = process.argv.slice(2);
    nombre = nombre || (await preguntar('Nombre completo: '));
    email = (email || (await preguntar('Correo electrónico: '))).toLowerCase();
    password = password || (await preguntar('Contraseña (mínimo 6 caracteres): '));

    if (!nombre || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('El nombre y un correo válido son obligatorios');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

    await mongoose.connect(process.env.MONGODB_URI);

    if (await Usuario.findOne({ email })) {
      console.log(`Ya existe un usuario con el correo ${email}. No se creó otro.`);
    } else {
      await Usuario.create({ nombre, email, password, role: 'admin' }); // el modelo cifra la contraseña
      console.log(`Administrador creado: ${email}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
