const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB conectado exitosamente');

    // Limpiar barcodes vacíos para que el índice sparse funcione correctamente
    // Esto permite múltiples productos sin código de barras
    const db = mongoose.connection.db;
    const result = await db.collection('products').updateMany(
      { $or: [{ barcode: '' }, { barcode: null }] },
      { $unset: { barcode: 1 } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✓ Limpiados ${result.modifiedCount} barcodes vacíos`);
    }
  } catch (error) {
    console.error('✗ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
