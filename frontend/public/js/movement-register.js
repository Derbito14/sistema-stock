// Estado del formulario
let currentState = {
  step: 1,
  tipo: null,
  comprobante: null,
  observacion: '',
  productos: [], // { productoId, productoData, cantidad }
  productoBuscado: null
};

// Cache de todos los productos para búsqueda por nombre
let allProductsCache = [];

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  setupStep1();
});

// ===== PASO 1: Tipo y Comprobante =====

function setupStep1() {
  const tipoSelect = document.getElementById('tipo');
  const btnGenerar = document.getElementById('btnGenerarComprobante');

  tipoSelect.addEventListener('change', () => {
    btnGenerar.disabled = !tipoSelect.value;
  });

  btnGenerar.addEventListener('click', async () => {
    await generarComprobanteYContinuar();
  });
}

async function generarComprobanteYContinuar() {
  const tipoSelect = document.getElementById('tipo');
  const observacionInput = document.getElementById('observacion');

  currentState.tipo = tipoSelect.value;
  currentState.observacion = observacionInput.value.trim();

  if (!currentState.tipo) {
    alert('Selecciona un tipo de movimiento');
    return;
  }

  try {
    // Obtener el próximo comprobante
    const response = await authenticatedFetch(`${API_URL}/stock-movements/next-comprobante`);
    const data = await response.json();

    if (data.success) {
      currentState.comprobante = data.comprobante;
      document.getElementById('comprobanteDisplay').textContent = data.comprobante;

      // Pasar al paso 2
      irAPaso2();
    } else {
      alert('Error al generar comprobante: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión al generar comprobante');
  }
}

function irAPaso2() {
  currentState.step = 2;

  // Ocultar paso 1, mostrar paso 2
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';

  // Mostrar info del comprobante
  document.getElementById('comprobanteActual').textContent = currentState.comprobante;

  const tipoBadge = document.getElementById('tipoActual');
  tipoBadge.textContent = currentState.tipo;
  tipoBadge.className = `badge tipo-${currentState.tipo.toLowerCase()}`;

  // Setup paso 2
  setupStep2();

  // Foco en código de producto
  document.getElementById('productCode').focus();
}

// ===== PASO 2: Agregar Productos =====

function setupStep2() {
  const productCodeInput = document.getElementById('productCode');
  const productNameInput = document.getElementById('productName');
  const cantidadInput = document.getElementById('cantidad');
  const btnAgregar = document.getElementById('btnAgregarProducto');
  const btnConfirmar = document.getElementById('btnConfirmarMovimiento');
  const btnCancelar = document.getElementById('btnCancelar');

  // Cargar todos los productos para búsqueda por nombre
  cargarTodosLosProductos();

  // Buscar producto con Enter
  productCodeInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = productCodeInput.value.trim();
      if (code) {
        await buscarProducto(code);
      }
    }
  });

  // Búsqueda por nombre con dropdown
  let searchTimeout;
  productNameInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      ocultarDropdown();
      return;
    }

    searchTimeout = setTimeout(() => {
      buscarProductoPorNombre(query);
    }, 300); // Debounce de 300ms
  });

  // Ocultar dropdown al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-dropdown') && !e.target.closest('#productName')) {
      ocultarDropdown();
    }
  });

  // Limpiar código cuando se escribe en nombre y viceversa
  productCodeInput.addEventListener('input', () => {
    if (productCodeInput.value) {
      productNameInput.value = '';
      ocultarDropdown();
    }
  });

  productNameInput.addEventListener('input', () => {
    if (productNameInput.value) {
      productCodeInput.value = '';
    }
  });

  // Botón agregar
  btnAgregar.addEventListener('click', () => {
    agregarProductoALista();
  });

  // Botón confirmar
  btnConfirmar.addEventListener('click', async () => {
    await confirmarMovimiento();
  });

  // Botón cancelar
  btnCancelar.addEventListener('click', () => {
    if (confirm('¿Estás seguro de cancelar? Se perderán todos los productos agregados.')) {
      resetearFormulario();
    }
  });
}

