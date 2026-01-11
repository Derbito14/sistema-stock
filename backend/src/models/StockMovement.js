const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  comprobante: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es requerido']
  },
  tipo: {
    type: String,
    enum: {
      values: ['INGRESO', 'EGRESO'],
      message: 'El tipo debe ser INGRESO o EGRESO'
    },
    required: [true, 'El tipo de movimiento es requerido']
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'La cantidad debe ser mayor a cero'
    }
  },
  fecha: {
    type: Date,
    default: Date.now,
    required: true
  },
  observacion: {
    type: String,
    trim: true,
    default: ''
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar consultas
stockMovementSchema.index({ producto: 1, fecha: -1 });
stockMovementSchema.index({ comprobante: 1 });
stockMovementSchema.index({ tipo: 1, fecha: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
