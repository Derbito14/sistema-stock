const express = require('express');
const CashSession = require('../models/CashSession');
const CashMovement = require('../models/CashMovement');
const StockMovement = require('../models/StockMovement');
const { protect, requireMaster } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Calcular ventas en efectivo para una sesion de caja
async function calcularVentasEfectivo(sesion) {
  const query = {
    tipo: 'EGRESO',
    metodoPago: 'EFECTIVO',
    fecha: { $gte: sesion.fechaApertura }
  };
  if (sesion.fechaCierre) {
    query.fecha.$lte = sesion.fechaCierre;
  }

  const ventas = await StockMovement.find(query)
    .populate('producto', 'price precioVentaBase');

  let total = 0;
  ventas.forEach(v => {
    if (v.precioVentaTotal != null && v.precioVentaTotal > 0) {
      total += v.precioVentaTotal;
    } else if (v.producto) {
      const precio = v.producto.precioVentaBase || v.producto.price || 0;
      total += precio * v.cantidad;
    }
  });

  return total;
}

// Calcular totales de movimientos de caja
async function calcularTotalesCaja(cajaId) {
  const movimientos = await CashMovement.find({ cajaId });

  let ingresos = 0;
  let gastos = 0;
  let retiros = 0;

  movimientos.forEach(m => {
    if (m.tipo === 'INGRESO') ingresos += m.monto;
    else if (m.tipo === 'GASTO') gastos += m.monto;
    else if (m.tipo === 'RETIRO') retiros += m.monto;
  });

  return { ingresos, gastos, retiros };
}

// Calcular saldo teorico completo
async function calcularSaldoTeorico(sesion) {
  const ventasEfectivo = await calcularVentasEfectivo(sesion);
  const { ingresos, gastos, retiros } = await calcularTotalesCaja(sesion._id);

  return sesion.montoApertura + ventasEfectivo + ingresos - gastos - retiros;
}

// @route   POST /api/cash/abrir
// @desc    Abrir caja
// @access  Private
router.post('/abrir', async (req, res) => {
  try {
    const { montoApertura } = req.body;

    if (montoApertura == null || montoApertura < 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto de apertura es requerido y no puede ser negativo'
      });
    }

    // Verificar que no haya caja abierta
    const cajaAbierta = await CashSession.findOne({ estado: 'ABIERTA' });
    if (cajaAbierta) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una caja abierta. Debe cerrarla antes de abrir otra.'
      });
    }

    const sesion = await CashSession.create({
      montoApertura,
      usuarioApertura: req.user._id
    });

    const populated = await CashSession.findById(sesion._id)
      .populate('usuarioApertura', 'username');

    res.status(201).json({
      success: true,
      message: 'Caja abierta exitosamente',
      sesion: populated
    });
  } catch (error) {
    console.error('Error al abrir caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al abrir la caja',
      error: error.message
    });
  }
});

// @route   POST /api/cash/cerrar
// @desc    Cerrar caja
// @access  Private
router.post('/cerrar', async (req, res) => {
  try {
    const { montoCierreReal } = req.body;

    if (montoCierreReal == null || montoCierreReal < 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto de cierre real es requerido'
      });
    }

    const sesion = await CashSession.findOne({ estado: 'ABIERTA' });
    if (!sesion) {
      return res.status(400).json({
        success: false,
        message: 'No hay caja abierta para cerrar'
      });
    }

    const saldoTeorico = await calcularSaldoTeorico(sesion);
    const diferencia = montoCierreReal - saldoTeorico;

    sesion.fechaCierre = new Date();
    sesion.montoCierreReal = montoCierreReal;
    sesion.saldoTeorico = saldoTeorico;
    sesion.diferencia = diferencia;
    sesion.estado = 'CERRADA';
    sesion.usuarioCierre = req.user._id;
    await sesion.save();

    const populated = await CashSession.findById(sesion._id)
      .populate('usuarioApertura', 'username')
      .populate('usuarioCierre', 'username');

    res.json({
      success: true,
      message: 'Caja cerrada exitosamente',
      sesion: populated
    });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar la caja',
      error: error.message
    });
  }
});

