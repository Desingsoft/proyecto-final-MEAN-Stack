/**
 * Reglas reutilizables para los endpoints de autenticación y el CRUD de productos.
 * La validación de entradas complementa, pero no reemplaza, las restricciones de Mongoose.
 */
const { body, param, query } = require('express-validator');

// Evita nombres vacíos y cadenas desmesuradas que afectarían la interfaz.
const nombre = body('nombre').isString().withMessage('Debe ser texto').bail().trim().isLength({ min: 2, max: 120 }).withMessage('Debe tener entre 2 y 120 caracteres');
const correo = body('email').isEmail().withMessage('Correo inválido').bail().normalizeEmail();
const clave = body('password').isString().withMessage('Contraseña inválida').bail().isLength({ min: 12, max: 128 }).withMessage('Debe tener entre 12 y 128 caracteres').bail().matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/).withMessage('Incluye mayúscula, minúscula, número y carácter especial, sin espacios');
const idProducto = param('id').isMongoId().withMessage('Identificador de producto inválido');

// Campos editables: NO aceptar stock ni activo desde el CRUD comercial.
// El stock se modifica únicamente a través de movimientos de inventario.
const camposProducto = ['nombre', 'sku', 'categoria', 'codigoBarras', 'precio', 'costo', 'stockMinimo', 'proveedor'];
const texto = (campo, max) => body(campo).optional({ values: 'null' }).isString().withMessage('Debe ser texto').bail().trim().isLength({ max }).withMessage('Texto demasiado largo');
const noNegativo = (campo) => body(campo).optional().isFloat({ min: 0 }).withMessage('Debe ser un número no negativo').toFloat();
const reglasProducto = [
  body().custom((valor) => {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Se requiere un objeto JSON');
    if (Object.keys(valor).some((campo) => !camposProducto.includes(campo))) throw new Error('La solicitud contiene campos no permitidos');
    return true;
  }),
  texto('nombre', 120), texto('sku', 64), texto('categoria', 80), texto('codigoBarras', 80),
  noNegativo('precio'), noNegativo('costo'),
  body('stockMinimo').optional().isInt({ min: 0 }).withMessage('Debe ser un entero no negativo').toInt(),
  body('proveedor').optional({ values: 'falsy' }).isMongoId().withMessage('Proveedor inválido')
];

module.exports = {
  login: [correo, body('password').isString().notEmpty().withMessage('Contraseña obligatoria')],
  registro: [nombre, correo, clave,
    // Validaciones replicadas en backend: el navegador no es una frontera de seguridad.
    body('fechaNacimiento').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Usa una fecha válida AAAA-MM-DD').bail().custom(v => { const [a,m,d] = v.split('-').map(Number); const f = new Date(Date.UTC(a,m-1,d)); if (a < 1900 || m < 1 || m > 12 || d < 1 || d > 31 || f.getUTCFullYear() !== a || f.getUTCMonth() !== m-1 || f.getUTCDate() !== d || f > new Date()) throw new Error('Fecha de nacimiento inválida'); return true; }),
    body('sexo').isIn(['femenino', 'masculino', 'otro', 'prefiero_no_decir']).withMessage('Sexo inválido'),
    body('ciudad').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Ciudad inválida'),
    body('edad').optional().isInt({ min: 2, max: 120 }).withMessage('La edad debe ser mayor a 1 y máximo 120').toInt().bail().custom((edad, { req }) => { const fecha = req.body.fechaNacimiento; if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return true; const hoy = new Date(); const [a,m,d] = fecha.split('-').map(Number); const calculada = hoy.getUTCFullYear()-a-(hoy.getUTCMonth()+1<m || (hoy.getUTCMonth()+1===m && hoy.getUTCDate()<d) ? 1 : 0); if (calculada !== edad) throw new Error('La edad no coincide con la fecha de nacimiento'); return true; }),
    body('role').optional().isIn(['admin', 'ventas', 'bodeguero']).withMessage('Rol inválido')],
  registroPublico: [nombre, correo, clave,
    body('fechaNacimiento').isISO8601({ strict: true }).withMessage('Fecha inválida'),
    body('edad').isInt({ min: 2, max: 120 }).withMessage('Edad debe ser mayor a 1').toInt().bail().custom((edad, {req}) => { const f = req.body.fechaNacimiento; if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return true; const [a,m,d] = f.split('-').map(Number); const fecha = new Date(Date.UTC(a,m-1,d)); const hoy = new Date(); if (a < 1900 || fecha.getUTCFullYear()!==a || fecha.getUTCMonth()!==m-1 || fecha.getUTCDate()!==d || fecha>hoy) throw new Error('Fecha de nacimiento inválida'); const calc = hoy.getUTCFullYear()-a-(hoy.getUTCMonth()+1<m || (hoy.getUTCMonth()+1===m && hoy.getUTCDate()<d)?1:0); if (edad!==calc) throw new Error('La edad no coincide con la fecha de nacimiento'); return true; }),
    body('sexo').isIn(['femenino','masculino','otro','prefiero_no_decir']).withMessage('Selecciona un género válido'),
    body('role').isIn(['ventas','bodeguero']).withMessage('El administrador no puede registrarse públicamente')],
  recuperar: [correo],
  restablecer: [body('token').matches(/^[a-f0-9]{64}$/).withMessage('Token inválido'), clave],
  listarProductos: [
    query('pagina').optional().isInt({ min: 1, max: 100000 }).toInt(),
    query('limite').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('estadoStock').optional().isIn(['bajo', 'agotado']),
    query('buscar').optional().isString().isLength({ max: 100 }),
    query('categoria').optional().isString().isLength({ max: 80 })
  ],
  idProducto: [idProducto],
  crearProducto: [
    ...reglasProducto,
    body('nombre').exists().notEmpty().withMessage('Nombre obligatorio'),
    body('sku').exists().notEmpty().withMessage('SKU obligatorio'),
    body('precio').exists().withMessage('Precio obligatorio'),
    body('costo').exists().withMessage('Costo obligatorio')
  ],
  actualizarProducto: [idProducto, ...reglasProducto]
};
