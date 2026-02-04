const BatchLot = require('../models/BatchLot');
const SaleDetail = require('../models/SaleDetail');
const Product = require('../models/Product');

/**
 * Servicio para manejo de lotes de compra y sistema FIFO
 */
class LoteService {
  /**
   * Crear un nuevo lote al registrar un ingreso
   * @param {Object} data - Datos del lote
   * @param {String} data.productoId - ID del producto
   * @param {String} data.movimientoId - ID del movimiento de ingreso
   * @param {Number} data.cantidad - Cantidad del lote
   * @param {Number} data.precioCompra - Precio de compra unitario
   * @param {Date} data.fecha - Fecha de compra
   * @param {String} data.observacion - Observación opcional
   */
  async crearLote(data) {
    const { productoId, movimientoId, cantidad, precioCompra, fecha, observacion } = data;

    const lote = await BatchLot.create({
      producto: productoId,
      movimientoIngreso: movimientoId,
      cantidadInicial: cantidad,
      cantidadRestante: cantidad,
      precioCompraUnitario: precioCompra,
      fechaCompra: fecha || new Date(),
      estado: 'ACTIVO',
      observacion: observacion || ''
    });

    return lote;
  }

  /**
   * Procesar egreso con FIFO - descontar de lotes más antiguos primero
   * @param {Object} data - Datos del egreso
   * @param {String} data.productoId - ID del producto
   * @param {String} data.movimientoId - ID del movimiento de egreso
   * @param {Number} data.cantidad - Cantidad a descontar
   * @param {Number} data.precioVenta - Precio de venta unitario
   * @returns {Object} - Resultado con detalles de venta y totales
   */
  async procesarEgresoFIFO(data) {
    const { productoId, movimientoId, cantidad, precioVenta } = data;

    // Obtener lotes con stock ordenados por FIFO
    const lotesDisponibles = await BatchLot.getLotesConStockFIFO(productoId);

    if (lotesDisponibles.length === 0) {
      throw new Error('No hay lotes con stock disponible para este producto');
    }

    // Calcular stock total disponible
    const stockTotal = lotesDisponibles.reduce((sum, lote) => sum + lote.cantidadRestante, 0);

    if (stockTotal < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${stockTotal}, Solicitado: ${cantidad}`);
    }

    let cantidadRestante = cantidad;
    const detallesVenta = [];
    let costoTotalReal = 0;
    let precioVentaTotal = 0;
    let gananciaTotal = 0;

    // Procesar lotes en orden FIFO
    for (const lote of lotesDisponibles) {
      if (cantidadRestante <= 0) break;

      const cantidadDescontar = Math.min(cantidadRestante, lote.cantidadRestante);
      const costoUnitario = lote.precioCompraUnitario;
      const costoTotal = cantidadDescontar * costoUnitario;
      const ventaTotal = cantidadDescontar * precioVenta;
      const ganancia = ventaTotal - costoTotal;
      const margen = costoUnitario > 0 ? ((precioVenta - costoUnitario) / costoUnitario) * 100 : 0;

      // Crear detalle de venta
      const detalle = await SaleDetail.create({
        movimientoEgreso: movimientoId,
        producto: productoId,
        lote: lote._id,
        cantidadDescontada: cantidadDescontar,
        costoUnitarioReal: costoUnitario,
        costoTotalReal: costoTotal,
        precioVentaUnitario: precioVenta,
        precioVentaTotal: ventaTotal,
        gananciaUnitaria: precioVenta - costoUnitario,
        gananciaTotal: ganancia,
        margenPorcentaje: margen
      });

      detallesVenta.push(detalle);

      // Actualizar lote
      const loteDoc = await BatchLot.findById(lote._id);
      loteDoc.cantidadRestante -= cantidadDescontar;
      await loteDoc.save(); // El pre-save actualizará el estado a AGOTADO si corresponde

      costoTotalReal += costoTotal;
      precioVentaTotal += ventaTotal;
      gananciaTotal += ganancia;
      cantidadRestante -= cantidadDescontar;
    }

    return {
      detallesVenta,
      costoTotalReal,
      precioVentaTotal,
      gananciaTotal,
      lotesAfectados: detallesVenta.length
    };
  }

  /**
   * Calcular stock total por lotes de un producto
   * @param {String} productoId - ID del producto
   * @returns {Number} - Stock total
   */
  async calcularStockPorLotes(productoId) {
    return await BatchLot.calcularStockTotal(productoId);
  }

  /**
   * Obtener todos los lotes de un producto
   * @param {String} productoId - ID del producto
   * @param {Boolean} soloActivos - Si solo se devuelven lotes activos
   * @returns {Array} - Lista de lotes
   */
  async getLotesProducto(productoId, soloActivos = false) {
    const query = { producto: productoId };
    if (soloActivos) {
      query.estado = 'ACTIVO';
      query.cantidadRestante = { $gt: 0 };
    }

    const lotes = await BatchLot.find(query)
      .populate('movimientoIngreso', 'comprobante fecha observacion')
      .sort({ fechaCompra: 1 })
      .lean();

    return lotes;
  }

  /**
   * Obtener costo promedio ponderado de un producto
   * @param {String} productoId - ID del producto
   * @returns {Number} - Costo promedio
   */
  async getCostoPromedioPonderado(productoId) {
    return await BatchLot.getCostoPromedioPonderado(productoId);
  }

  /**
   * Obtener estadísticas de lotes de un producto
   * @param {String} productoId - ID del producto
   * @returns {Object} - Estadísticas
   */
  async getEstadisticasLotes(productoId) {
    const [stockTotal, costoPromedio, valorEnStock, lotesActivos, producto] = await Promise.all([
      BatchLot.calcularStockTotal(productoId),
      BatchLot.getCostoPromedioPonderado(productoId),
      BatchLot.getValorEnStock(productoId),
      BatchLot.countDocuments({ producto: productoId, estado: 'ACTIVO', cantidadRestante: { $gt: 0 } }),
      Product.findById(productoId).select('name codigoInterno precioVentaBase').lean()
    ]);

    return {
      producto,
      stockTotal,
      costoPromedio,
      valorEnStock,
      lotesActivos,
      precioVentaActual: producto?.precioVentaBase || 0
    };
  }

  /**
   * Verificar si un producto tiene lotes
   * @param {String} productoId - ID del producto
   * @returns {Boolean}
   */
  async tieneLotes(productoId) {
    const count = await BatchLot.countDocuments({ producto: productoId });
    return count > 0;
  }

  /**
   * Obtener detalles de venta de un movimiento de egreso
   * @param {String} movimientoId - ID del movimiento
   * @returns {Array} - Detalles de venta
   */
  async getDetallesVenta(movimientoId) {
    return await SaleDetail.getDetallesPorMovimiento(movimientoId);
  }
}

module.exports = new LoteService();
