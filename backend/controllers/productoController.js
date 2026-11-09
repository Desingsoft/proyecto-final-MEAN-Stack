/**
 * Archivo: productoController.js
 * Propósito: Controlador HTTP: recibe solicitudes, valida reglas y coordina operaciones de negocio.
 * Mantenimiento: documentar validaciones, efectos secundarios y errores al modificar funciones.
 */
const Producto = require('../models/Producto');
const { nivelStock, objetivoStock, cantidadSugerida } = require('../utils/stock');

// Lista blanca: impide modificar stock, activo u otros campos sensibles desde el CRUD.
const camposEditables = ['nombre', 'sku', 'categoria', 'codigoBarras', 'precio', 'costo', 'stockMinimo', 'proveedor'];
function datosPermitidos(body) {
  return Object.fromEntries(camposEditables.filter(campo => Object.hasOwn(body, campo)).map(campo => [campo, body[campo]]));
}


// GET /api/productos - listar con filtros opcionales
/**
 * Controlador obtenerTodos: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerTodos = async (req, res) => {
  try {
    const { categoria, buscar, estadoStock, pagina = 1, limite = 20 } = req.query;
    const filtro = { activo: true };

    if (categoria) filtro.categoria = categoria;
    // estadoStock=bajo -> en o bajo el mínimo (incluye agotados); estadoStock=agotado -> sin unidades
    if (estadoStock === 'bajo') {
      const candidatos = await Producto.find({ activo: true }).select('stock stockMinimo').lean();
      filtro._id = { $in: candidatos.filter((p) => p.stock <= p.stockMinimo).map((p) => p._id) };
    }
    if (estadoStock === 'agotado') filtro.stock = { $lte: 0 };
    if (buscar) {
      filtro.$or = [
        { nombre: { $regex: buscar, $options: 'i' } },
        { sku: { $regex: buscar, $options: 'i' } }
      ];
    }

    const productos = await Producto.find(filtro)
      .populate('proveedor', 'nombre')
      .sort({ nombre: 1 })
      .skip((pagina - 1) * limite)
      .limit(Number(limite));

    const total = await Producto.countDocuments(filtro);

    res.json({ productos, total, paginas: Math.ceil(total / limite) });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos' });
  }
};

// GET /api/productos/:id
/**
 * Controlador obtenerPorId: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerPorId = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id).populate('proveedor', 'nombre');
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el producto' });
  }
};

// GET /api/productos/stock-bajo
/**
 * Controlador obtenerStockBajo: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerStockBajo = async (req, res) => {
  try {
    const activos = await Producto.find({ activo: true }).sort({ stock: 1 });
    res.json(activos.filter((p) => p.stock <= p.stockMinimo));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener productos con stock bajo' });
  }
};

// GET /api/productos/categorias - categorías en uso, para los filtros
/**
 * Controlador obtenerCategorias: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerCategorias = async (req, res) => {
  try {
    const categorias = await Producto.distinct('categoria', { activo: true });
    res.json(categorias.filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las categorías' });
  }
};

// GET /api/productos/reposicion - productos en o bajo el mínimo, con cantidad sugerida a pedir
/**
 * Controlador obtenerReposicion: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.obtenerReposicion = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true })
      .populate('proveedor', 'nombre contacto telefono email')
      .lean();

    const items = productos
      .filter((p) => p.stock <= p.stockMinimo)
      .map((p) => {
        const sugerido = cantidadSugerida(p.stock, p.stockMinimo);
        return {
          _id: p._id,
          nombre: p.nombre,
          sku: p.sku,
          categoria: p.categoria || null,
          proveedor: p.proveedor || null,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          objetivo: objetivoStock(p.stockMinimo),
          nivel: nivelStock(p.stock, p.stockMinimo),
          sugerido,
          costo: p.costo,
          costoEstimado: sugerido * p.costo
        };
      })
      // Lo más urgente primero: menor proporción stock/mínimo.
      .sort((a, b) => a.stock / (a.stockMinimo || 1) - b.stock / (b.stockMinimo || 1) || a.nombre.localeCompare(b.nombre, 'es'));

    res.json({
      items,
      resumen: {
        total: items.length,
        agotados: items.filter((i) => i.nivel === 'agotado').length,
        criticos: items.filter((i) => i.nivel === 'critico').length,
        bajos: items.filter((i) => i.nivel === 'bajo').length,
        costoEstimado: items.reduce((suma, i) => suma + i.costoEstimado, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la reposición' });
  }
};

// POST /api/productos
/**
 * Controlador crear: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.crear = async (req, res) => {
  try {
    const existente = await Producto.findOne({ sku: req.body.sku });
    if (existente) return res.status(400).json({ mensaje: 'Ya existe un producto con ese SKU' });

    const producto = new Producto({ ...datosPermitidos(req.body), stock: 0 });
    await producto.save();
    res.status(201).json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo crear el producto' });
  }
};

// PUT /api/productos/:id
/**
 * Controlador actualizar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.actualizar = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, datosPermitidos(req.body), {
      new: true,
      runValidators: true
    });
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo actualizar el producto' });
  }
};

// DELETE /api/productos/:id (borrado lógico)
/**
 * Controlador eliminar: procesa la solicitud HTTP y envía una respuesta JSON.
 * @param {import("express").Request} req Solicitud con parámetros, cuerpo y usuario autenticado.
 * @param {import("express").Response} res Respuesta HTTP.
 */
exports.eliminar = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el producto' });
  }
};
