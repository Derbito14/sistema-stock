const express = require('express');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const BatchLot = require('../models/BatchLot');
const SaleDetail = require('../models/SaleDetail');
const { protect } = require('../middleware/auth');
const { calculateStock } = require('../utils/stockCalculator');
const LoteService = require('../services/LoteService');

const router = express.Router();

// Todas las rutas están protegidas con JWT
router.use(protect);

// @route   GET /api/stock-movements/next-comprobante
// @desc    Obtener el próximo número de comprobante
// @access  Private
router.get('/next-comprobante', async (req, res) => {
  try {
    // Buscar el último comprobante
    const lastMovement = await StockMovement.findOne({
      comprobante: { $exists: true }
    })
    .sort({ comprobante: -1 })
    .select('comprobante')
    .lean();

    let nextNumber = 1;

    if (lastMovement && lastMovement.comprobante) {
      // Extraer el número del formato MOV-000001
      const match = lastMovement.comprobante.match(/MOV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Formatear con padding de 6 dígitos
    const nextComprobante = `MOV-${String(nextNumber).padStart(6, '0')}`;

    res.json({
      success: true,
      comprobante: nextComprobante
    });
  } catch (error) {
    console.error('Error al generar comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar comprobante',
      error: error.message
    });
  }
});

// @route   POST /api/stock-movements
// @desc    Registrar múltiples movimientos de stock (mismo comprobante)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { comprobante, tipo, productos, observacion, tipoOriginal } = req.body;

    // Validar campos requeridos
    if (!comprobante || !tipo || !productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comprobante, tipo y productos son requeridos'
      });
    }

    // Validar tipo
    if (!['INGRESO', 'EGRESO'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo debe ser INGRESO o EGRESO'
      });
    }

    // Validar que el comprobante no exista
    const existingMovement = await StockMovement.findOne({ comprobante });
    if (existingMovement) {
      return res.status(400).json({
        success: false,
        message: 'El comprobante ya existe. Solicite uno nuevo.'
      });
    }

    // Validar productos
    const movementsToCreate = [];
    const errors = [];
    const productDataMap = {}; // Guardar datos de productos para después

    for (let i = 0; i < productos.length; i++) {
      const item = productos[i];

      if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
        errors.push(`Producto ${i + 1}: ID y cantidad mayor a 0 son requeridos`);
        continue;
      }

      // Verificar que el producto existe y está activo
      const product = await Product.findOne({ _id: item.productoId, activo: true });
      if (!product) {
        errors.push(`Producto ${i + 1}: No encontrado o inactivo`);
        continue;
      }

      productDataMap[item.productoId] = product;

      // Para INGRESO, validar precio de compra
      if (tipo === 'INGRESO') {
        if (item.precioCompra === undefined || item.precioCompra === null || item.precioCompra < 0) {
          // Usar precio de compra base del producto como fallback
          item.precioCompra = product.precioCompraBase || 0;
        }
      }

      // Para EGRESO, verificar stock suficiente
      if (tipo === 'EGRESO') {
        const currentStock = await calculateStock(item.productoId);
        if (currentStock < item.cantidad) {
          errors.push(`Producto "${product.name}": Stock insuficiente (actual: ${currentStock}, solicitado: ${item.cantidad})`);
          continue;
        }
      }

      movementsToCreate.push({
        comprobante,
        producto: item.productoId,
        tipo,
        tipoOriginal: tipoOriginal || tipo,
        cantidad: item.cantidad,
        observacion: observacion || '',
        usuario: req.user._id,
        precioCompra: tipo === 'INGRESO' ? item.precioCompra : null,
        loteProcesado: false
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores en los productos',
        errors
      });
    }

    if (movementsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay productos válidos para registrar'
      });
    }

    // Crear todos los movimientos
    const movements = await StockMovement.insertMany(movementsToCreate);

    // Procesar lotes según el tipo de movimiento
    for (let i = 0; i < movements.length; i++) {
      const movement = movements[i];
      const item = productos[i];
      const product = productDataMap[item.productoId];

      if (tipo === 'INGRESO') {
        // Crear lote para cada producto
        await LoteService.crearLote({
          productoId: item.productoId,
          movimientoId: movement._id,
          cantidad: item.cantidad,
          precioCompra: item.precioCompra || product.precioCompraBase || 0,
          fecha: movement.fecha,
          observacion: observacion || ''
        });

        // Marcar movimiento como procesado
        await StockMovement.findByIdAndUpdate(movement._id, { loteProcesado: true });

      } else if (tipo === 'EGRESO') {
        // Verificar si el producto tiene lotes
        const tieneLotes = await LoteService.tieneLotes(item.productoId);

        if (tieneLotes) {
          // Procesar egreso con FIFO
          const resultado = await LoteService.procesarEgresoFIFO({
            productoId: item.productoId,
            movimientoId: movement._id,
            cantidad: item.cantidad,
            precioVenta: product.precioVentaBase || product.price || 0
          });

          // Actualizar movimiento con totales
          await StockMovement.findByIdAndUpdate(movement._id, {
            costoTotalReal: resultado.costoTotalReal,
            precioVentaTotal: resultado.precioVentaTotal,
            gananciaTotal: resultado.gananciaTotal,
            loteProcesado: true
          });
        }
      }
    }

    // Poblar datos
    const populatedMovements = await StockMovement.find({
      _id: { $in: movements.map(m => m._id) }
    })
    .populate('producto', 'codigoInterno barcode name unidad precioVentaBase')
    .populate('usuario', 'username');

    res.status(201).json({
      success: true,
      message: `Movimiento ${tipo} registrado con ${movements.length} productos`,
      comprobante,
      movements: populatedMovements
    });
  } catch (error) {
    console.error('Error al registrar movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar los movimientos',
      error: error.message
    });
  }
});

