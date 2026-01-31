// Configurar formulario al cargar
document.addEventListener('DOMContentLoaded', () => {
  loadFamilies();
  setupProductForm();
});

// Cargar familias en el select
async function loadFamilies() {
  const select = document.getElementById('familia');

  try {
    const response = await authenticatedFetch(`${API_URL}/families`);
    const data = await response.json();

    if (data.success && data.families.length > 0) {
      data.families.forEach(family => {
        const option = document.createElement('option');
        option.value = family._id;
        option.textContent = family.nombre;
        select.appendChild(option);
      });
    }
    // Si no hay familias, queda "Sin familia" como única opción (está ok)
  } catch (error) {
    console.error('Error al cargar familias:', error);
    select.innerHTML = '<option value="">Error al cargar familias</option>';
  }
}

function setupProductForm() {
  const form = document.getElementById('productForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSubmit();
  });
}

async function handleSubmit() {
  const submitBtn = document.getElementById('submitBtn');
  const barcode = document.getElementById('barcode').value.trim();
  const name = document.getElementById('name').value.trim();
  const familia = document.getElementById('familia').value;
  const unidad = document.getElementById('unidad').value;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const minStock = parseInt(document.getElementById('minStock').value) || 0;

  // Validación básica
  if (!name) {
    showError('formError', 'El nombre del producto es obligatorio');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
    hideAllMessages();

    const response = await authenticatedFetch(`${API_URL}/products`, {
      method: 'POST',
      body: JSON.stringify({
        barcode: barcode || undefined,
        name,
        familia: familia || undefined,
        unidad,
        price,
        minStock
      })
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('formSuccess', `Producto creado exitosamente. Código interno: ${data.product.codigoInterno}`);

      // Limpiar formulario
      document.getElementById('productForm').reset();
      // Volver a poner el valor por defecto de unidad
      document.getElementById('unidad').value = 'unidad';

      // Ocultar mensaje después de 5 segundos
      setTimeout(() => {
        hideMessage('formSuccess');
      }, 5000);
    } else {
      showError('formError', data.message || 'Error al crear el producto');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('formError', 'Error de conexión con el servidor');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar Producto';
  }
}
