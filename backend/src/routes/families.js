const express = require('express');
const Family = require('../models/Family');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas están protegidas con JWT
router.use(protect);

// @route   POST /api/families
// @desc    Crear una nueva familia
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la familia es requerido'
      });
    }

    // Verificar si ya existe una familia con ese nombre
    const existingFamily = await Family.findOne({
      nombre: { $regex: new RegExp(`^${nombre}$`, 'i') }
    });

    if (existingFamily) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una familia con ese nombre'
      });
    }

    // Crear la familia
    const family = await Family.create({
      nombre,
      descripcion: descripcion || ''
    });

    res.status(201).json({
      success: true,
      message: 'Familia creada exitosamente',
      family
    });
  } catch (error) {
    console.error('Error al crear familia:', error);

    // Manejo de error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una familia con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear la familia',
      error: error.message
    });
  }
});

// @route   GET /api/families
// @desc    Obtener todas las familias
// @access  Private
router.get('/', async (req, res) => {
  try {
    const families = await Family.find({ activo: true }).sort({ nombre: 1 });

    res.json({
      success: true,
      count: families.length,
      families
    });
  } catch (error) {
    console.error('Error al obtener familias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las familias',
      error: error.message
    });
  }
});

// @route   GET /api/families/:id
// @desc    Obtener una familia por ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const family = await Family.findById(req.params.id);

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Familia no encontrada'
      });
    }

    res.json({
      success: true,
      family
    });
  } catch (error) {
    console.error('Error al obtener familia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la familia',
      error: error.message
    });
  }
});

// @route   PUT /api/families/:id
// @desc    Editar una familia existente
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    // Buscar la familia
    const family = await Family.findById(id);

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Familia no encontrada'
      });
    }

    // Validar campos requeridos
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la familia es requerido'
      });
    }

    // Verificar si el nombre ya existe en otra familia
    if (nombre.toLowerCase() !== family.nombre.toLowerCase()) {
      const existingFamily = await Family.findOne({
        nombre: { $regex: new RegExp(`^${nombre}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingFamily) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra familia con ese nombre'
        });
      }
    }

    // Actualizar solo los campos permitidos
    family.nombre = nombre;
    family.descripcion = descripcion !== undefined ? descripcion : family.descripcion;
    family.updatedAt = Date.now();

    await family.save();

    res.json({
      success: true,
      message: 'Familia actualizada exitosamente',
      family
    });
  } catch (error) {
    console.error('Error al actualizar familia:', error);

    // Manejo de error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra familia con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar la familia',
      error: error.message
    });
  }
});

// @route   DELETE /api/families/:id
// @desc    Eliminar una familia (solo si NO tiene productos asociados)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const family = await Family.findById(id);

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Familia no encontrada'
      });
    }

    // Verificar si tiene productos asociados
    const productCount = await Product.countDocuments({ familia: id });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una familia que tiene productos asociados',
        productCount
      });
    }

    // Si no tiene productos, eliminar físicamente
    await Family.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Familia eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar familia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la familia',
      error: error.message
    });
  }
});

module.exports = router;
