// Estado del comprobante
let comprobanteState = {
  lineas: [], // { lineaId, productoId, productoData, cantidad }
  nextLineaId: 1
};

// Cache de productos
let allProductsCache = [];

// Índice de línea actual para el modal de búsqueda
let currentSearchLineIndex = null;

// Formatear stock según unidad
function formatStock(stock, unidad) {
  if (unidad === 'gramos') {
    if (stock >= 1000) {
      return `${(stock / 1000).toFixed(3)} kg`;
    }
    return `${stock} gr`;
  }
  return stock.toString();
}

// Obtener label de unidad corto
function getUnidadShort(unidad) {
  return unidad === 'gramos' ? 'gr' : 'un';
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  initializeForm();
  setupEventListeners();
  loadAllProducts();

  // Atajo de teclado F2 para búsqueda por nombre
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      // Si hay un input de producto enfocado, abrir modal para esa línea
      const focusedInput = document.activeElement;
      if (focusedInput && focusedInput.classList.contains('product-search-input')) {
        const lineaId = parseInt(focusedInput.dataset.lineaId);
        openSearchModal(lineaId);
      }
    }
  });
});

// Inicializar formulario
function initializeForm() {
  // Establecer fecha de hoy por defecto
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fechaMovimiento').value = today;

  // Agregar primera línea automáticamente
  agregarLinea();
}

// Configurar event listeners
function setupEventListeners() {
  document.getElementById('btnAgregarLinea').addEventListener('click', agregarLinea);
  document.getElementById('btnGuardar').addEventListener('click', guardarComprobante);
  document.getElementById('btnCancelar').addEventListener('click', cancelarComprobante);

  // Modal de búsqueda
  document.getElementById('searchModalInput').addEventListener('input', handleModalSearch);

  // Cerrar modal con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearchModal();
    }
  });

  // Cerrar modal al hacer click fuera
  document.getElementById('searchModal').addEventListener('click', (e) => {
    if (e.target.id === 'searchModal') {
      closeSearchModal();
    }
  });
}

