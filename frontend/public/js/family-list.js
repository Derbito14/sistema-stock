// Cache de todas las familias
let allFamilies = [];
let productCounts = {};

// Cargar familias al iniciar
document.addEventListener('DOMContentLoaded', () => {
  loadFamilies();
  setupRefreshButton();
  setupNewFamilyForm();
  setupEditForm();
});

function setupRefreshButton() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadFamilies();
    });
  }
}

function setupNewFamilyForm() {
  const btnNueva = document.getElementById('btnNuevaFamilia');
  const form = document.getElementById('familyForm');

  if (btnNueva) {
    btnNueva.addEventListener('click', toggleNewFamilyForm);
  }

  if (form) {
    form.addEventListener('submit', handleNewFamilySubmit);
  }
}

function toggleNewFamilyForm() {
  const formContainer = document.getElementById('newFamilyForm');
  if (formContainer.style.display === 'none') {
    formContainer.style.display = 'block';
    document.getElementById('familyNombre').focus();
  } else {
    formContainer.style.display = 'none';
    document.getElementById('familyForm').reset();
    hideAllMessages();
  }
}

async function handleNewFamilySubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const nombre = document.getElementById('familyNombre').value.trim();
  const descripcion = document.getElementById('familyDescripcion').value.trim();

  if (!nombre) {
    showError('formError', 'El nombre de la familia es obligatorio');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
    hideAllMessages();

    const response = await authenticatedFetch(`${API_URL}/families`, {
      method: 'POST',
      body: JSON.stringify({
        nombre,
        descripcion
      })
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('formSuccess', 'Familia creada exitosamente');
      document.getElementById('familyForm').reset();

      setTimeout(() => {
        toggleNewFamilyForm();
        loadFamilies();
      }, 1000);
    } else {
      showError('formError', data.message || 'Error al crear la familia');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('formError', 'Error de conexión con el servidor');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar Familia';
  }
}

async function loadFamilies() {
  const loadingEl = document.getElementById('loadingFamilies');
  const errorEl = document.getElementById('errorFamilies');
  const tableContainer = document.getElementById('familiesTableContainer');
  const emptyEl = document.getElementById('emptyFamilies');

  try {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    tableContainer.style.display = 'none';
    emptyEl.style.display = 'none';

    // Cargar familias y productos en paralelo
    const [familiesRes, productsRes] = await Promise.all([
      authenticatedFetch(`${API_URL}/families`),
      authenticatedFetch(`${API_URL}/products`)
    ]);

    const familiesData = await familiesRes.json();
    const productsData = await productsRes.json();

    loadingEl.style.display = 'none';

    if (familiesData.success) {
      allFamilies = familiesData.families;

      // Contar productos por familia
      productCounts = {};
      if (productsData.success) {
        productsData.products.forEach(product => {
          if (product.familia) {
            const familyId = product.familia._id || product.familia;
            productCounts[familyId] = (productCounts[familyId] || 0) + 1;
          }
        });
      }

      if (allFamilies.length === 0) {
        emptyEl.style.display = 'block';
      } else {
        renderFamilies();
        tableContainer.style.display = 'block';
        document.getElementById('totalFamilies').textContent = allFamilies.length;
      }
    } else {
      errorEl.textContent = familiesData.message || 'Error al cargar familias';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al cargar familias:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Error de conexión con el servidor';
    errorEl.style.display = 'block';
  }
}

function renderFamilies() {
  const tbody = document.getElementById('familiesTableBody');
  tbody.innerHTML = '';

  allFamilies.forEach(family => {
    const count = productCounts[family._id] || 0;
    const canDelete = count === 0;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(family.nombre)}</strong></td>
      <td>${family.descripcion ? escapeHtml(family.descripcion) : '<em>Sin descripción</em>'}</td>
      <td class="text-center">
        <span class="badge badge-${count > 0 ? 'info' : 'secondary'}">${count}</span>
      </td>
      <td class="text-center">
        <button class="btn-edit" onclick="openEditModal('${family._id}')">
          Editar
        </button>
        <button class="btn-danger" onclick="deleteFamily('${family._id}', '${escapeHtml(family.nombre)}', ${count})" ${!canDelete ? 'title="No se puede eliminar: tiene productos asociados"' : ''}>
          Eliminar
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

async function deleteFamily(familyId, familyName, productCount) {
  if (productCount > 0) {
    showWarningAlert(
      'No se puede eliminar',
      `La familia "${familyName}" tiene ${productCount} producto(s) asociado(s). Primero debe reasignar o eliminar esos productos.`
    );
    return;
  }

  const confirmed = await showDeleteConfirm(`¿Eliminar "${familyName}"?`);
  if (!confirmed) return;

  try {
    const response = await authenticatedFetch(`${API_URL}/families/${familyId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showSuccessAlert('Familia eliminada', `"${familyName}" fue eliminada exitosamente.`);
      loadFamilies();
    } else {
      showErrorAlert('Error', data.message);
    }
  } catch (error) {
    console.error('Error al eliminar familia:', error);
    showErrorAlert('Error', 'Error de conexión con el servidor');
  }
}

// Funciones del modal de edición
function setupEditForm() {
  const form = document.getElementById('editFamilyForm');
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

function openEditModal(familyId) {
  const family = allFamilies.find(f => f._id === familyId);
  if (!family) {
    showErrorAlert('Error', 'Familia no encontrada');
    return;
  }

  document.getElementById('editFamilyId').value = family._id;
  document.getElementById('editNombre').value = family.nombre;
  document.getElementById('editDescripcion').value = family.descripcion || '';
  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  document.getElementById('editFamilyForm').reset();
  document.getElementById('editErrorMessage').style.display = 'none';
  document.getElementById('editSuccessMessage').style.display = 'none';
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const familyId = document.getElementById('editFamilyId').value;
  const nombre = document.getElementById('editNombre').value.trim();
  const descripcion = document.getElementById('editDescripcion').value.trim();

  const errorEl = document.getElementById('editErrorMessage');
  const successEl = document.getElementById('editSuccessMessage');
  const submitBtn = document.getElementById('saveEditBtn');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  if (!nombre) {
    errorEl.textContent = 'El nombre de la familia es requerido';
    errorEl.style.display = 'block';
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const response = await authenticatedFetch(`${API_URL}/families/${familyId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nombre,
        descripcion
      })
    });

    const data = await response.json();

    if (data.success) {
      successEl.textContent = 'Familia actualizada exitosamente';
      successEl.style.display = 'block';

      setTimeout(() => {
        closeEditModal();
        loadFamilies();
      }, 1000);
    } else {
      errorEl.textContent = data.message || 'Error al actualizar la familia';
      errorEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error al actualizar familia:', error);
    errorEl.textContent = 'Error de conexión con el servidor';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar Cambios';
  }
}
