// Cargar productos al iniciar
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupRefreshButton();
  setupEditForm();
});

function setupRefreshButton() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadProducts();
    });
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
    const data = await response.json();

    loadingEl.style.display = 'none';

    if (data.success) {
      if (data.products.length === 0) {
        emptyEl.style.display = 'block';
      } else {
        renderProducts(data.products);
        document.getElementById('totalProducts').textContent = data.products.length;
        tableContainer.style.display = 'block';
      }
    } else {
      errorEl.textContent = data.message || 'Error al cargar productos';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al cargar productos:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Error de conexión con el servidor';
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
  if (!confirm(`¿Está seguro de eliminar el producto "${productName}"?\n\nNota: Solo se puede eliminar si el stock es 0.`)) {
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      alert(`Producto "${productName}" eliminado exitosamente.`);
      loadProducts();
    } else {
      // Mostrar mensaje específico con stock actual si está disponible
      if (data.currentStock !== undefined) {
        alert(`${data.message}\n\nStock actual del producto: ${data.currentStock} unidades`);
      } else {
        alert('Error: ' + data.message);
      }
    }
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    alert('Error de conexión con el servidor');
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
    const data = await response.json();

    if (data.success) {
      const product = data.products.find(p => p._id === productId);
      if (product) {
        currentEditProduct = product;
        fillEditForm(product);
        document.getElementById('editModal').style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('Error al cargar producto:', error);
    alert('Error al cargar los datos del producto');
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
    errorEl.textContent = 'Error de conexión con el servidor';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar Cambios';
  }
}
