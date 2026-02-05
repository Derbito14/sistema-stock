// Cache de datos
let productosCache = [];
let familiasCache = [];
let productoSeleccionadoId = null;
let searchTimeout = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  // Establecer fecha por defecto (dia actual)
  const hoy = new Date();
  document.getElementById('fechaDesde').value = formatDateForInput(hoy);
  document.getElementById('fechaHasta').value = formatDateForInput(hoy);

  // Cargar datos para filtros
  await cargarDatosFiltros();

  setupEventListeners();
  cargarReporte();
});

async function cargarDatosFiltros() {
  const filtroCodigo = document.getElementById('filtroCodigo');
  const filtroFamilia = document.getElementById('filtroFamilia');

  try {
    // Cargar productos y familias en paralelo
    const [productosRes, familiasRes] = await Promise.all([
      authenticatedFetch(`${API_URL}/products`),
      authenticatedFetch(`${API_URL}/families`)
    ]);

    const productosData = await productosRes.json();
    const familiasData = await familiasRes.json();

    if (productosData.success) {
      productosCache = productosData.products;
      productosCache.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (familiasData.success) {
      familiasCache = familiasData.families;
      familiasCache.sort((a, b) => a.nombre.localeCompare(b.nombre));

      // Poblar select de familias
      familiasCache.forEach(familia => {
        const option = document.createElement('option');
        option.value = familia._id;
        option.textContent = familia.nombre;
        filtroFamilia.appendChild(option);
      });
    }

    // Habilitar filtros
    filtroCodigo.disabled = false;
    filtroCodigo.placeholder = 'Codigo o nombre...';
    filtroFamilia.disabled = false;

  } catch (error) {
    console.error('Error al cargar datos de filtros:', error);
    filtroCodigo.placeholder = 'Error al cargar';
  }
}

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

function setupEventListeners() {
  document.getElementById('btnFiltrar').addEventListener('click', cargarReporte);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarFiltros);

  // Busqueda predictiva de codigo
  const filtroCodigo = document.getElementById('filtroCodigo');
  const codigoResults = document.getElementById('codigoResults');

  filtroCodigo.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      codigoResults.classList.remove('active');
      return;
    }

    searchTimeout = setTimeout(() => {
      buscarProductos(query);
    }, 200);
  });

  // Cerrar resultados al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#filtroCodigo') && !e.target.closest('#codigoResults')) {
      codigoResults.classList.remove('active');
    }
  });
}

function buscarProductos(query) {
  const codigoResults = document.getElementById('codigoResults');
  const queryLower = query.toLowerCase();

  const resultados = productosCache.filter(p =>
    p.codigoInterno.toLowerCase().includes(queryLower) ||
    p.name.toLowerCase().includes(queryLower) ||
    (p.barcode && p.barcode.toLowerCase().includes(queryLower))
  ).slice(0, 10);

  if (resultados.length === 0) {
    codigoResults.innerHTML = '<div class="search-no-results">No se encontraron productos</div>';
  } else {
    codigoResults.innerHTML = resultados.map(p => `
      <div class="search-result-item" data-id="${p._id}" data-codigo="${escapeHtml(p.codigoInterno)}" data-nombre="${escapeHtml(p.name)}">
        <div class="search-result-codigo">${escapeHtml(p.codigoInterno)}</div>
        <div class="search-result-nombre">${escapeHtml(p.name)}</div>
      </div>
    `).join('');

    codigoResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        seleccionarProducto(item.dataset.id, item.dataset.codigo, item.dataset.nombre);
      });
    });
  }

  codigoResults.classList.add('active');
}

function seleccionarProducto(id, codigo, nombre) {
  productoSeleccionadoId = id;

  const filtroCodigo = document.getElementById('filtroCodigo');
  const codigoResults = document.getElementById('codigoResults');

  // Reemplazar input con chip de seleccion
  const container = filtroCodigo.parentElement;
  filtroCodigo.style.display = 'none';
  codigoResults.classList.remove('active');

  // Crear chip
  const chip = document.createElement('div');
  chip.className = 'producto-seleccionado';
  chip.id = 'productoChip';
  chip.innerHTML = `
    <span class="nombre">${codigo} - ${nombre}</span>
    <button type="button" class="btn-quitar" title="Quitar filtro">&times;</button>
  `;

  chip.querySelector('.btn-quitar').addEventListener('click', () => {
    quitarProductoSeleccionado();
  });

  container.appendChild(chip);
}

function quitarProductoSeleccionado() {
  productoSeleccionadoId = null;

  const filtroCodigo = document.getElementById('filtroCodigo');
  const chip = document.getElementById('productoChip');

  if (chip) {
    chip.remove();
  }

  filtroCodigo.style.display = '';
  filtroCodigo.value = '';
}

function limpiarFiltros() {
  const hoy = new Date();

  document.getElementById('fechaDesde').value = formatDateForInput(hoy);
  document.getElementById('fechaHasta').value = formatDateForInput(hoy);
  document.getElementById('filtroFamilia').value = '';

  quitarProductoSeleccionado();

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
  const familiaId = document.getElementById('filtroFamilia').value;

  try {
    // Construir query params
    const params = new URLSearchParams();
    params.append('tipo', 'EGRESO');
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    params.append('limit', '1000');

    const response = await authenticatedFetch(`${API_URL}/stock-movements?${params.toString()}`);
    const data = await response.json();

    loadingState.style.display = 'none';

    if (data.success && data.movements.length > 0) {
      // Filtrar solo los que tienen ganancia calculada
      let movimientosConGanancia = data.movements.filter(m =>
        m.gananciaTotal !== null && m.gananciaTotal !== undefined
      );

      // Filtrar por producto si esta seleccionado
      if (productoSeleccionadoId) {
        movimientosConGanancia = movimientosConGanancia.filter(m =>
          m.producto?._id === productoSeleccionadoId
        );
      }

      // Filtrar por familia si esta seleccionada
      if (familiaId) {
        movimientosConGanancia = movimientosConGanancia.filter(m =>
          m.producto?.familia === familiaId || m.producto?.familia?._id === familiaId
        );
      }

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

  // Mostrar estadisticas generales
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
  productos.sort((a, b) => b.gananciaTotal - a.gananciaTotal);

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
