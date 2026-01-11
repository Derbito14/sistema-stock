require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const stockMovementRoutes = require('./routes/stockMovements');

const app = express();

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-movements', stockMovementRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente'
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error en el servidor'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✓ Servidor corriendo en puerto ${PORT}`);
});
