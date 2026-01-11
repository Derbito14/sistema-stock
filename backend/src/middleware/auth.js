const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Verificar si el token existe en los headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener el token del header
      token = req.headers.authorization.split(' ')[1];

      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Agregar el usuario al request (sin la contraseña)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      next();
    } catch (error) {
      console.error('Error en autenticación:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado, token no proporcionado'
    });
  }
};

module.exports = { protect };
