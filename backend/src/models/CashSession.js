const mongoose = require('mongoose');

const cashSessionSchema = new mongoose.Schema({
  fechaApertura: {
    type: Date,
    required: true,
    default: Date.now
  },
  montoApertura: {
    type: Number,
    required: [true, 'El monto de apertura es requerido'],
    min: [0, 'El monto no puede ser negativo']
  },
  fechaCierre: {
    type: Date,
    default: null
  },
  montoCierreReal: {
    type: Number,
    default: null
  },
  saldoTeorico: {
    type: Number,
    default: null
  },
  diferencia: {
    type: Number,
    default: null
  },
  estado: {
    type: String,
    enum: ['ABIERTA', 'CERRADA'],
    default: 'ABIERTA',
    required: true
  },
  usuarioApertura: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usuarioCierre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

cashSessionSchema.index({ estado: 1 });
cashSessionSchema.index({ fechaApertura: -1 });

module.exports = mongoose.model('CashSession', cashSessionSchema);
