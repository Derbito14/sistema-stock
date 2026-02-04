// Cache de productos
let productosCache = [];

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadProductos();
  setupEventListeners();
});

// Cargar productos para el selector
async function loadProductos() {
  const select = document.getElementById('selectProducto');

  try {
    const response = await authenticatedFetch(`${API_URL}/products`);
    const data = await response.json();

    if (data.success && data.products.length > 0) {
      productosCache = data.products;

      // Ordenar por nombre
      productosCache.sort((a, b) => a.name.localeCompare(b.name));

      productosCache.forEach(product => {
        const option = document.createElement('option');
        option.value = product._id;
        option.textContent = `${product.codigoInterno} - ${product.name}`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

// Configurar event listeners
function setupEventListeners() {
  const select = document.getElementById('selectProducto');
  select.addEventListener('change', handleProductoChange);
}

// Manejar cambio de producto
async function handleProductoChange(e) {
  const productoId = e.target.value;

  const initialState = document.getElementById('initialState');
  const loadingState = document.getElementById('loadingState');
  const noLotesState = document.getElementById('noLotesState');
  const statsContainer = document.getElementById('statsContainer');

  // Ocultar todos los estados
  initialState.style.display = 'none';
  loadingState.style.display = 'none';
  noLotesState.style.display = 'none';
  statsContainer.style.display = 'none';

  if (!productoId) {
    initialState.style.display = 'block';
    return;
  }

  // Mostrar loading
  loadingState.style.display = 'block';

  try {
    const response = await authenticatedFetch(`${API_URL}/stock-movements/lotes/${productoId}`);
    const data = await response.json();

    loadingState.style.display = 'none';

    if (data.success) {
      if (data.lotes.length === 0) {
        noLotesState.style.display = 'block';
      } else {
        renderStats(data.estadisticas);
        renderLotes(data.lotes);
        statsContainer.style.display = 'block';
      }
    } else {
      showError('Error al cargar lotes: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    loadingState.style.display = 'none';
    showError('Error de conexion al cargar lotes');
  }
}

// Renderizar estadísticas
function renderStats(stats) {
  document.getElementById('statStock').textContent = formatStock(stats.stockTotal);
  document.getElementById('statCostoPromedio').textContent = formatPrice(stats.costoPromedio);
  document.getElementById('statValorStock').textContent = formatPrice(stats.valorEnStock);
  document.getElementById('statLotesActivos').textContent = stats.lotesActivos;
  document.getElementById('statPrecioVenta').textContent = formatPrice(stats.precioVentaActual);
}

// Renderizar tabla de lotes
function renderLotes(lotes) {
  const tbody = document.getElementById('lotesTableBody');
  tbody.innerHTML = '';

  // Encontrar el primer lote con stock (para indicador FIFO)
  const primerLoteConStock = lotes.find(l => l.cantidadRestante > 0);

  lotes.forEach(lote => {
    const row = document.createElement('tr');

    // Indicador FIFO
    const esSiguiente = primerLoteConStock && primerLoteConStock._id === lote._id;

    // Formato de fecha
    const fecha = new Date(lote.fechaCompra);
    const fechaFormateada = fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Comprobante
    const comprobante = lote.movimientoIngreso?.comprobante || 'N/A';

    // Valor restante
    const valorRestante = lote.cantidadRestante * lote.precioCompraUnitario;

    // Estado
    const estadoClass = lote.estado === 'ACTIVO' ? 'activo' : 'agotado';

    row.innerHTML = `
      <td>
        ${esSiguiente ? '<span class="fifo-indicator next" title="Proximo en salir"></span>' : ''}
      </td>
      <td>${fechaFormateada}</td>
      <td>${escapeHtml(comprobante)}</td>
      <td class="text-center">${formatStock(lote.cantidadInicial)}</td>
      <td class="text-center"><strong>${formatStock(lote.cantidadRestante)}</strong></td>
      <td class="text-right">${formatPrice(lote.precioCompraUnitario)}</td>
      <td class="text-right">${formatPrice(valorRestante)}</td>
      <td class="text-center">
        <span class="badge-estado ${estadoClass}">${lote.estado}</span>
      </td>
    `;

    // Destacar fila si es el próximo en salir
    if (esSiguiente) {
      row.style.backgroundColor = '#e8f5e9';
    }

    tbody.appendChild(row);
  });
}

// Formatear stock
function formatStock(value) {
  if (value === undefined || value === null) return '0';
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

// Formatear precio
function formatPrice(value) {
  if (value === undefined || value === null) return '$0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value);
}

// Mostrar error
function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message
  });
}
