/**
 * Script de Migración: Crear lotes para movimientos históricos
 *
 * Este script:
 * 1. Recorre todos los productos con movimientos
 * 2. Crea lotes por cada INGRESO histórico
 * 3. Procesa los EGRESOS en orden cronológico para ajustar cantidadRestante
 * 4. Actualiza los productos con precioCompraBase y precioVentaBase
 *
 * Ejecutar: node backend/scripts/migrateLotes.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const StockMovement = require('../src/models/StockMovement');
const BatchLot = require('../src/models/BatchLot');

async function conectarDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stock_system';
    await mongoose.connect(mongoUri);
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

async function migrarLotes() {
  console.log('\n=== INICIO DE MIGRACION DE LOTES ===\n');

  // Obtener todos los productos activos
  const productos = await Product.find({ activo: true }).lean();
  console.log(`Productos activos encontrados: ${productos.length}`);

  let productosConLotes = 0;
  let lotesCreados = 0;
  let productosActualizados = 0;

  for (const producto of productos) {
    console.log(`\n--- Procesando: ${producto.codigoInterno} - ${producto.name} ---`);

    // Verificar si ya tiene lotes
    const lotesExistentes = await BatchLot.countDocuments({ producto: producto._id });
    if (lotesExistentes > 0) {
      console.log(`  Ya tiene ${lotesExistentes} lotes, saltando...`);
      continue;
    }

    // Obtener todos los movimientos ordenados cronológicamente
    const movimientos = await StockMovement.find({ producto: producto._id })
      .sort({ fecha: 1, createdAt: 1 })
      .lean();

    if (movimientos.length === 0) {
      console.log('  Sin movimientos, saltando...');
      continue;
    }

    console.log(`  Movimientos encontrados: ${movimientos.length}`);

    // Separar ingresos y egresos
    const ingresos = movimientos.filter(m => m.tipo === 'INGRESO');
    const egresos = movimientos.filter(m => m.tipo === 'EGRESO');

    console.log(`  Ingresos: ${ingresos.length}, Egresos: ${egresos.length}`);

    // Usar el precio actual del producto como precio de compra estimado
    const precioCompraEstimado = producto.precioCompraBase || producto.price || 0;

    // Crear lotes para cada ingreso
    const lotesCrear = [];
    for (const ingreso of ingresos) {
      lotesCrear.push({
        producto: producto._id,
        movimientoIngreso: ingreso._id,
        cantidadInicial: ingreso.cantidad,
        cantidadRestante: ingreso.cantidad, // Inicialmente igual a la inicial
        precioCompraUnitario: ingreso.precioCompra || precioCompraEstimado,
        fechaCompra: ingreso.fecha,
        estado: 'ACTIVO',
        observacion: `Migrado desde movimiento ${ingreso.comprobante}`
      });
    }

    if (lotesCrear.length === 0) {
      console.log('  Sin ingresos para crear lotes');
      continue;
    }

    // Crear lotes en la base de datos
    const lotesNuevos = await BatchLot.insertMany(lotesCrear);
    console.log(`  Lotes creados: ${lotesNuevos.length}`);
    lotesCreados += lotesNuevos.length;
    productosConLotes++;

    // Procesar egresos para ajustar cantidadRestante (simular FIFO)
    // Ordenar egresos cronológicamente
    egresos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    for (const egreso of egresos) {
      let cantidadPorDescontar = egreso.cantidad;

      // Obtener lotes con stock disponible, ordenados FIFO
      const lotesDisponibles = await BatchLot.find({
        producto: producto._id,
        cantidadRestante: { $gt: 0 },
        fechaCompra: { $lte: egreso.fecha } // Solo lotes anteriores al egreso
      })
      .sort({ fechaCompra: 1 })
      .exec();

      for (const lote of lotesDisponibles) {
        if (cantidadPorDescontar <= 0) break;

        const cantidadDescontar = Math.min(cantidadPorDescontar, lote.cantidadRestante);
        lote.cantidadRestante -= cantidadDescontar;

        if (lote.cantidadRestante <= 0) {
          lote.estado = 'AGOTADO';
          lote.cantidadRestante = 0;
        }

        await lote.save();
        cantidadPorDescontar -= cantidadDescontar;
      }

      if (cantidadPorDescontar > 0) {
        console.log(`  ADVERTENCIA: Egreso ${egreso.comprobante} tiene ${cantidadPorDescontar} unidades sin lote asignado`);
      }
    }

    // Actualizar producto con precioCompraBase y precioVentaBase
    const precioVenta = producto.price || 0;
    const margen = precioCompraEstimado > 0
      ? ((precioVenta - precioCompraEstimado) / precioCompraEstimado) * 100
      : 0;

    await Product.findByIdAndUpdate(producto._id, {
      precioCompraBase: precioCompraEstimado,
      precioVentaBase: precioVenta,
      margenGananciaPorcentaje: Math.round(margen * 100) / 100,
      precioVentaManual: true // Marcar como manual ya que no sabemos el margen real
    });

    productosActualizados++;
    console.log(`  Producto actualizado: PrecioCompra=$${precioCompraEstimado}, Margen=${margen.toFixed(2)}%`);
  }

  console.log('\n=== RESUMEN DE MIGRACION ===');
  console.log(`Productos procesados: ${productos.length}`);
  console.log(`Productos con lotes creados: ${productosConLotes}`);
  console.log(`Total de lotes creados: ${lotesCreados}`);
  console.log(`Productos actualizados: ${productosActualizados}`);
}

async function verificarMigracion() {
  console.log('\n=== VERIFICACION POST-MIGRACION ===\n');

  const totalLotes = await BatchLot.countDocuments();
  const lotesActivos = await BatchLot.countDocuments({ estado: 'ACTIVO', cantidadRestante: { $gt: 0 } });
  const lotesAgotados = await BatchLot.countDocuments({ estado: 'AGOTADO' });

  console.log(`Total de lotes: ${totalLotes}`);
  console.log(`Lotes activos con stock: ${lotesActivos}`);
  console.log(`Lotes agotados: ${lotesAgotados}`);

  // Verificar algunos productos al azar
  const productosConLotes = await BatchLot.aggregate([
    { $group: { _id: '$producto', totalLotes: { $sum: 1 }, stockTotal: { $sum: '$cantidadRestante' } } },
    { $limit: 5 }
  ]);

  console.log('\nMuestra de productos con lotes:');
  for (const item of productosConLotes) {
    const producto = await Product.findById(item._id).select('codigoInterno name').lean();
    console.log(`  ${producto?.codigoInterno || 'N/A'}: ${item.totalLotes} lotes, stock=${item.stockTotal}`);
  }
}

async function main() {
  try {
    await conectarDB();
    await migrarLotes();
    await verificarMigracion();
    console.log('\n=== MIGRACION COMPLETADA EXITOSAMENTE ===\n');
  } catch (error) {
    console.error('\nError durante la migracion:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

main();