// @route   GET /api/stock-movements
// @desc    Obtener movimientos con filtros
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tipo, fechaDesde, fechaHasta, codigoInterno, nombreProducto, limit = 100 } = req.query;

    const query = {};

    // Filtro por tipo
    if (tipo && ['INGRESO', 'EGRESO'].includes(tipo)) {
      query.tipo = tipo;
    }

    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
      query.fecha = {};
      if (fechaDesde) {
        // Inicio del día (00:00:00)
        query.fecha.$gte = new Date(fechaDesde);
      }
      if (fechaHasta) {
        // Fin del día (23:59:59.999)
        const endDate = new Date(fechaHasta);
        endDate.setHours(23, 59, 59, 999);
        query.fecha.$lte = endDate;
      }
    }

    // Filtro por código interno/barcode o nombre de producto
    if (codigoInterno || nombreProducto) {
      const productQuery = {};

      if (codigoInterno) {
        // Buscar por código interno O código de barras
        productQuery.$or = [
          { codigoInterno: new RegExp(codigoInterno, 'i') },
          { barcode: new RegExp(codigoInterno, 'i') }
        ];
      }

      if (nombreProducto) {
        if (productQuery.$or) {
          // Si ya hay $or, agregar filtro de nombre con $and
          const prevOr = productQuery.$or;
          delete productQuery.$or;
          productQuery.$and = [
            { $or: prevOr },
            { name: new RegExp(nombreProducto, 'i') }
          ];
        } else {
          productQuery.name = new RegExp(nombreProducto, 'i');
        }
      }

      const products = await Product.find(productQuery).select('_id');
      const productIds = products.map(p => p._id);

      if (productIds.length === 0) {
        return res.json({
          success: true,
          count: 0,
          movements: []
        });
      }

      query.producto = { $in: productIds };
    }

    // IMPORTANTE: Filtrar movimientos con producto null
    query.producto = { ...query.producto, $ne: null };

    const movements = await StockMovement.find(query)
      .populate('producto', 'codigoInterno barcode name price unidad family')
      .populate('usuario', 'username')
      .sort({ fecha: -1, comprobante: -1 })
      .limit(parseInt(limit));

    // Filtrar movimientos donde el populate falló (producto eliminado)
    const validMovements = movements.filter(m => m.producto !== null);

    res.json({
      success: true,
      count: validMovements.length,
      movements: validMovements
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los movimientos',
      error: error.message
    });
  }
});

// @route   GET /api/stock-movements/by-comprobante/:comprobante
// @desc    Obtener todos los movimientos de un comprobante específico
// @access  Private
router.get('/by-comprobante/:comprobante', async (req, res) => {
  try {
    const { comprobante } = req.params;

    const movements = await StockMovement.find({ comprobante })
      .populate('producto', 'codigoInterno barcode name price unidad')
      .populate('usuario', 'username')
      .sort({ createdAt: 1 });

    if (movements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comprobante no encontrado'
      });
    }

    res.json({
      success: true,
      comprobante,
      tipo: movements[0].tipo,
      fecha: movements[0].fecha,
      observacion: movements[0].observacion,
      usuario: movements[0].usuario,
      productos: movements.map(m => ({
        producto: m.producto,
        cantidad: m.cantidad
      })),
      totalProductos: movements.length
    });
  } catch (error) {
    console.error('Error al obtener movimientos por comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los movimientos',
      error: error.message
    });
  }
});

// @route   GET /api/stock-movements/lotes/:productoId
// @desc    Obtener lotes de un producto con estadísticas
// @access  Private
router.get('/lotes/:productoId', async (req, res) => {
  try {
    const { productoId } = req.params;
    const { soloActivos } = req.query;

    // Obtener estadísticas
    const estadisticas = await LoteService.getEstadisticasLotes(productoId);

    // Obtener lotes
    const lotes = await LoteService.getLotesProducto(
      productoId,
      soloActivos === 'true'
    );

    res.json({
      success: true,
      estadisticas,
      lotes
    });
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los lotes',
      error: error.message
    });
  }
});

// @route   GET /api/stock-movements/detalles-venta/:movimientoId
// @desc    Obtener detalles de venta de un movimiento de egreso
// @access  Private
router.get('/detalles-venta/:movimientoId', async (req, res) => {
  try {
    const { movimientoId } = req.params;

    // Verificar que el movimiento existe
    const movimiento = await StockMovement.findById(movimientoId)
      .populate('producto', 'codigoInterno name');

    if (!movimiento) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    if (movimiento.tipo !== 'EGRESO') {
      return res.status(400).json({
        success: false,
        message: 'Solo los movimientos de egreso tienen detalles de venta'
      });
    }

    const detalles = await LoteService.getDetallesVenta(movimientoId);

    res.json({
      success: true,
      movimiento: {
        comprobante: movimiento.comprobante,
        producto: movimiento.producto,
        cantidad: movimiento.cantidad,
        costoTotalReal: movimiento.costoTotalReal,
        precioVentaTotal: movimiento.precioVentaTotal,
        gananciaTotal: movimiento.gananciaTotal
      },
      detalles
    });
  } catch (error) {
    console.error('Error al obtener detalles de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los detalles de venta',
      error: error.message
    });
  }
});

module.exports = router;
