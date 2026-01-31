const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre de la familia es requerido'],
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true,
    default: ''
  },
  activo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de guardar
familySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Family', familySchema);
