// Configurar formulario al cargar
document.addEventListener('DOMContentLoaded', () => {
  setupProductForm();
});

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
        price,
        minStock
      })
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('formSuccess', `Producto creado exitosamente. Código interno: ${data.product.codigoInterno}`);

      // Limpiar formulario
      document.getElementById('productForm').reset();

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
