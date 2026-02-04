const StockMovement = require('../models/StockMovement');
const BatchLot = require('../models/BatchLot');

/**
 * Calcula el stock de un producto basándose en lotes activos
 * @param {String} productoId - ID del producto
 * @returns {Promise<Number>} - Stock actual desde lotes
 */
async function calculateStockByLots(productoId) {
  try {
    return await BatchLot.calcularStockTotal(productoId);
  } catch (error) {
    console.error('Error al calcular stock por lotes:', error);
    throw error;
  }
}

/**
 * Verifica si un producto tiene lotes registrados
 * @param {String} productoId - ID del producto
 * @returns {Promise<Boolean>}
 */
async function hasLots(productoId) {
  try {
    const count = await BatchLot.countDocuments({ producto: productoId });
    return count > 0;
  } catch (error) {
    console.error('Error al verificar lotes:', error);
    return false;
  }
}

/**
 * Calcula el stock actual de un producto basándose en sus movimientos
 * Si tiene lotes, usa el cálculo por lotes. Si no, usa el método legacy.
 * @param {String} productoId - ID del producto
 * @returns {Promise<Number>} - Stock actual
 */
async function calculateStock(productoId) {
  try {
    // Verificar si el producto tiene lotes
    const tieneLotes = await hasLots(productoId);

    if (tieneLotes) {
      // Usar cálculo por lotes (más preciso)
      return await calculateStockByLots(productoId);
    }

    // Método legacy: calcular desde movimientos
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
 * Calcula el stock de múltiples productos usando lotes si están disponibles
 * @param {Array<String>} productoIds - Array de IDs de productos
 * @returns {Promise<Object>} - Objeto con productoId como key y stock como value
 */
async function calculateStockBulk(productoIds) {
  try {
    // Obtener stock por lotes para todos los productos
    const stockPorLotes = await BatchLot.calcularStockTotalBulk(productoIds);

    // Identificar productos sin lotes para usar método legacy
    const productosSinLotes = [];
    for (const id of productoIds) {
      const idStr = id.toString();
      // Si tiene stock en lotes, lo usamos
      if (stockPorLotes[idStr] > 0) {
        continue;
      }
      // Verificar si tiene lotes (podría tener 0 stock pero tener lotes agotados)
      const tieneLotes = await BatchLot.countDocuments({ producto: id });
      if (tieneLotes === 0) {
        productosSinLotes.push(id);
      }
    }

    // Calcular stock legacy para productos sin lotes
    if (productosSinLotes.length > 0) {
      const movements = await StockMovement.find({
        producto: { $in: productosSinLotes }
      });

      movements.forEach(movement => {
        const productId = movement.producto.toString();

        if (movement.tipo === 'INGRESO') {
          stockPorLotes[productId] = (stockPorLotes[productId] || 0) + Math.abs(movement.cantidad);
        } else if (movement.tipo === 'EGRESO') {
          stockPorLotes[productId] = (stockPorLotes[productId] || 0) - Math.abs(movement.cantidad);
        } else if (movement.tipo === 'AJUSTE') {
          stockPorLotes[productId] = (stockPorLotes[productId] || 0) + movement.cantidad;
        }
      });
    }

    // Asegurar que todos los productos tengan un valor
    productoIds.forEach(id => {
      const idStr = id.toString();
      if (stockPorLotes[idStr] === undefined) {
        stockPorLotes[idStr] = 0;
      }
    });

    return stockPorLotes;
  } catch (error) {
    console.error('Error al calcular stock en bulk:', error);
    throw error;
  }
}

module.exports = {
  calculateStock,
  calculateStockBulk,
  calculateStockByLots,
  hasLots
};
