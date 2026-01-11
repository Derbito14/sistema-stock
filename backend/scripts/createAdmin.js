require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const createAdminUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // Verificar si ya existe un usuario admin
    const existingAdmin = await User.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('⚠ Ya existe un usuario admin');
      console.log('Si quieres crear uno nuevo, primero elimina el existente desde MongoDB');
      process.exit(0);
    }

    // Crear usuario admin
    const adminUser = await User.create({
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    });

    console.log('✓ Usuario admin creado exitosamente');
    console.log('  Usuario: admin');
    console.log('  Contraseña: admin123');
    console.log('\n⚠ IMPORTANTE: Cambia la contraseña en producción');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error al crear usuario admin:', error.message);
    process.exit(1);
  }
};

createAdminUser();
