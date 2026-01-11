const express = require('express');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { protect } = require('../middleware/auth');
const { calculateStockBulk } = require('../utils/stockCalculator');

const router = express.Router();

// Todas las rutas están protegidas con JWT
router.use(protect);

// @route   POST /api/products
// @desc    Crear un nuevo producto (solo catálogo, sin stock)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { barcode, name, price, minStock } = req.body;

    // Validar campos requeridos
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del producto es requerido'
      });
    }

    // Verificar si el código de barras ya existe (si se proporcionó)
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un producto con ese código de barras'
        });
      }
    }

    // Crear el producto (codigoInterno se genera automáticamente)
    const product = await Product.create({
      barcode: barcode || undefined,
      name,
      price: price || 0,
      minStock: minStock || 0
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error al crear producto:', error);

    // Manejo de error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese código de barras'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear el producto',
      error: error.message
    });
  }
});

// @route   GET /api/products
// @desc    Obtener todos los productos con stock calculado
// @access  Private
router.get('/', async (req, res) => {
  try {
    // Obtener todos los productos activos
    const products = await Product.find({ activo: true }).sort({ createdAt: -1 });

    // Calcular stock para todos los productos
    const productIds = products.map(p => p._id);
    const stockMap = await calculateStockBulk(productIds);

    // Agregar stock calculado a cada producto
    const productsWithStock = products.map(product => {
      const productObj = product.toObject();
      productObj.stock = stockMap[product._id.toString()] || 0;
      return productObj;
    });

    res.json({
      success: true,
      count: productsWithStock.length,
      products: productsWithStock
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los productos',
      error: error.message
    });
  }
});

// @route   GET /api/products/search
// @desc    Buscar producto por código de barras o código interno
// @access  Private
router.get('/search', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un código de búsqueda'
      });
    }

    // Buscar por barcode o codigoInterno
    const product = await Product.findOne({
      $or: [
        { barcode: code },
        { codigoInterno: code }
      ],
      activo: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error al buscar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar el producto',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Editar un producto existente
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, minStock, barcode } = req.body;

    // Buscar el producto
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Validar campos requeridos
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del producto es requerido'
      });
    }

    // Verificar si el código de barras ya existe en otro producto
    if (barcode && barcode !== product.barcode) {
      const existingProduct = await Product.findOne({
        barcode,
        _id: { $ne: id }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro producto con ese código de barras'
        });
      }
    }

    // Actualizar solo los campos permitidos
    product.name = name;
    product.price = price !== undefined ? price : product.price;
    product.minStock = minStock !== undefined ? minStock : product.minStock;
    product.barcode = barcode || undefined;
    product.updatedAt = Date.now();

    await product.save();

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      product
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);

    // Manejo de error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro producto con ese código de barras'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar el producto',
      error: error.message
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Eliminar un producto (solo si NO tiene movimientos)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // PRIMERO: Verificar si tiene movimientos de stock (regla estricta)
    const movementCount = await StockMovement.countDocuments({ producto: id });

    if (movementCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un producto que tiene movimientos de stock asociados',
        movementCount
      });
    }

    // Si no tiene movimientos, eliminar físicamente
    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el producto',
      error: error.message
    });
  }
});

module.exports = router;