// Cargar todos los productos para búsqueda por nombre
async function cargarTodosLosProductos() {
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

// Buscar productos por nombre y mostrar dropdown
function buscarProductoPorNombre(query) {
  const searchResults = document.getElementById('searchResults');
  const dropdown = document.getElementById('searchDropdown');

  // Filtrar productos por nombre (case insensitive)
  const queryLower = query.toLowerCase();
  const results = allProductsCache.filter(product =>
    product.name.toLowerCase().includes(queryLower) ||
    product.codigoInterno.toLowerCase().includes(queryLower)
  ).slice(0, 10); // Limitar a 10 resultados

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-dropdown-empty">No se encontraron productos</div>';
    dropdown.style.display = 'block';
    return;
  }

  // Renderizar resultados
  searchResults.innerHTML = results.map(product => `
    <div class="search-dropdown-item" onclick="seleccionarProductoDesdeDropdown('${product._id}')">
      <strong>${escapeHtml(product.name)}</strong>
      <small>
        ${escapeHtml(product.codigoInterno)}
        ${product.barcode ? ` | ${escapeHtml(product.barcode)}` : ''}
        <span class="product-stock">Stock: ${product.stock || 0}</span>
      </small>
    </div>
  `).join('');

  dropdown.style.display = 'block';
}

// Seleccionar un producto desde el dropdown
async function seleccionarProductoDesdeDropdown(productId) {
  const product = allProductsCache.find(p => p._id === productId);

  if (!product) {
    return;
  }

  // Verificar si ya está en la lista
  const yaAgregado = currentState.productos.find(p => p.productoId === product._id);
  if (yaAgregado) {
    showError('errorAgregarProducto', 'Este producto ya está en la lista');
    ocultarDropdown();
    return;
  }

  currentState.productoBuscado = product;

  // Mostrar info del producto
  document.getElementById('foundProductName').textContent = product.name;
  document.getElementById('foundProductStock').textContent = product.stock || 0;
  document.getElementById('productFoundInfo').style.display = 'flex';

  // Habilitar botón agregar
  document.getElementById('btnAgregarProducto').disabled = false;

  // Limpiar búsqueda y ocultar dropdown
  document.getElementById('productName').value = '';
  ocultarDropdown();

  // Focus en cantidad
  document.getElementById('cantidad').select();
  hideMessage('errorAgregarProducto');
}

// Ocultar dropdown
function ocultarDropdown() {
  document.getElementById('searchDropdown').style.display = 'none';
}

async function buscarProducto(code) {
  try {
    hideMessage('errorAgregarProducto');

    const response = await authenticatedFetch(`${API_URL}/products/search?code=${encodeURIComponent(code)}`);
    const data = await response.json();

    if (data.success) {
      // Verificar si ya está en la lista
      const yaAgregado = currentState.productos.find(p => p.productoId === data.product._id);
      if (yaAgregado) {
        showError('errorAgregarProducto', 'Este producto ya está en la lista');
        return;
      }

      // Obtener stock actual
      const stockResponse = await authenticatedFetch(`${API_URL}/products`);
      const stockData = await stockResponse.json();
      const productWithStock = stockData.products.find(p => p._id === data.product._id);

      currentState.productoBuscado = {
        ...data.product,
        stock: productWithStock?.stock || 0
      };

      // Mostrar info del producto
      document.getElementById('foundProductName').textContent = currentState.productoBuscado.name;
      document.getElementById('foundProductStock').textContent = currentState.productoBuscado.stock;
      document.getElementById('productFoundInfo').style.display = 'flex';

      // Habilitar botón agregar
      document.getElementById('btnAgregarProducto').disabled = false;

      // Focus en cantidad
      document.getElementById('cantidad').select();
    } else {
      showError('errorAgregarProducto', data.message || 'Producto no encontrado');
      currentState.productoBuscado = null;
      document.getElementById('productFoundInfo').style.display = 'none';
      document.getElementById('btnAgregarProducto').disabled = true;
    }
  } catch (error) {
    console.error('Error:', error);
    showError('errorAgregarProducto', 'Error de conexión');
  }
}

