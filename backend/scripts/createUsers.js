require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const users = [
  { username: 'Robito', password: '123456', role: 'MASTER' },
  { username: 'Agustin', password: '123456', role: 'MASTER' },
  { username: 'Vendedor1', password: '123456', role: 'VENDEDOR' },
  { username: 'Vendedor2', password: '123456', role: 'VENDEDOR' },
  { username: 'Vendedor3', password: '123456', role: 'VENDEDOR' }
];

const createUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    for (const userData of users) {
      const existing = await User.findOne({ username: userData.username });
      if (existing) {
        console.log(`Ya existe: ${userData.username} (${existing.role})`);
        continue;
      }

      await User.create(userData);
      console.log(`Creado: ${userData.username} (${userData.role})`);
    }

    console.log('\nUsuarios listos. Contrasena por defecto: 123456');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createUsers();
