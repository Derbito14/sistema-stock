// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  loadMovements();
  setupFilters();
  setupLimpiarFiltros();
});

// Configurar formulario de filtros
function setupFilters() {
  const form = document.getElementById('filtersForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    loadMovements();
  });
}

// Configurar botón limpiar filtros
function setupLimpiarFiltros() {
  const btn = document.getElementById('btnLimpiarFiltros');

  btn.addEventListener('click', () => {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    document.getElementById('filtroCodigoInterno').value = '';
    document.getElementById('filtroNombreProducto').value = '';
    loadMovements();
  });
}

// Cargar movimientos con filtros
async function loadMovements() {
  const loadingEl = document.getElementById('loadingMovements');
  const errorEl = document.getElementById('errorMovements');
  const containerEl = document.getElementById('movementsContainer');
  const emptyEl = document.getElementById('emptyMovements');

  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    containerEl.style.display = 'none';
    emptyEl.style.display = 'none';

    // Construir query params
    const params = new URLSearchParams();

    const tipo = document.getElementById('filtroTipo').value;
    const fechaDesde = document.getElementById('filtroFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFechaHasta').value;
    const codigoInterno = document.getElementById('filtroCodigoInterno').value.trim();
    const nombreProducto = document.getElementById('filtroNombreProducto').value.trim();

    if (tipo) params.append('tipo', tipo);
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    if (codigoInterno) params.append('codigoInterno', codigoInterno);
    if (nombreProducto) params.append('nombreProducto', nombreProducto);

    const response = await authenticatedFetch(`${API_URL}/stock-movements?${params.toString()}`);
    const data = await response.json();

    loadingEl.style.display = 'none';

    if (data.success) {
      if (data.movements.length === 0) {
        emptyEl.style.display = 'block';
      } else {
        renderMovements(data.movements);
        document.getElementById('totalMovements').textContent = data.movements.length;
        containerEl.style.display = 'block';
      }
    } else {
      errorEl.textContent = data.message || 'Error al cargar movimientos';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al cargar movimientos:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Error de conexión con el servidor';
    errorEl.style.display = 'block';
  }
}

// Renderizar movimientos en tabla lineal
function renderMovements(movements) {
  const tbody = document.getElementById('movementsTableBody');
  tbody.innerHTML = '';

  movements.forEach(movement => {
    const row = document.createElement('tr');

    // Datos del producto
    const codigoInterno = movement.producto?.codigoInterno || 'N/A';
    const nombreProducto = movement.producto?.name || '(Producto eliminado)';
    const precio = movement.producto?.price || 0;
    const isDeleted = !movement.producto;

    // Tipo con badge
    const tipoClass = movement.tipo.toLowerCase();

    // Formatear precio
    const precioFormatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);

    row.className = isDeleted ? 'product-deleted' : '';
    row.innerHTML = `
      <td><strong>${escapeHtml(codigoInterno)}</strong></td>
      <td>${escapeHtml(nombreProducto)}</td>
      <td class="text-center"><strong>${movement.cantidad}</strong></td>
      <td class="text-right">${precioFormatted}</td>
      <td>${escapeHtml(movement.comprobante)}</td>
      <td><span class="badge tipo-${tipoClass}">${movement.tipo}</span></td>
      <td>${formatDate(movement.fecha)}</td>
      <td>${getUsuarioName(movement.usuario)}</td>
    `;

    tbody.appendChild(row);
  });
}

// Obtener nombre de usuario (puede ser objeto o null)
function getUsuarioName(usuario) {
  if (!usuario) return 'Usuario desconocido';
  if (typeof usuario === 'object') return usuario.username || 'Usuario desconocido';
  return usuario;
}