// @route   POST /api/cash/gasto
// @desc    Registrar gasto
// @access  Private
router.post('/gasto', async (req, res) => {
  try {
    const { monto, descripcion } = req.body;

    if (!monto || monto <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a cero'
      });
    }

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({
        success: false,
        message: 'La descripcion es requerida'
      });
    }

    const sesion = await CashSession.findOne({ estado: 'ABIERTA' });
    if (!sesion) {
      return res.status(400).json({
        success: false,
        message: 'No hay caja abierta'
      });
    }

    const movimiento = await CashMovement.create({
      cajaId: sesion._id,
      tipo: 'GASTO',
      monto,
      descripcion: descripcion.trim(),
      usuario: req.user._id
    });

    const populated = await CashMovement.findById(movimiento._id)
      .populate('usuario', 'username');

    res.status(201).json({
      success: true,
      message: 'Gasto registrado',
      movimiento: populated
    });
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el gasto',
      error: error.message
    });
  }
});

// @route   POST /api/cash/retiro
// @desc    Registrar retiro (solo MASTER)
// @access  Private/Master
router.post('/retiro', requireMaster, async (req, res) => {
  try {
    const { monto, descripcion } = req.body;

    if (!monto || monto <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser mayor a cero'
      });
    }

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({
        success: false,
        message: 'La descripcion es requerida'
      });
    }

    const sesion = await CashSession.findOne({ estado: 'ABIERTA' });
    if (!sesion) {
      return res.status(400).json({
        success: false,
        message: 'No hay caja abierta'
      });
    }

    const movimiento = await CashMovement.create({
      cajaId: sesion._id,
      tipo: 'RETIRO',
      monto,
      descripcion: descripcion.trim(),
      usuario: req.user._id
    });

    const populated = await CashMovement.findById(movimiento._id)
      .populate('usuario', 'username');

    res.status(201).json({
      success: true,
      message: 'Retiro registrado',
      movimiento: populated
    });
  } catch (error) {
    console.error('Error al registrar retiro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el retiro',
      error: error.message
    });
  }
});

// @route   GET /api/cash/actual
// @desc    Ver caja actual con saldo calculado
// @access  Private
router.get('/actual', async (req, res) => {
  try {
    const sesion = await CashSession.findOne({ estado: 'ABIERTA' })
      .populate('usuarioApertura', 'username');

    if (!sesion) {
      return res.json({
        success: true,
        abierta: false,
        sesion: null
      });
    }

    const ventasEfectivo = await calcularVentasEfectivo(sesion);
    const { ingresos, gastos, retiros } = await calcularTotalesCaja(sesion._id);
    const saldoTeorico = sesion.montoApertura + ventasEfectivo + ingresos - gastos - retiros;

    // Obtener movimientos de caja
    let movimientos = await CashMovement.find({ cajaId: sesion._id })
      .populate('usuario', 'username')
      .sort({ fecha: -1 });

    // VENDEDOR: no puede ver retiros
    if (req.user.role === 'VENDEDOR') {
      movimientos = movimientos.filter(m => m.tipo !== 'RETIRO');
    }

    const resData = {
      success: true,
      abierta: true,
      sesion: {
        _id: sesion._id,
        fechaApertura: sesion.fechaApertura,
        montoApertura: sesion.montoApertura,
        usuarioApertura: sesion.usuarioApertura,
        estado: sesion.estado
      },
      resumen: {
        montoApertura: sesion.montoApertura,
        ventasEfectivo,
        ingresos,
        gastos,
        saldoTeorico
      },
      movimientos
    };

    // Solo MASTER ve retiros en el resumen
    if (req.user.role === 'MASTER') {
      resData.resumen.retiros = retiros;
    }

    res.json(resData);
  } catch (error) {
    console.error('Error al obtener caja actual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la caja',
      error: error.message
    });
  }
});

// @route   GET /api/cash/historial
// @desc    Historial de cajas cerradas (solo MASTER)
// @access  Private/Master
router.get('/historial', requireMaster, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const sesiones = await CashSession.find({ estado: 'CERRADA' })
      .populate('usuarioApertura', 'username')
      .populate('usuarioCierre', 'username')
      .sort({ fechaCierre: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: sesiones.length,
      sesiones
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial',
      error: error.message
    });
  }
});

module.exports = router;
