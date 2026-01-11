const StockMovement = require('../models/StockMovement');

/**
 * Calcula el stock actual de un producto basándose en sus movimientos
 * @param {String} productoId - ID del producto
 * @returns {Promise<Number>} - Stock actual
 */
async function calculateStock(productoId) {
  try {
    const movements = await StockMovement.find({ producto: productoId });

    let stock = 0;

    movements.forEach(movement => {
      if (movement.tipo === 'INGRESO') {
        stock += Math.abs(movement.cantidad);
      } else if (movement.tipo === 'EGRESO') {
        stock -= Math.abs(movement.cantidad);
      } else if (movement.tipo === 'AJUSTE') {
        // AJUSTE puede ser positivo o negativo
        stock += movement.cantidad;
      }
    });

    return stock;
  } catch (error) {
    console.error('Error al calcular stock:', error);
    throw error;
  }
}

/**
 * Calcula el stock de múltiples productos
 * @param {Array<String>} productoIds - Array de IDs de productos
 * @returns {Promise<Object>} - Objeto con productoId como key y stock como value
 */
async function calculateStockBulk(productoIds) {
  try {
    const movements = await StockMovement.find({
      producto: { $in: productoIds }
    });

    const stockMap = {};

    // Inicializar todos los productos en 0
    productoIds.forEach(id => {
      stockMap[id.toString()] = 0;
    });

    // Calcular stock
    movements.forEach(movement => {
      const productId = movement.producto.toString();

      if (movement.tipo === 'INGRESO') {
        stockMap[productId] += Math.abs(movement.cantidad);
      } else if (movement.tipo === 'EGRESO') {
        stockMap[productId] -= Math.abs(movement.cantidad);
      } else if (movement.tipo === 'AJUSTE') {
        stockMap[productId] += movement.cantidad;
      }
    });

    return stockMap;
  } catch (error) {
    console.error('Error al calcular stock en bulk:', error);
    throw error;
  }
}

module.exports = {
  calculateStock,
  calculateStockBulk
};
