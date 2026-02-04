// Estado del comprobante
let comprobanteState = {
  lineas: [], // { lineaId, productoId, productoData, cantidad, precioCompra }
  nextLineaId: 1
};

// Cache de productos
let allProductsCache = [];

// Índice de línea actual para el modal de búsqueda
let currentSearchLineIndex = null;

// Formatear stock según unidad
function formatStock(stock, unidad) {
  if (unidad === 'kg') {
    return `${Number(stock).toFixed(3)} kg`;
  }
  return stock.toString();
}

// Obtener label de unidad corto
function getUnidadShort(unidad) {
  return unidad === 'kg' ? 'kg' : 'un';
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
  const today = getTodayLocal();
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

// Verificar si estamos en modo ingreso
function esIngreso() {
  return typeof MODO_MOVIMIENTO !== 'undefined' && MODO_MOVIMIENTO === 'INGRESO';
}

// Agregar nueva línea
function agregarLinea() {
  const lineaId = comprobanteState.nextLineaId++;

  comprobanteState.lineas.push({
    lineaId,
    productoId: null,
    productoData: null,
    cantidad: 1,
    precioCompra: 0 // Para ingresos
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

// Formatear precio
function formatPrice(price) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(price);
}

// Calcular y actualizar total general
function actualizarTotalGeneral() {
  const tfoot = document.getElementById('detalleTableFoot');
  const totalEl = document.getElementById('totalGeneral');

  const lineasConProducto = comprobanteState.lineas.filter(l => l.productoId !== null);

  if (lineasConProducto.length === 0) {
    tfoot.style.display = 'none';
    return;
  }

  tfoot.style.display = 'table-footer-group';

  const total = lineasConProducto.reduce((sum, linea) => {
    // Para ingresos, usar precioCompra. Para egresos, usar precio de venta
    const precio = esIngreso()
      ? (linea.precioCompra || 0)
      : (linea.productoData?.price || linea.productoData?.precioVentaBase || 0);
    return sum + (linea.cantidad * precio);
  }, 0);

  totalEl.textContent = formatPrice(total);
}

// Renderizar todas las líneas
function renderLineas() {
  const tbody = document.getElementById('detalleTableBody');
  const table = document.getElementById('detalleTable');
  const emptyMessage = document.getElementById('emptyDetalle');

  if (comprobanteState.lineas.length === 0) {
    table.style.display = 'none';
    emptyMessage.style.display = 'block';
    actualizarTotalGeneral();
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
      const unidadLabel = linea.productoData.unidad === 'kg' ? ' (Kg)' : ' (Unidad)';
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
    cantidadInput.min = '0.001';
    cantidadInput.value = linea.cantidad;

    // Si es producto en kg, permitir decimales
    if (linea.productoData && linea.productoData.unidad === 'kg') {
      cantidadInput.step = '0.001';
      cantidadInput.placeholder = 'kg';
      cantidadInput.title = 'Cantidad en kilogramos (ej: 1.500)';
    } else {
      cantidadInput.step = '1';
      cantidadInput.min = '1';
    }

    cantidadInput.addEventListener('change', (e) => {
      const isKg = linea.productoData && linea.productoData.unidad === 'kg';
      const newCantidad = isKg ? parseFloat(e.target.value) || 0.001 : parseInt(e.target.value) || 1;
      linea.cantidad = isKg ? Math.max(0.001, newCantidad) : Math.max(1, newCantidad);
      e.target.value = isKg ? linea.cantidad.toFixed(3) : linea.cantidad;
      // Actualizar subtotal de esta línea
      const subtotalCell = document.getElementById(`subtotal-${linea.lineaId}`);
      if (subtotalCell && linea.productoData) {
        const precio = esIngreso()
          ? (linea.precioCompra || linea.productoData.precioCompraBase || 0)
          : (linea.productoData.precioVentaBase || linea.productoData.price || 0);
        const subtotal = linea.cantidad * precio;
        subtotalCell.textContent = formatPrice(subtotal);
      }
      actualizarTotalGeneral();
    });

    // ENTER en cantidad agrega nueva línea
    cantidadInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Actualizar cantidad
        const isKg = linea.productoData && linea.productoData.unidad === 'kg';
        const newCantidad = isKg ? parseFloat(cantidadInput.value) || 0.001 : parseInt(cantidadInput.value) || 1;
        linea.cantidad = isKg ? Math.max(0.001, newCantidad) : Math.max(1, newCantidad);
        // Actualizar subtotal
        const subtotalCell = document.getElementById(`subtotal-${linea.lineaId}`);
        if (subtotalCell && linea.productoData) {
          const precio = esIngreso()
            ? (linea.precioCompra || linea.productoData.precioCompraBase || 0)
            : (linea.productoData.precioVentaBase || linea.productoData.price || 0);
          const subtotal = linea.cantidad * precio;
          subtotalCell.textContent = formatPrice(subtotal);
        }
        actualizarTotalGeneral();
        // Agregar nueva línea
        agregarLinea();
      }
    });

    cantidadCell.appendChild(cantidadInput);

    // Columna de precio (compra para ingresos, venta para egresos)
    const precioCell = document.createElement('td');
    precioCell.style.textAlign = 'right';

    if (esIngreso()) {
      // Para ingresos: input editable de precio de compra
      const precioInput = document.createElement('input');
      precioInput.type = 'number';
      precioInput.className = 'cantidad-input';
      precioInput.style.textAlign = 'right';
      precioInput.min = '0';
      precioInput.step = '0.01';
      precioInput.value = linea.precioCompra || (linea.productoData?.precioCompraBase || 0);
      precioInput.placeholder = '0.00';
      precioInput.id = `precioCompra-${linea.lineaId}`;

      precioInput.addEventListener('change', (e) => {
        const newPrecio = parseFloat(e.target.value) || 0;
        linea.precioCompra = Math.max(0, newPrecio);
        e.target.value = linea.precioCompra.toFixed(2);
        // Actualizar subtotal
        const subtotalCell = document.getElementById(`subtotal-${linea.lineaId}`);
        if (subtotalCell) {
          const subtotal = linea.cantidad * linea.precioCompra;
          subtotalCell.textContent = formatPrice(subtotal);
        }
        actualizarTotalGeneral();
      });

      precioCell.appendChild(precioInput);
    } else {
      // Para egresos: mostrar precio de venta
      if (linea.productoData) {
        precioCell.textContent = formatPrice(linea.productoData.precioVentaBase || linea.productoData.price || 0);
      } else {
        precioCell.textContent = '-';
        precioCell.style.color = '#999';
      }
    }

    // Columna de subtotal
    const subtotalCell = document.createElement('td');
    subtotalCell.style.textAlign = 'right';
    subtotalCell.id = `subtotal-${linea.lineaId}`;
    if (linea.productoData) {
      const precio = esIngreso()
        ? (linea.precioCompra || linea.productoData.precioCompraBase || 0)
        : (linea.productoData.precioVentaBase || linea.productoData.price || 0);
      const subtotal = linea.cantidad * precio;
      subtotalCell.textContent = formatPrice(subtotal);
      subtotalCell.style.fontWeight = 'bold';
    } else {
      subtotalCell.textContent = '-';
      subtotalCell.style.color = '#999';
    }

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
    row.appendChild(precioCell);
    row.appendChild(subtotalCell);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  actualizarTotalGeneral();
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
        // Para ingresos, establecer precio de compra base del producto
        if (esIngreso()) {
          linea.precioCompra = data.product.precioCompraBase || 0;
        }
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
    // Para ingresos, establecer precio de compra base del producto
    if (esIngreso()) {
      linea.precioCompra = product.precioCompraBase || 0;
    }
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

  const confirmed = await showConfirm(
    '¿Confirmar comprobante?',
    `Se registrará un ${tipo} con ${lineasValidas.length} producto(s).`,
    'Sí, guardar',
    'Cancelar'
  );
  if (!confirmed) return;

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
        cantidad: l.cantidad,
        // Solo enviar precioCompra para ingresos
        precioCompra: esIngreso() ? (l.precioCompra || l.productoData?.precioCompraBase || 0) : undefined
      }))
    };

    // Enviar al backend
    const response = await authenticatedFetch(`${API_URL}/stock-movements`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      const cargarOtro = await showConfirm(
        '¡Comprobante guardado!',
        `${data.comprobante} registrado con ${data.movements.length} producto(s).`,
        'Cargar otro',
        'Ver movimientos'
      );

      if (cargarOtro) {
        resetForm();
      } else {
        window.location.href = 'stock-movements.html';
      }
    } else {
      if (data.errors && data.errors.length > 0) {
        showError('errorMessage', data.message + ':\n' + data.errors.join('\n'));
      } else {
        showError('errorMessage', data.message || 'Error al guardar el comprobante');
      }
      btnGuardar.disabled = false;
      btnGuardar.textContent = getButtonText();
    }
  } catch (error) {
    console.error('Error al guardar comprobante:', error);
    showError('errorMessage', 'Error de conexión con el servidor');
    btnGuardar.disabled = false;
    btnGuardar.textContent = getButtonText();
  }
}

