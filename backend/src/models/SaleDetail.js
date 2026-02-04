const mongoose = require('mongoose');

const saleDetailSchema = new mongoose.Schema({
  movimientoEgreso: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockMovement',
    required: [true, 'El movimiento de egreso es requerido'],
    index: true
  },
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es requerido'],
    index: true
  },
  lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BatchLot',
    required: [true, 'El lote es requerido']
  },
  cantidadDescontada: {
    type: Number,
    required: [true, 'La cantidad descontada es requerida'],
    min: [0.001, 'La cantidad debe ser mayor a 0']
  },
  costoUnitarioReal: {
    type: Number,
    required: [true, 'El costo unitario real es requerido'],
    min: [0, 'El costo no puede ser negativo']
  },
  costoTotalReal: {
    type: Number,
    required: [true, 'El costo total real es requerido'],
    min: [0, 'El costo no puede ser negativo']
  },
  precioVentaUnitario: {
    type: Number,
    required: [true, 'El precio de venta unitario es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  precioVentaTotal: {
    type: Number,
    required: [true, 'El precio de venta total es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  gananciaUnitaria: {
    type: Number,
    required: true
  },
  gananciaTotal: {
    type: Number,
    required: true
  },
  margenPorcentaje: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para buscar detalles de un movimiento
saleDetailSchema.index({ movimientoEgreso: 1 });

// Índice para reportes por producto
saleDetailSchema.index({ producto: 1, createdAt: -1 });

// Método estático: Obtener detalles de venta de un movimiento
saleDetailSchema.statics.getDetallesPorMovimiento = async function(movimientoId) {
  return await this.find({ movimientoEgreso: movimientoId })
    .populate('lote', 'fechaCompra precioCompraUnitario')
    .populate('producto', 'codigoInterno name')
    .sort({ createdAt: 1 })
    .lean();
};

// Método estático: Obtener resumen de ganancias por producto
saleDetailSchema.statics.getResumenGananciasPorProducto = async function(productoId, fechaDesde, fechaHasta) {
  const match = {
    producto: new mongoose.Types.ObjectId(productoId)
  };

  if (fechaDesde || fechaHasta) {
    match.createdAt = {};
    if (fechaDesde) match.createdAt.$gte = new Date(fechaDesde);
    if (fechaHasta) match.createdAt.$lte = new Date(fechaHasta);
  }

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        cantidadVendida: { $sum: '$cantidadDescontada' },
        costoTotal: { $sum: '$costoTotalReal' },
        ventaTotal: { $sum: '$precioVentaTotal' },
        gananciaTotal: { $sum: '$gananciaTotal' },
        margenPromedio: { $avg: '$margenPorcentaje' }
      }
    }
  ]);
};

module.exports = mongoose.model('SaleDetail', saleDetailSchema);
