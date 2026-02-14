const mongoose = require('mongoose');

const cashMovementSchema = new mongoose.Schema({
  cajaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashSession',
    required: [true, 'La caja es requerida']
  },
  tipo: {
    type: String,
    enum: {
      values: ['INGRESO', 'GASTO', 'RETIRO'],
      message: 'El tipo debe ser INGRESO, GASTO o RETIRO'
    },
    required: [true, 'El tipo es requerido']
  },
  monto: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0.01, 'El monto debe ser mayor a cero']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripcion es requerida'],
    trim: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

cashMovementSchema.index({ cajaId: 1, fecha: -1 });
cashMovementSchema.index({ tipo: 1 });

module.exports = mongoose.model('CashMovement', cashMovementSchema);