// Obtener texto del botón según el modo
function getButtonText() {
  if (typeof MODO_MOVIMIENTO !== 'undefined') {
    if (MODO_MOVIMIENTO === 'INGRESO') {
      return '📥 Guardar Ingreso';
    } else if (MODO_MOVIMIENTO === 'EGRESO') {
      return '📤 Guardar Egreso';
    }
  }
  return '💾 Guardar Comprobante';
}

// Cancelar comprobante
async function cancelarComprobante() {
  if (comprobanteState.lineas.some(l => l.productoId !== null)) {
    const confirmed = await showConfirm(
      '¿Cancelar comprobante?',
      'Se perderán todos los datos ingresados.',
      'Sí, cancelar',
      'Volver'
    );
    if (!confirmed) return;
  }

  resetForm();
}

// Resetear formulario
function resetForm() {
  document.getElementById('tipoMovimiento').value = '';
  document.getElementById('observaciones').value = '';

  const today = getTodayLocal();
  document.getElementById('fechaMovimiento').value = today;

  comprobanteState = {
    lineas: [],
    nextLineaId: 1
  };

  hideMessage('errorMessage');
  hideMessage('successMessage');

  agregarLinea();

  // Recargar productos para actualizar stock
  loadAllProducts();

  const btnGuardar = document.getElementById('btnGuardar');
  btnGuardar.disabled = false;
  btnGuardar.textContent = getButtonText();
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
