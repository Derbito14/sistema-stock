// Cache de productos
let productosCache = [];
let productoSeleccionadoId = null;
let searchTimeout = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('searchProducto');

  // Deshabilitar input mientras cargan los productos
  searchInput.disabled = true;
  searchInput.placeholder = 'Cargando productos...';

  await loadProductos();

  // Habilitar input después de cargar
  searchInput.disabled = false;
  searchInput.placeholder = 'Escriba codigo o nombre del producto...';

  setupEventListeners();
});

// Cargar productos para el buscador
async function loadProductos() {
  try {
    const response = await authenticatedFetch(`${API_URL}/products`);
    const data = await response.json();

    if (data.success && data.products.length > 0) {
      productosCache = data.products;
      // Ordenar por nombre
      productosCache.sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

// Configurar event listeners
function setupEventListeners() {
  const searchInput = document.getElementById('searchProducto');
  const searchResults = document.getElementById('searchResults');
  const btnLimpiar = document.getElementById('btnLimpiarSeleccion');

  // Buscar al escribir
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      searchResults.classList.remove('active');
      return;
    }

    searchTimeout = setTimeout(() => {
      buscarProductos(query);
    }, 200);
  });

  // Cerrar resultados al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchResults.classList.remove('active');
    }
  });

  // Limpiar selección
  btnLimpiar.addEventListener('click', limpiarSeleccion);
}

// Buscar productos
function buscarProductos(query) {
  const searchResults = document.getElementById('searchResults');
  const queryLower = query.toLowerCase();

  const resultados = productosCache.filter(p =>
    p.codigoInterno.toLowerCase().includes(queryLower) ||
    p.name.toLowerCase().includes(queryLower) ||
    (p.barcode && p.barcode.toLowerCase().includes(queryLower))
  ).slice(0, 10); // Máximo 10 resultados

  if (resultados.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">No se encontraron productos</div>';
  } else {
    searchResults.innerHTML = resultados.map(p => `
      <div class="search-result-item" data-id="${p._id}" data-codigo="${p.codigoInterno}" data-nombre="${escapeHtml(p.name)}">
        <div class="search-result-codigo">${escapeHtml(p.codigoInterno)}</div>
        <div class="search-result-nombre">${escapeHtml(p.name)}</div>
      </div>
    `).join('');

    // Event listeners para cada resultado
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        seleccionarProducto(
          item.dataset.id,
          item.dataset.codigo,
          item.dataset.nombre
        );
      });
    });
  }

  searchResults.classList.add('active');
}

// Seleccionar producto
function seleccionarProducto(id, codigo, nombre) {
  productoSeleccionadoId = id;

  // Mostrar producto seleccionado
  document.getElementById('selCodigo').textContent = codigo;
  document.getElementById('selNombre').textContent = nombre;
  document.getElementById('productoSeleccionado').classList.add('active');

  // Limpiar búsqueda
  document.getElementById('searchProducto').value = '';
  document.getElementById('searchResults').classList.remove('active');

  // Cargar lotes
  cargarLotesProducto(id);
}

// Limpiar selección
function limpiarSeleccion() {
  productoSeleccionadoId = null;
  document.getElementById('productoSeleccionado').classList.remove('active');
  document.getElementById('searchProducto').value = '';

  // Mostrar estado inicial
  document.getElementById('initialState').style.display = 'block';
  document.getElementById('statsContainer').style.display = 'none';
  document.getElementById('noLotesState').style.display = 'none';
}

// Cargar lotes del producto
async function cargarLotesProducto(productoId) {
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

  // Ocultar stats de costo para VENDEDOR
  if (window.userRole === 'VENDEDOR') {
    const costoCard = document.getElementById('statCostoPromedio')?.closest('.stat-card');
    const valorCard = document.getElementById('statValorStock')?.closest('.stat-card');
    if (costoCard) costoCard.style.display = 'none';
    if (valorCard) valorCard.style.display = 'none';
  }
}

// Renderizar tabla de lotes
function renderLotes(lotes) {
  const tbody = document.getElementById('lotesTableBody');
  tbody.innerHTML = '';

  // Ocultar columnas de costos en el thead para VENDEDOR
  if (window.userRole === 'VENDEDOR') {
    const thead = tbody.closest('table')?.querySelector('thead tr');
    if (thead) {
      const ths = thead.querySelectorAll('th');
      // Columnas 5 y 6 (0-indexed) = "Precio Compra" y "Valor Restante"
      if (ths[5]) ths[5].style.display = 'none';
      if (ths[6]) ths[6].style.display = 'none';
    }
  }

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

    const isVendedor = window.userRole === 'VENDEDOR';
    row.innerHTML = `
      <td>
        ${esSiguiente ? '<span class="fifo-indicator next" title="Proximo en salir"></span>' : ''}
      </td>
      <td>${fechaFormateada}</td>
      <td>${escapeHtml(comprobante)}</td>
      <td class="text-center">${formatStock(lote.cantidadInicial)}</td>
      <td class="text-center"><strong>${formatStock(lote.cantidadRestante)}</strong></td>
      ${!isVendedor ? `<td class="text-right">${formatPrice(lote.precioCompraUnitario)}</td>` : ''}
      ${!isVendedor ? `<td class="text-right">${formatPrice(valorRestante)}</td>` : ''}
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
