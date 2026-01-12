// Cache de todos los productos
let allProducts = [];

// Cargar productos al iniciar
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupRefreshButton();
  setupEditForm();
  setupFilters();
});

function setupRefreshButton() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadProducts();
    });
  }
}

// Configurar filtros
function setupFilters() {
  const filtroCodigo = document.getElementById('filtroCodigo');
  const filtroBarcode = document.getElementById('filtroBarcode');
  const filtroNombre = document.getElementById('filtroNombre');
  const filtroStock = document.getElementById('filtroStock');
  const filtroActivo = document.getElementById('filtroActivo');
  const btnLimpiar = document.getElementById('btnLimpiarFiltros');

  // Aplicar filtros al escribir (con debounce)
  let filterTimeout;
  const applyFiltersDebounced = () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      applyFilters();
    }, 300);
  };

  filtroCodigo.addEventListener('input', applyFiltersDebounced);
  filtroBarcode.addEventListener('input', applyFiltersDebounced);
  filtroNombre.addEventListener('input', applyFiltersDebounced);
  filtroStock.addEventListener('change', applyFilters);
  filtroActivo.addEventListener('change', applyFilters);

  // Limpiar filtros
  btnLimpiar.addEventListener('click', () => {
    filtroCodigo.value = '';
    filtroBarcode.value = '';
    filtroNombre.value = '';
    filtroStock.value = '';
    filtroActivo.value = '';
    applyFilters();
  });
}

// Aplicar filtros a los productos
function applyFilters() {
  const filtroCodigo = document.getElementById('filtroCodigo').value.trim().toLowerCase();
  const filtroBarcode = document.getElementById('filtroBarcode').value.trim().toLowerCase();
  const filtroNombre = document.getElementById('filtroNombre').value.trim().toLowerCase();
  const filtroStock = document.getElementById('filtroStock').value;
  const filtroActivo = document.getElementById('filtroActivo').value;

  let filtered = allProducts.filter(product => {
    // Filtro por código interno
    if (filtroCodigo && !product.codigoInterno.toLowerCase().includes(filtroCodigo)) {
      return false;
    }

    // Filtro por código de barras
    if (filtroBarcode) {
      if (!product.barcode || !product.barcode.toLowerCase().includes(filtroBarcode)) {
        return false;
      }
    }

    // Filtro por nombre
    if (filtroNombre && !product.name.toLowerCase().includes(filtroNombre)) {
      return false;
    }

    // Filtro por stock
    if (filtroStock === 'bajo' && product.stock > product.minStock) {
      return false;
    }
    if (filtroStock === 'sin' && product.stock > 0) {
      return false;
    }

    // Filtro por activo
    if (filtroActivo !== '') {
      const isActive = filtroActivo === 'true';
      if (product.activo !== isActive) {
        return false;
      }
    }

    return true;
  });

  // Renderizar productos filtrados
  renderProducts(filtered);

  // Actualizar contador
  const totalEl = document.getElementById('totalProducts');
  const filteredInfoEl = document.getElementById('filteredInfo');

  totalEl.textContent = filtered.length;

  if (filtered.length < allProducts.length) {
    filteredInfoEl.textContent = `(de ${allProducts.length} totales)`;
  } else {
    filteredInfoEl.textContent = '';
  }

  // Mostrar mensaje si no hay resultados
  const tableContainer = document.getElementById('productsTableContainer');
  const emptyEl = document.getElementById('emptyProducts');

  if (filtered.length === 0) {
    tableContainer.style.display = 'none';
    emptyEl.innerHTML = '<p>No se encontraron productos con los filtros aplicados.</p><button class="btn-secondary" onclick="document.getElementById(\'btnLimpiarFiltros\').click()">Limpiar Filtros</button>';
    emptyEl.style.display = 'block';
  } else {
    tableContainer.style.display = 'block';
    emptyEl.style.display = 'none';
  }
}

async function loadProducts() {
  const loadingEl = document.getElementById('loadingProducts');
  const errorEl = document.getElementById('errorProducts');
  const tableContainer = document.getElementById('productsTableContainer');
  const emptyEl = document.getElementById('emptyProducts');

  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    tableContainer.style.display = 'none';
    emptyEl.style.display = 'none';

    const response = await authenticatedFetch(`${API_URL}/products`);

    // Verificar si la respuesta es OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Error del servidor: ${response.status} ${response.statusText}`
      }));
      throw new Error(errorData.message || 'Error al cargar productos');
    }

    const data = await response.json();

    loadingEl.style.display = 'none';

    if (data.success) {
      allProducts = data.products;

      if (data.products.length === 0) {
        emptyEl.innerHTML = '<p>No hay productos registrados.</p><a href="product-form.html" class="btn-primary">Agregar primer producto</a>';
        emptyEl.style.display = 'block';
      } else {
        // Aplicar filtros (o mostrar todos si no hay filtros)
        applyFilters();
      }
    } else {
      errorEl.textContent = data.message || 'Error al cargar productos';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
    loadingEl.style.display = 'none';

    let errorMessage = 'Error de conexión con el servidor';
    if (error.message && !error.message.includes('Failed to fetch')) {
      errorMessage = error.message;
    }

    errorEl.textContent = errorMessage;
    errorEl.style.display = 'block';
  }
}

