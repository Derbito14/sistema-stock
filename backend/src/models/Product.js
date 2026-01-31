const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  codigoInterno: {
    type: String,
    unique: true,
    trim: true
    // NO required aquí, se genera automáticamente
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true, // Permite múltiples valores null
    trim: true
  },
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true
  },
  familia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    default: null
  },
  unidad: {
    type: String,
    enum: ['unidad', 'gramos'],
    default: 'unidad'
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'El stock mínimo es requerido'],
    min: [0, 'El stock mínimo no puede ser negativo'],
    default: 0
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

// Generar código interno ANTES de la validación (para documentos nuevos)
productSchema.pre('validate', async function(next) {
  // Solo generar si es un documento nuevo y no tiene código interno
  if (this.isNew && !this.codigoInterno) {
    try {
      // Buscar el último producto ordenado por codigoInterno (más confiable)
      const lastProduct = await this.constructor.findOne({
        codigoInterno: { $exists: true }
      })
      .sort({ codigoInterno: -1 })
      .select('codigoInterno')
      .lean();

      let nextNumber = 1;

      if (lastProduct && lastProduct.codigoInterno) {
        // Extraer el número del formato P-000001
        const match = lastProduct.codigoInterno.match(/P-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Formatear con padding de 6 dígitos
      this.codigoInterno = `P-${String(nextNumber).padStart(6, '0')}`;

      console.log(`Código interno generado: ${this.codigoInterno}`);
    } catch (error) {
      console.error('Error al generar código interno:', error);
      return next(error);
    }
  }
  next();
});

// Actualizar updatedAt antes de guardar
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
