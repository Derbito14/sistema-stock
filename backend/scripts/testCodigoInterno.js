require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

async function testCodigoInterno() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB\n');

    // Crear un producto de prueba
    console.log('Creando producto de prueba...');
    const testProduct = await Product.create({
      name: 'Producto de Prueba Auto',
      price: 100,
      minStock: 5
    });

    console.log('✓ Producto creado exitosamente:');
    console.log(`  Código Interno: ${testProduct.codigoInterno}`);
    console.log(`  Nombre: ${testProduct.name}`);
    console.log(`  ID: ${testProduct._id}\n`);

    // Limpiar (eliminar el producto de prueba)
    await Product.findByIdAndDelete(testProduct._id);
    console.log('✓ Producto de prueba eliminado\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testCodigoInterno();