function renderProducts(products) {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '';

  products.forEach(product => {
    const isLowStock = product.stock <= product.minStock;
    const stockStatus = isLowStock ? 'danger' : 'success';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(product.codigoInterno)}</strong></td>
      <td>${product.barcode ? escapeHtml(product.barcode) : '<em>Sin código</em>'}</td>
      <td>${escapeHtml(product.name)}</td>
      <td>$${formatPrice(product.price)}</td>
      <td class="text-center">
        <span class="badge badge-${stockStatus}">${product.stock || 0}</span>
      </td>
      <td class="text-center">${product.minStock || 0}</td>
      <td class="text-center">
        ${isLowStock ? '<span class="badge badge-warning">Stock Bajo</span>' : '<span class="badge badge-success">OK</span>'}
      </td>
      <td class="text-center">
        <button class="btn-edit" onclick="openEditModal('${product._id}')">
          Editar
        </button>
        <button class="btn-danger" onclick="deleteProduct('${product._id}', '${escapeHtml(product.name)}')">
          Eliminar
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

async function deleteProduct(productId, productName) {
  if (!confirm(`¿Está seguro de eliminar el producto "${productName}"?\n\nNota: Solo se puede eliminar si no tiene movimientos de stock.`)) {
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE'
    });

    // Verificar si la respuesta es OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Error del servidor: ${response.status} ${response.statusText}`
      }));
      throw new Error(errorData.message || 'Error al eliminar producto');
    }

    const data = await response.json();

    if (data.success) {
      alert(`Producto "${productName}" eliminado exitosamente.`);
      loadProducts();
    } else {
      // Mostrar mensaje específico
      if (data.movementCount !== undefined) {
        alert(`${data.message}\n\nMovimientos asociados: ${data.movementCount}`);
      } else {
        alert('Error: ' + data.message);
      }
    }
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    alert(error.message || 'Error de conexión con el servidor');
  }
}

// Funciones del modal de edición
let currentEditProduct = null;

function setupEditForm() {
  const form = document.getElementById('editProductForm');
  if (form) {
    form.addEventListener('submit', handleEditSubmit);
  }

  // Cerrar modal al hacer clic fuera
  const modal = document.getElementById('editModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEditModal();
      }
    });
  }
}

async function openEditModal(productId) {
  try {
    const response = await authenticatedFetch(`${API_URL}/products`);

    // Verificar si la respuesta es OK
    if (!response.ok) {
      throw new Error('Error al cargar productos');
    }

    const data = await response.json();

    if (data.success) {
      const product = data.products.find(p => p._id === productId);
      if (product) {
        currentEditProduct = product;
        fillEditForm(product);
        document.getElementById('editModal').style.display = 'flex';
      } else {
        alert('Producto no encontrado');
      }
    }
  } catch (error) {
    console.error('Error al cargar producto:', error);
    alert(error.message || 'Error al cargar los datos del producto');
  }
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  document.getElementById('editProductForm').reset();
  document.getElementById('editErrorMessage').style.display = 'none';
  document.getElementById('editSuccessMessage').style.display = 'none';
  currentEditProduct = null;
}

function fillEditForm(product) {
  document.getElementById('editProductId').value = product._id;
  document.getElementById('editCodigoInterno').value = product.codigoInterno;
  document.getElementById('editName').value = product.name;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editMinStock').value = product.minStock;
  document.getElementById('editBarcode').value = product.barcode || '';
  document.getElementById('editStock').value = product.stock || 0;
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById('editProductId').value;
  const name = document.getElementById('editName').value.trim();
  const price = parseFloat(document.getElementById('editPrice').value);
  const minStock = parseInt(document.getElementById('editMinStock').value);
  const barcode = document.getElementById('editBarcode').value.trim();

  const errorEl = document.getElementById('editErrorMessage');
  const successEl = document.getElementById('editSuccessMessage');
  const submitBtn = document.getElementById('saveEditBtn');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  // Validaciones frontend
  if (!name) {
    errorEl.textContent = 'El nombre del producto es requerido';
    errorEl.style.display = 'block';
    return;
  }

  if (isNaN(price) || price < 0) {
    errorEl.textContent = 'El precio debe ser un número positivo';
    errorEl.style.display = 'block';
    return;
  }

  if (isNaN(minStock) || minStock < 0) {
    errorEl.textContent = 'El stock mínimo debe ser un número positivo';
    errorEl.style.display = 'block';
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const response = await authenticatedFetch(`${API_URL}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        price,
        minStock,
        barcode: barcode || undefined
      })
    });

    // Verificar si la respuesta es OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Error del servidor: ${response.status} ${response.statusText}`
      }));
      throw new Error(errorData.message || 'Error al actualizar producto');
    }

    const data = await response.json();

    if (data.success) {
      successEl.textContent = 'Producto actualizado exitosamente';
      successEl.style.display = 'block';

      setTimeout(() => {
        closeEditModal();
        loadProducts();
      }, 1500);
    } else {
      errorEl.textContent = data.message || 'Error al actualizar el producto';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    errorEl.textContent = error.message || 'Error de conexión con el servidor';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar Cambios';
  }
}
