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
    trim: true,
    set: v => (!v || v.trim() === '') ? undefined : v // Convertir vacío a undefined
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
    enum: ['unidad', 'kg'],
    default: 'unidad'
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo'],
    default: 0
  },
  precioCompraBase: {
    type: Number,
    min: [0, 'El precio de compra no puede ser negativo'],
    default: 0
  },
  precioVentaBase: {
    type: Number,
    min: [0, 'El precio de venta no puede ser negativo'],
    default: 0
  },
  margenGananciaPorcentaje: {
    type: Number,
    min: [0, 'El margen no puede ser negativo'],
    max: [1000, 'El margen no puede superar 1000%'],
    default: 0
  },
  precioVentaManual: {
    type: Boolean,
    default: false
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

// Actualizar updatedAt antes de guardar y limpiar barcode vacío
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Asegurar que barcode vacío sea undefined (para que sparse funcione)
  if (this.barcode === '' || this.barcode === null) {
    this.barcode = undefined;
  }

  // Si no es precio manual, calcular precio de venta automáticamente
  if (!this.precioVentaManual && this.precioCompraBase > 0) {
    this.precioVentaBase = this.precioCompraBase + (this.precioCompraBase * this.margenGananciaPorcentaje / 100);
    this.price = this.precioVentaBase; // compatibilidad con campo existente
  } else if (this.precioVentaManual && this.precioVentaBase > 0) {
    this.price = this.precioVentaBase; // mantener sincronizado
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
