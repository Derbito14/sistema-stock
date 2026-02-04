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
    const {
      barcode, name, price, minStock, familia, unidad,
      precioCompraBase, precioVentaBase, margenGananciaPorcentaje, precioVentaManual
    } = req.body;

    // Limpiar barcode: convertir vacío/null a undefined
    const cleanBarcode = (barcode && barcode.trim() !== '') ? barcode.trim() : undefined;

    // Validar campos requeridos
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del producto es requerido'
      });
    }

    // Verificar si ya existe un producto con el mismo nombre
    const existingProductByName = await Product.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      activo: true
    });
    if (existingProductByName) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con ese nombre'
      });
    }

    // Verificar si el código de barras ya existe (si se proporcionó)
    if (cleanBarcode) {
      const existingProduct = await Product.findOne({ barcode: cleanBarcode });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un producto con ese código de barras'
        });
      }
    }

    // Crear el producto (codigoInterno se genera automáticamente)
    const productData = {
      name,
      price: price || 0,
      minStock: minStock || 0,
      familia: familia || null,
      unidad: unidad || 'unidad',
      precioCompraBase: precioCompraBase || 0,
      margenGananciaPorcentaje: margenGananciaPorcentaje || 0,
      precioVentaManual: precioVentaManual || false
    };

    // Si es precio manual, usar el precioVentaBase proporcionado
    if (precioVentaManual && precioVentaBase !== undefined) {
      productData.precioVentaBase = precioVentaBase;
      productData.price = precioVentaBase;
    }

    // Solo agregar barcode si tiene valor
    if (cleanBarcode) {
      productData.barcode = cleanBarcode;
    }

    const product = await Product.create(productData);

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
    // Obtener todos los productos activos con su familia
    const products = await Product.find({ activo: true })
      .populate('familia', 'nombre')
      .sort({ createdAt: -1 });

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

// @route   POST /api/products/calcular-precio-venta
// @desc    Calcular precio de venta sugerido basado en compra y margen
// @access  Private
router.post('/calcular-precio-venta', async (req, res) => {
  try {
    const { precioCompra, margenPorcentaje } = req.body;

    if (precioCompra === undefined || margenPorcentaje === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Precio de compra y margen son requeridos'
      });
    }

    const precioVentaSugerido = precioCompra + (precioCompra * margenPorcentaje / 100);

    res.json({
      success: true,
      precioVentaSugerido: Math.round(precioVentaSugerido * 100) / 100
    });
  } catch (error) {
    console.error('Error al calcular precio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular el precio',
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
    const {
      name, price, minStock, barcode, familia, unidad,
      precioCompraBase, precioVentaBase, margenGananciaPorcentaje, precioVentaManual
    } = req.body;

    // Limpiar barcode: convertir vacío/null a undefined
    const cleanBarcode = (barcode && barcode.trim() !== '') ? barcode.trim() : undefined;

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

    // Verificar si ya existe otro producto con el mismo nombre
    const existingProductByName = await Product.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: id },
      activo: true
    });
    if (existingProductByName) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro producto con ese nombre'
      });
    }

    // Verificar si el código de barras ya existe en otro producto
    if (cleanBarcode && cleanBarcode !== product.barcode) {
      const existingProduct = await Product.findOne({
        barcode: cleanBarcode,
        _id: { $ne: id }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro producto con ese código de barras'
        });
      }
    }

    // Actualizar campos básicos
    product.name = name;
    product.minStock = minStock !== undefined ? minStock : product.minStock;
    product.familia = familia !== undefined ? (familia || null) : product.familia;
    product.unidad = unidad || product.unidad;
    product.updatedAt = Date.now();

    // Actualizar campos de precios
    if (precioCompraBase !== undefined) {
      product.precioCompraBase = precioCompraBase;
    }
    if (margenGananciaPorcentaje !== undefined) {
      product.margenGananciaPorcentaje = margenGananciaPorcentaje;
    }
    if (precioVentaManual !== undefined) {
      product.precioVentaManual = precioVentaManual;
    }

    // Si es precio manual, actualizar precioVentaBase directamente
    if (product.precioVentaManual) {
      if (precioVentaBase !== undefined) {
        product.precioVentaBase = precioVentaBase;
        product.price = precioVentaBase;
      } else if (price !== undefined) {
        product.price = price;
        product.precioVentaBase = price;
      }
    }
    // Si no es manual, el pre-save calculará el precio automáticamente

    // Manejar barcode: si está vacío, eliminarlo del documento
    if (cleanBarcode) {
      product.barcode = cleanBarcode;
    } else {
      product.barcode = undefined;
    }

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
