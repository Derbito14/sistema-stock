// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  // Establecer fechas por defecto (mes actual)
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  document.getElementById('fechaDesde').value = formatDateForInput(primerDiaMes);
  document.getElementById('fechaHasta').value = formatDateForInput(hoy);

  setupEventListeners();
  cargarReporte();
});

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

function setupEventListeners() {
  document.getElementById('btnFiltrar').addEventListener('click', cargarReporte);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarFiltros);
}

function limpiarFiltros() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  document.getElementById('fechaDesde').value = formatDateForInput(primerDiaMes);
  document.getElementById('fechaHasta').value = formatDateForInput(hoy);
  cargarReporte();
}

async function cargarReporte() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const reporteContent = document.getElementById('reporteContent');

  loadingState.style.display = 'block';
  emptyState.style.display = 'none';
  reporteContent.style.display = 'none';

  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;

  try {
    // Construir query params
    const params = new URLSearchParams();
    params.append('tipo', 'EGRESO');
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    params.append('limit', '1000'); // Traer más movimientos para el reporte

    const response = await authenticatedFetch(`${API_URL}/stock-movements?${params.toString()}`);
    const data = await response.json();

    loadingState.style.display = 'none';

    if (data.success && data.movements.length > 0) {
      // Filtrar solo los que tienen ganancia calculada
      const movimientosConGanancia = data.movements.filter(m =>
        m.gananciaTotal !== null && m.gananciaTotal !== undefined
      );

      if (movimientosConGanancia.length === 0) {
        emptyState.style.display = 'block';
        return;
      }

      procesarYMostrarReporte(movimientosConGanancia);
      reporteContent.style.display = 'block';
    } else {
      emptyState.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al cargar reporte:', error);
    loadingState.style.display = 'none';
    emptyState.innerHTML = '<h3>Error</h3><p>No se pudo cargar el reporte. Intente nuevamente.</p>';
    emptyState.style.display = 'block';
  }
}

function procesarYMostrarReporte(movimientos) {
  // Calcular totales generales
  let ventaTotal = 0;
  let costoTotal = 0;
  let gananciaTotal = 0;

  // Agrupar por producto
  const porProducto = {};

  movimientos.forEach(mov => {
    ventaTotal += mov.precioVentaTotal || 0;
    costoTotal += mov.costoTotalReal || 0;
    gananciaTotal += mov.gananciaTotal || 0;

    const productoId = mov.producto?._id || 'unknown';
    const productoKey = productoId;

    if (!porProducto[productoKey]) {
      porProducto[productoKey] = {
        codigo: mov.producto?.codigoInterno || 'N/A',
        nombre: mov.producto?.name || 'Producto eliminado',
        cantidadVendida: 0,
        ventaTotal: 0,
        costoTotal: 0,
        gananciaTotal: 0
      };
    }

    porProducto[productoKey].cantidadVendida += mov.cantidad;
    porProducto[productoKey].ventaTotal += mov.precioVentaTotal || 0;
    porProducto[productoKey].costoTotal += mov.costoTotalReal || 0;
    porProducto[productoKey].gananciaTotal += mov.gananciaTotal || 0;
  });

  // Calcular margen promedio
  const margenPromedio = costoTotal > 0 ? ((gananciaTotal / costoTotal) * 100) : 0;

  // Mostrar estadísticas generales
  document.getElementById('statVentaTotal').textContent = formatPrice(ventaTotal);
  document.getElementById('statCostoTotal').textContent = formatPrice(costoTotal);
  document.getElementById('statGananciaTotal').textContent = formatPrice(gananciaTotal);
  document.getElementById('statMargenPromedio').textContent = margenPromedio.toFixed(1) + '%';

  // Clase para ganancia negativa
  const cardGanancia = document.getElementById('cardGanancia');
  if (gananciaTotal < 0) {
    cardGanancia.classList.add('negativa');
  } else {
    cardGanancia.classList.remove('negativa');
  }

  // Mostrar detalle por producto
  const productos = Object.values(porProducto);
  productos.sort((a, b) => b.gananciaTotal - a.gananciaTotal); // Ordenar por ganancia desc

  document.getElementById('cantidadProductos').textContent = `${productos.length} productos`;

  const tbody = document.getElementById('detalleTableBody');
  tbody.innerHTML = '';

  productos.forEach(prod => {
    const margen = prod.costoTotal > 0 ? ((prod.gananciaTotal / prod.costoTotal) * 100) : 0;
    const gananciaClass = prod.gananciaTotal >= 0 ? 'text-success' : 'text-danger';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(prod.codigo)}</strong></td>
      <td>${escapeHtml(prod.nombre)}</td>
      <td class="text-center">${formatStock(prod.cantidadVendida)}</td>
      <td class="text-right">${formatPrice(prod.ventaTotal)}</td>
      <td class="text-right">${formatPrice(prod.costoTotal)}</td>
      <td class="text-right ${gananciaClass}"><strong>${formatPrice(prod.gananciaTotal)}</strong></td>
      <td class="text-center">${margen.toFixed(1)}%</td>
    `;
    tbody.appendChild(row);
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value || 0);
}

function formatStock(value) {
  if (value === undefined || value === null) return '0';
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}