// Cargar todos los productos
async function loadAllProducts() {
  try {
    const response = await authenticatedFetch(`${API_URL}/products`);
    const data = await response.json();

    if (data.success) {
      allProductsCache = data.products;
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

// Agregar nueva línea
function agregarLinea() {
  const lineaId = comprobanteState.nextLineaId++;

  comprobanteState.lineas.push({
    lineaId,
    productoId: null,
    productoData: null,
    cantidad: 1
  });

  renderLineas();

  // Focus en el input de la nueva línea
  setTimeout(() => {
    const newInput = document.querySelector(`input[data-linea-id="${lineaId}"]`);
    if (newInput) {
      newInput.focus();
    }
  }, 50);
}

// Renderizar todas las líneas
function renderLineas() {
  const tbody = document.getElementById('detalleTableBody');
  const table = document.getElementById('detalleTable');
  const emptyMessage = document.getElementById('emptyDetalle');

  if (comprobanteState.lineas.length === 0) {
    table.style.display = 'none';
    emptyMessage.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyMessage.style.display = 'none';

  tbody.innerHTML = '';

  comprobanteState.lineas.forEach((linea, index) => {
    const row = document.createElement('tr');
    row.className = 'detalle-row';

    // Columna de producto
    const productCell = document.createElement('td');
    const productSearchDiv = document.createElement('div');
    productSearchDiv.className = 'product-search-cell';

    const productInput = document.createElement('input');
    productInput.type = 'text';
    productInput.className = 'product-search-input';
    productInput.placeholder = 'Código o barras (ENTER) o 🔍 (F2)';
    productInput.dataset.lineaId = linea.lineaId;
    productInput.autocomplete = 'off';

    if (linea.productoData) {
      productInput.value = linea.productoData.codigoInterno;
      productInput.disabled = true;
    }

    // Evento ENTER para buscar por código
    productInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = productInput.value.trim();
        if (code) {
          await buscarProductoPorCodigo(linea.lineaId, code);
        }
      }
    });

    const searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.className = 'btn-search-icon';
    searchBtn.innerHTML = '🔍';
    searchBtn.title = 'Buscar por nombre (F2)';
    searchBtn.onclick = () => openSearchModal(linea.lineaId);

    productSearchDiv.appendChild(productInput);
    productSearchDiv.appendChild(searchBtn);

    // Mostrar nombre del producto si está seleccionado
    if (linea.productoData) {
      const productNameDiv = document.createElement('div');
      productNameDiv.className = 'product-name-display';
      const unidadLabel = linea.productoData.unidad === 'gramos' ? ' (Gramos)' : ' (Unidad)';
      const stockLabel = formatStock(linea.productoData.stock || 0, linea.productoData.unidad);
      productNameDiv.textContent = `${linea.productoData.name}${unidadLabel} - Stock: ${stockLabel}`;
      productSearchDiv.appendChild(productNameDiv);
    }

    productCell.appendChild(productSearchDiv);

    // Columna de cantidad
    const cantidadCell = document.createElement('td');
    cantidadCell.style.textAlign = 'center';

    const cantidadInput = document.createElement('input');
    cantidadInput.type = 'number';
    cantidadInput.className = 'cantidad-input';
    cantidadInput.min = '1';
    cantidadInput.value = linea.cantidad;

    // Si es producto en gramos, mostrar placeholder
    if (linea.productoData && linea.productoData.unidad === 'gramos') {
      cantidadInput.placeholder = 'gr';
      cantidadInput.title = 'Cantidad en gramos';
    }

    cantidadInput.addEventListener('change', (e) => {
      const newCantidad = parseInt(e.target.value) || 1;
      linea.cantidad = Math.max(1, newCantidad);
      e.target.value = linea.cantidad;
    });

    cantidadCell.appendChild(cantidadInput);

    // Columna de acciones
    const actionsCell = document.createElement('td');
    actionsCell.style.textAlign = 'center';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-line';
    removeBtn.textContent = '❌ Quitar';
    removeBtn.onclick = () => eliminarLinea(linea.lineaId);

    actionsCell.appendChild(removeBtn);

    row.appendChild(productCell);
    row.appendChild(cantidadCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });
}

// Eliminar línea
function eliminarLinea(lineaId) {
  comprobanteState.lineas = comprobanteState.lineas.filter(l => l.lineaId !== lineaId);
  renderLineas();

  // Si no quedan líneas, agregar una nueva
  if (comprobanteState.lineas.length === 0) {
    agregarLinea();
  }
}

// Buscar producto por código o barras
async function buscarProductoPorCodigo(lineaId, code) {
  try {
    const response = await authenticatedFetch(`${API_URL}/products/search?code=${encodeURIComponent(code)}`);
    const data = await response.json();

    if (data.success && data.product) {
      // Verificar si el producto ya está en otra línea
      const yaExiste = comprobanteState.lineas.some(l =>
        l.lineaId !== lineaId && l.productoId === data.product._id
      );

      if (yaExiste) {
        showError('errorMessage', 'Este producto ya está agregado en otra línea');
        return;
      }

      // Obtener stock actual
      const productWithStock = allProductsCache.find(p => p._id === data.product._id);
      const stockActual = productWithStock ? productWithStock.stock : 0;

      // Actualizar línea
      const linea = comprobanteState.lineas.find(l => l.lineaId === lineaId);
      if (linea) {
        linea.productoId = data.product._id;
        linea.productoData = {
          ...data.product,
          stock: stockActual
        };
        renderLineas();
        hideMessage('errorMessage');

        // Focus en el campo de cantidad
        setTimeout(() => {
          const cantidadInputs = document.querySelectorAll('.cantidad-input');
          const index = comprobanteState.lineas.findIndex(l => l.lineaId === lineaId);
          if (cantidadInputs[index]) {
            cantidadInputs[index].select();
          }
        }, 50);
      }
    } else {
      showError('errorMessage', 'Producto no encontrado con ese código');
    }
  } catch (error) {
    console.error('Error al buscar producto:', error);
    showError('errorMessage', 'Error de conexión al buscar producto');
  }
}

// Abrir modal de búsqueda por nombre
function openSearchModal(lineaId) {
  currentSearchLineIndex = lineaId;

  const modal = document.getElementById('searchModal');
  const input = document.getElementById('searchModalInput');
  const resultsContainer = document.getElementById('searchResultsContainer');

  modal.classList.add('active');
  input.value = '';
  resultsContainer.innerHTML = '<div class="search-no-results">Escriba para buscar productos...</div>';

  setTimeout(() => {
    input.focus();
  }, 100);
}

// Cerrar modal de búsqueda
function closeSearchModal() {
  const modal = document.getElementById('searchModal');
  modal.classList.remove('active');
  currentSearchLineIndex = null;
}

// Manejar búsqueda en modal
let searchTimeout;
function handleModalSearch(e) {
  clearTimeout(searchTimeout);

  const query = e.target.value.trim();
  const resultsContainer = document.getElementById('searchResultsContainer');

  if (query.length < 2) {
    resultsContainer.innerHTML = '<div class="search-no-results">Escriba al menos 2 caracteres...</div>';
    return;
  }

  searchTimeout = setTimeout(() => {
    const queryLower = query.toLowerCase();
    const results = allProductsCache.filter(product => {
      return product.name.toLowerCase().includes(queryLower) ||
             product.codigoInterno.toLowerCase().includes(queryLower) ||
             (product.barcode && product.barcode.toLowerCase().includes(queryLower));
    }).slice(0, 20);

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-no-results">No se encontraron productos</div>';
      return;
    }

    resultsContainer.innerHTML = '';
    results.forEach(product => {
      const item = document.createElement('div');
      item.className = 'search-result-item';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'search-result-name';
      nameDiv.textContent = product.name;

      const codeDiv = document.createElement('div');
      codeDiv.className = 'search-result-code';
      codeDiv.textContent = `${product.codigoInterno}${product.barcode ? ' | ' + product.barcode : ''}`;

      item.appendChild(nameDiv);
      item.appendChild(codeDiv);

      item.onclick = () => selectProductFromModal(product);

      resultsContainer.appendChild(item);
    });
  }, 300);
}

// Seleccionar producto del modal
function selectProductFromModal(product) {
  if (currentSearchLineIndex === null) return;

  // Verificar si el producto ya está en otra línea
  const yaExiste = comprobanteState.lineas.some(l =>
    l.lineaId !== currentSearchLineIndex && l.productoId === product._id
  );

  if (yaExiste) {
    showError('errorMessage', 'Este producto ya está agregado en otra línea');
    closeSearchModal();
    return;
  }

  // Actualizar línea
  const linea = comprobanteState.lineas.find(l => l.lineaId === currentSearchLineIndex);
  if (linea) {
    linea.productoId = product._id;
    linea.productoData = product;
    renderLineas();
    hideMessage('errorMessage');
  }

  closeSearchModal();

  // Focus en el campo de cantidad
  setTimeout(() => {
    const cantidadInputs = document.querySelectorAll('.cantidad-input');
    const index = comprobanteState.lineas.findIndex(l => l.lineaId === currentSearchLineIndex);
    if (cantidadInputs[index]) {
      cantidadInputs[index].select();
    }
  }, 50);
}

// Mapear tipo de movimiento a tipo de backend
function mapTipoMovimiento(tipoFrontend) {
  const mapping = {
    'INGRESO': 'INGRESO',
    'EGRESO': 'EGRESO',
    'AJUSTE_POSITIVO': 'INGRESO',
    'AJUSTE_NEGATIVO': 'EGRESO'
  };
  return mapping[tipoFrontend] || 'INGRESO';
}

// Guardar comprobante
async function guardarComprobante() {
  hideMessage('errorMessage');
  hideMessage('successMessage');

  // Validaciones
  const tipo = document.getElementById('tipoMovimiento').value;
  const fecha = document.getElementById('fechaMovimiento').value;
  const observaciones = document.getElementById('observaciones').value.trim();

  if (!tipo) {
    showError('errorMessage', 'Debe seleccionar un tipo de movimiento');
    return;
  }

  if (!fecha) {
    showError('errorMessage', 'Debe seleccionar una fecha');
    return;
  }

  // Validar que haya al menos una línea con producto
  const lineasValidas = comprobanteState.lineas.filter(l => l.productoId !== null);

  if (lineasValidas.length === 0) {
    showError('errorMessage', 'Debe agregar al menos un producto al comprobante');
    return;
  }

  // Validar cantidades
  const cantidadInvalida = lineasValidas.find(l => !l.cantidad || l.cantidad <= 0);
  if (cantidadInvalida) {
    showError('errorMessage', 'Todas las cantidades deben ser mayores a 0');
    return;
  }

  // Validar stock para egresos y ajustes negativos
  const tipoBackend = mapTipoMovimiento(tipo);
  if (tipoBackend === 'EGRESO') {
    for (const linea of lineasValidas) {
      const stockActual = linea.productoData.stock || 0;
      if (linea.cantidad > stockActual) {
        const stockFormatted = formatStock(stockActual, linea.productoData.unidad);
        const cantidadFormatted = formatStock(linea.cantidad, linea.productoData.unidad);
        showError('errorMessage', `Stock insuficiente para "${linea.productoData.name}". Disponible: ${stockFormatted}, solicitado: ${cantidadFormatted}`);
        return;
      }
    }
  }

  if (!confirm(`¿Confirmar comprobante de ${tipo} con ${lineasValidas.length} producto(s)?`)) {
    return;
  }

  const btnGuardar = document.getElementById('btnGuardar');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    // Obtener próximo comprobante
    const comprobanteResponse = await authenticatedFetch(`${API_URL}/stock-movements/next-comprobante`);
    const comprobanteData = await comprobanteResponse.json();

    if (!comprobanteData.success) {
      throw new Error('Error al generar comprobante');
    }

    // Preparar payload
    const payload = {
      comprobante: comprobanteData.comprobante,
      tipo: tipoBackend,
      tipoOriginal: tipo, // Guardar el tipo original (AJUSTE_POSITIVO, etc.)
      observacion: observaciones || `${tipo} - ${fecha}`,
      productos: lineasValidas.map(l => ({
        productoId: l.productoId,
        cantidad: l.cantidad
      }))
    };

    // Enviar al backend
    const response = await authenticatedFetch(`${API_URL}/stock-movements`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('successMessage', `✓ Comprobante ${data.comprobante} guardado exitosamente con ${data.movements.length} producto(s)`);

      setTimeout(() => {
        if (confirm('¿Desea cargar otro comprobante?')) {
          resetForm();
        } else {
          window.location.href = 'stock-movements.html';
        }
      }, 2000);
    } else {
      if (data.errors && data.errors.length > 0) {
        showError('errorMessage', data.message + ':\n' + data.errors.join('\n'));
      } else {
        showError('errorMessage', data.message || 'Error al guardar el comprobante');
      }
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar Comprobante';
    }
  } catch (error) {
    console.error('Error al guardar comprobante:', error);
    showError('errorMessage', 'Error de conexión con el servidor');
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar Comprobante';
  }
}

// Cancelar comprobante
function cancelarComprobante() {
  if (comprobanteState.lineas.some(l => l.productoId !== null)) {
    if (!confirm('¿Está seguro de cancelar? Se perderán todos los datos ingresados.')) {
      return;
    }
  }

  resetForm();
}

// Resetear formulario
function resetForm() {
  document.getElementById('tipoMovimiento').value = '';
  document.getElementById('observaciones').value = '';

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fechaMovimiento').value = today;

  comprobanteState = {
    lineas: [],
    nextLineaId: 1
  };

  hideMessage('errorMessage');
  hideMessage('successMessage');

  agregarLinea();

  document.getElementById('btnGuardar').disabled = false;
  document.getElementById('btnGuardar').textContent = '💾 Guardar Comprobante';
}

// Funciones de UI
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideMessage(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'none';
  }
}
