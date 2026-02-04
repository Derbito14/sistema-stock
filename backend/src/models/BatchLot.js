const mongoose = require('mongoose');

const batchLotSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es requerido'],
    index: true
  },
  movimientoIngreso: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockMovement',
    required: [true, 'El movimiento de ingreso es requerido']
  },
  cantidadInicial: {
    type: Number,
    required: [true, 'La cantidad inicial es requerida'],
    min: [0.001, 'La cantidad debe ser mayor a 0']
  },
  cantidadRestante: {
    type: Number,
    required: [true, 'La cantidad restante es requerida'],
    min: [0, 'La cantidad restante no puede ser negativa']
  },
  precioCompraUnitario: {
    type: Number,
    required: [true, 'El precio de compra es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  fechaCompra: {
    type: Date,
    default: Date.now,
    required: true
  },
  estado: {
    type: String,
    enum: ['ACTIVO', 'AGOTADO'],
    default: 'ACTIVO'
  },
  observacion: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para FIFO (ordenado por fecha ascendente)
batchLotSchema.index({ producto: 1, estado: 1, fechaCompra: 1 });

// Método estático: Obtener lotes con stock disponible ordenados por FIFO
batchLotSchema.statics.getLotesConStockFIFO = async function(productoId) {
  return await this.find({
    producto: productoId,
    estado: 'ACTIVO',
    cantidadRestante: { $gt: 0 }
  })
  .sort({ fechaCompra: 1 }) // FIFO: primero los más antiguos
  .lean();
};

// Método estático: Calcular stock total desde lotes
batchLotSchema.statics.calcularStockTotal = async function(productoId) {
  const result = await this.aggregate([
    {
      $match: {
        producto: new mongoose.Types.ObjectId(productoId),
        estado: 'ACTIVO'
      }
    },
    {
      $group: {
        _id: null,
        stockTotal: { $sum: '$cantidadRestante' }
      }
    }
  ]);

  return result.length > 0 ? result[0].stockTotal : 0;
};

// Método estático: Calcular stock total para múltiples productos
batchLotSchema.statics.calcularStockTotalBulk = async function(productoIds) {
  const objectIds = productoIds.map(id => new mongoose.Types.ObjectId(id));

  const result = await this.aggregate([
    {
      $match: {
        producto: { $in: objectIds },
        estado: 'ACTIVO'
      }
    },
    {
      $group: {
        _id: '$producto',
        stockTotal: { $sum: '$cantidadRestante' }
      }
    }
  ]);

  const stockMap = {};
  productoIds.forEach(id => {
    stockMap[id.toString()] = 0;
  });

  result.forEach(item => {
    stockMap[item._id.toString()] = item.stockTotal;
  });

  return stockMap;
};

// Método estático: Obtener costo promedio ponderado
batchLotSchema.statics.getCostoPromedioPonderado = async function(productoId) {
  const lotes = await this.find({
    producto: productoId,
    estado: 'ACTIVO',
    cantidadRestante: { $gt: 0 }
  }).lean();

  if (lotes.length === 0) return 0;

  let totalValor = 0;
  let totalCantidad = 0;

  lotes.forEach(lote => {
    totalValor += lote.cantidadRestante * lote.precioCompraUnitario;
    totalCantidad += lote.cantidadRestante;
  });

  return totalCantidad > 0 ? totalValor / totalCantidad : 0;
};

// Método estático: Obtener valor total en stock
batchLotSchema.statics.getValorEnStock = async function(productoId) {
  const result = await this.aggregate([
    {
      $match: {
        producto: new mongoose.Types.ObjectId(productoId),
        estado: 'ACTIVO'
      }
    },
    {
      $group: {
        _id: null,
        valorTotal: {
          $sum: {
            $multiply: ['$cantidadRestante', '$precioCompraUnitario']
          }
        }
      }
    }
  ]);

  return result.length > 0 ? result[0].valorTotal : 0;
};

// Pre-save: actualizar estado a AGOTADO si no queda cantidad
batchLotSchema.pre('save', function(next) {
  if (this.cantidadRestante <= 0) {
    this.estado = 'AGOTADO';
    this.cantidadRestante = 0;
  }
  next();
});

module.exports = mongoose.model('BatchLot', batchLotSchema);