function agregarProductoALista() {
  if (!currentState.productoBuscado) {
    showError('errorAgregarProducto', 'Primero busca un producto');
    return;
  }

  const cantidad = parseInt(document.getElementById('cantidad').value);

  if (!cantidad || cantidad <= 0) {
    showError('errorAgregarProducto', 'Ingresa una cantidad válida');
    return;
  }

  // Para EGRESO, validar stock
  if (currentState.tipo === 'EGRESO' && cantidad > currentState.productoBuscado.stock) {
    showError('errorAgregarProducto', `Stock insuficiente. Disponible: ${currentState.productoBuscado.stock}`);
    return;
  }

  // Agregar a la lista
  currentState.productos.push({
    productoId: currentState.productoBuscado._id,
    productoData: currentState.productoBuscado,
    cantidad
  });

  // Actualizar UI
  renderProductosAgregados();

  // Limpiar búsqueda
  document.getElementById('productCode').value = '';
  document.getElementById('cantidad').value = '1';
  document.getElementById('productFoundInfo').style.display = 'none';
  document.getElementById('btnAgregarProducto').disabled = true;
  currentState.productoBuscado = null;

  // Focus en código
  document.getElementById('productCode').focus();

  hideMessage('errorAgregarProducto');
}

function renderProductosAgregados() {
  const tbody = document.getElementById('productosTableBody');
  const emptyEl = document.getElementById('emptyProductos');
  const tableEl = document.getElementById('productosTable');
  const countEl = document.getElementById('countProductos');
  const btnConfirmar = document.getElementById('btnConfirmarMovimiento');

  countEl.textContent = currentState.productos.length;

  if (currentState.productos.length === 0) {
    emptyEl.style.display = 'block';
    tableEl.style.display = 'none';
    btnConfirmar.disabled = true;
    return;
  }

  emptyEl.style.display = 'none';
  tableEl.style.display = 'block';
  btnConfirmar.disabled = false;

  tbody.innerHTML = '';

  currentState.productos.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(item.productoData.codigoInterno)}</strong></td>
      <td>${escapeHtml(item.productoData.name)}</td>
      <td class="text-center"><strong>${item.cantidad}</strong></td>
      <td class="text-center">
        <button class="btn-danger" onclick="eliminarProducto(${index})">
          Quitar
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function eliminarProducto(index) {
  currentState.productos.splice(index, 1);
  renderProductosAgregados();
}

async function confirmarMovimiento() {
  if (currentState.productos.length === 0) {
    showError('formError', 'Agrega al menos un producto');
    return;
  }

  if (!confirm(`¿Confirmar movimiento de ${currentState.tipo} con ${currentState.productos.length} productos?`)) {
    return;
  }

  const btnConfirmar = document.getElementById('btnConfirmarMovimiento');

  try {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Guardando...';
    hideAllMessages();

    const payload = {
      comprobante: currentState.comprobante,
      tipo: currentState.tipo,
      observacion: currentState.observacion,
      productos: currentState.productos.map(p => ({
        productoId: p.productoId,
        cantidad: p.cantidad
      }))
    };

    const response = await authenticatedFetch(`${API_URL}/stock-movements`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('formSuccess', `Movimiento registrado exitosamente. Comprobante: ${data.comprobante}`);

      setTimeout(() => {
        if (confirm('Movimiento registrado. ¿Deseas registrar otro movimiento?')) {
          resetearFormulario();
        } else {
          window.location.href = 'stock-movements.html';
        }
      }, 2000);
    } else {
      if (data.errors && data.errors.length > 0) {
        showError('formError', data.message + ':\n- ' + data.errors.join('\n- '));
      } else {
        showError('formError', data.message || 'Error al registrar movimiento');
      }
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar Movimiento';
    }
  } catch (error) {
    console.error('Error:', error);
    showError('formError', 'Error de conexión con el servidor');
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = 'Confirmar Movimiento';
  }
}

function resetearFormulario() {
  currentState = {
    step: 1,
    tipo: null,
    comprobante: null,
    observacion: '',
    productos: [],
    productoBuscado: null
  };

  document.getElementById('tipo').value = '';
  document.getElementById('observacion').value = '';
  document.getElementById('comprobanteDisplay').textContent = '-';
  document.getElementById('btnGenerarComprobante').disabled = true;

  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';

  hideAllMessages();
}
