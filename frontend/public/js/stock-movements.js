// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  // Establecer fechas por defecto (hoy)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filtroFechaDesde').value = today;
  document.getElementById('filtroFechaHasta').value = today;

  loadMovements();
  setupFilters();
  setupLimpiarFiltros();
  setupExportButtons();
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
        calculateAndDisplayTotals(data.movements);
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

// Calcular y mostrar totales
function calculateAndDisplayTotals(movements) {
  let totalEntradas = 0;
  let totalSalidas = 0;

  movements.forEach(movement => {
    if (movement.tipo === 'INGRESO') {
      totalEntradas += movement.cantidad;
    } else if (movement.tipo === 'EGRESO') {
      totalSalidas += movement.cantidad;
    }
  });

  const balance = totalEntradas - totalSalidas;

  document.getElementById('totalEntradas').textContent = totalEntradas;
  document.getElementById('totalSalidas').textContent = totalSalidas;
  document.getElementById('balance').textContent = balance;

  // Aplicar clase de color al balance
  const balanceEl = document.getElementById('balance');
  balanceEl.className = '';
  if (balance > 0) {
    balanceEl.classList.add('text-success');
  } else if (balance < 0) {
    balanceEl.classList.add('text-danger');
  }
}

// Configurar botones de exportación
function setupExportButtons() {
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportExcel = document.getElementById('btnExportExcel');

  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', exportToCSV);
  }

  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', exportToExcel);
  }
}

// Obtener movimientos actuales desde la tabla
function getCurrentMovements() {
  const tbody = document.getElementById('movementsTableBody');
  const rows = tbody.querySelectorAll('tr');
  const movements = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 8) {
      movements.push({
        codigoInterno: cells[0].textContent.trim(),
        nombreProducto: cells[1].textContent.trim(),
        cantidad: cells[2].textContent.trim(),
        precio: cells[3].textContent.trim(),
        comprobante: cells[4].textContent.trim(),
        tipo: cells[5].textContent.trim(),
        fecha: cells[6].textContent.trim(),
        usuario: cells[7].textContent.trim()
      });
    }
  });

  return movements;
}

// Exportar a CSV
function exportToCSV() {
  const movements = getCurrentMovements();

  if (movements.length === 0) {
    alert('No hay movimientos para exportar');
    return;
  }

  // Crear CSV
  const headers = ['Código Interno', 'Nombre Producto', 'Cantidad', 'Precio', 'Comprobante', 'Tipo', 'Fecha', 'Usuario'];
  let csv = headers.join(',') + '\n';

  movements.forEach(mov => {
    const row = [
      `"${mov.codigoInterno}"`,
      `"${mov.nombreProducto}"`,
      mov.cantidad,
      `"${mov.precio}"`,
      `"${mov.comprobante}"`,
      mov.tipo,
      `"${mov.fecha}"`,
      `"${mov.usuario}"`
    ];
    csv += row.join(',') + '\n';
  });

  // Agregar totales
  const totalEntradas = document.getElementById('totalEntradas').textContent;
  const totalSalidas = document.getElementById('totalSalidas').textContent;
  const balance = document.getElementById('balance').textContent;

  csv += '\n';
  csv += `"Total Entradas","${totalEntradas}"\n`;
  csv += `"Total Salidas","${totalSalidas}"\n`;
  csv += `"Balance","${balance}"\n`;

  // Descargar archivo
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const fecha = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `movimientos_${fecha}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Exportar a Excel (formato HTML que Excel puede abrir)
function exportToExcel() {
  const movements = getCurrentMovements();

  if (movements.length === 0) {
    alert('No hay movimientos para exportar');
    return;
  }

  // Crear tabla HTML para Excel
  let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
  html += '<head>';
  html += '<meta charset="UTF-8">';
  html += '<style>table { border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }</style>';
  html += '</head>';
  html += '<body>';
  html += '<table>';

  // Encabezados
  html += '<thead><tr>';
  html += '<th>Código Interno</th>';
  html += '<th>Nombre Producto</th>';
  html += '<th>Cantidad</th>';
  html += '<th>Precio</th>';
  html += '<th>Comprobante</th>';
  html += '<th>Tipo</th>';
  html += '<th>Fecha</th>';
  html += '<th>Usuario</th>';
  html += '</tr></thead>';

  // Datos
  html += '<tbody>';
  movements.forEach(mov => {
    html += '<tr>';
    html += `<td>${mov.codigoInterno}</td>`;
    html += `<td>${mov.nombreProducto}</td>`;
    html += `<td>${mov.cantidad}</td>`;
    html += `<td>${mov.precio}</td>`;
    html += `<td>${mov.comprobante}</td>`;
    html += `<td>${mov.tipo}</td>`;
    html += `<td>${mov.fecha}</td>`;
    html += `<td>${mov.usuario}</td>`;
    html += '</tr>';
  });
  html += '</tbody>';

  // Totales
  const totalEntradas = document.getElementById('totalEntradas').textContent;
  const totalSalidas = document.getElementById('totalSalidas').textContent;
  const balance = document.getElementById('balance').textContent;

  html += '<tfoot>';
  html += '<tr><td colspan="8"></td></tr>';
  html += `<tr><td colspan="2"><strong>Total Entradas</strong></td><td colspan="6">${totalEntradas}</td></tr>`;
  html += `<tr><td colspan="2"><strong>Total Salidas</strong></td><td colspan="6">${totalSalidas}</td></tr>`;
  html += `<tr><td colspan="2"><strong>Balance</strong></td><td colspan="6">${balance}</td></tr>`;
  html += '</tfoot>';

  html += '</table>';
  html += '</body>';
  html += '</html>';

  // Descargar archivo
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const fecha = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `movimientos_${fecha}.xls`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
