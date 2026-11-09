/**
 * Reglas reutilizables para los endpoints de autenticación y el CRUD de productos.
 * La validación de entradas complementa, pero no reemplaza, las restricciones de Mongoose.
 */
const { body, param, query } = require('express-validator');

// Evita nombres vacíos y cadenas desmesuradas que afectarían la interfaz.
const nombre = body('nombre').isString().withMessage('Debe ser texto').bail().trim().isLength({ min: 2, max: 120 }).withMessage('Debe tener entre 2 y 120 caracteres');
const correo = body('email').isEmail().withMessage('Correo inválido').bail().normalizeEmail();
const clave = body('password').isString().withMessage('Contraseña inválida').bail().isLength({ min: 12, max: 128 }).withMessage('Debe tener entre 12 y 128 caracteres');
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
    body('fechaNacimiento').isISO8601({ strict: true }).withMessage('Fecha de nacimiento inválida').bail().custom(v => { if (new Date(v) > new Date() || new Date(v) < new Date('1900-01-01')) throw new Error('Fecha fuera de rango'); return true; }),
    body('sexo').isIn(['femenino', 'masculino', 'otro', 'prefiero_no_decir']).withMessage('Sexo inválido'),
    body('ciudad').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Ciudad inválida'),
    body('role').optional().isIn(['admin', 'ventas', 'bodeguero']).withMessage('Rol inválido')],
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
