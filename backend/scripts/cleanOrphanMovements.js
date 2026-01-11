require('dotenv').config();
const mongoose = require('mongoose');
const StockMovement = require('../src/models/StockMovement');
const Product = require('../src/models/Product');

async function cleanOrphanMovements() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB\n');

    console.log('Buscando movimientos huérfanos...\n');

    // Obtener todos los movimientos
    const allMovements = await StockMovement.find().lean();
    console.log(`Total de movimientos encontrados: ${allMovements.length}`);

    let orphanCount = 0;
    const orphanIds = [];

    // Verificar cada movimiento
    for (const movement of allMovements) {
      if (!movement.producto) {
        // Producto es null
        orphanIds.push(movement._id);
        orphanCount++;
        console.log(`  - Movimiento huérfano encontrado (producto null): ${movement.comprobante || movement._id}`);
      } else {
        // Verificar si el producto existe
        const productExists = await Product.findById(movement.producto);
        if (!productExists) {
          orphanIds.push(movement._id);
          orphanCount++;
          console.log(`  - Movimiento huérfano encontrado (producto no existe): ${movement.comprobante || movement._id}`);
        }
      }
    }

    if (orphanCount === 0) {
      console.log('\n✓ No se encontraron movimientos huérfanos');
      process.exit(0);
    }

    console.log(`\n⚠ Se encontraron ${orphanCount} movimientos huérfanos`);
    console.log('\nEliminando movimientos huérfanos...');

    // Eliminar movimientos huérfanos
    const result = await StockMovement.deleteMany({
      _id: { $in: orphanIds }
    });

    console.log(`✓ ${result.deletedCount} movimientos huérfanos eliminados`);

    // Verificar comprobantes vacíos (si todos los movimientos de un comprobante fueron eliminados)
    console.log('\nVerificando comprobantes vacíos...');
    const remainingMovements = await StockMovement.find().lean();
    const comprobantes = new Set(remainingMovements.map(m => m.comprobante));
    console.log(`✓ Comprobantes válidos restantes: ${comprobantes.size}`);

    console.log('\n✓ Limpieza completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error al limpiar movimientos huérfanos:', error.message);
    process.exit(1);
  }
}

cleanOrphanMovements();
