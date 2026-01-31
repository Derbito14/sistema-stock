const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB conectado exitosamente');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    // 1. Limpiar barcodes vacíos
    const cleanResult = await collection.updateMany(
      { $or: [{ barcode: '' }, { barcode: null }] },
      { $unset: { barcode: 1 } }
    );
    if (cleanResult.modifiedCount > 0) {
      console.log(`✓ Limpiados ${cleanResult.modifiedCount} barcodes vacíos`);
    }

    // 2. Asegurar que el índice de barcode sea sparse (permite múltiples sin código)
    try {
      // Eliminar índice viejo si existe
      await collection.dropIndex('barcode_1');
      console.log('✓ Índice barcode anterior eliminado');
    } catch (e) {
      // No existe, está bien
    }

    // Crear índice correcto con sparse
    await collection.createIndex(
      { barcode: 1 },
      { unique: true, sparse: true, name: 'barcode_1' }
    );
    console.log('✓ Índice barcode configurado correctamente');

  } catch (error) {
    console.error('✗ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
