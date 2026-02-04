// Configurar formulario al cargar
document.addEventListener('DOMContentLoaded', () => {
  loadFamilies();
  setupProductForm();
  setupPrecioCalculation();
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

// Configurar cálculo automático del precio de venta
function setupPrecioCalculation() {
  const precioCompraInput = document.getElementById('precioCompraBase');
  const margenInput = document.getElementById('margenGananciaPorcentaje');
  const precioVentaInput = document.getElementById('precioVentaBase');
  const precioManualCheckbox = document.getElementById('precioVentaManual');
  const precioSugeridoSpan = document.getElementById('precioSugerido');

  // Función para calcular precio de venta
  function calcularPrecioVenta() {
    const precioCompra = parseFloat(precioCompraInput.value) || 0;
    const margen = parseFloat(margenInput.value) || 0;

    if (precioCompra > 0) {
      const precioVentaSugerido = precioCompra + (precioCompra * margen / 100);
      precioSugeridoSpan.textContent = `(Sugerido: $${precioVentaSugerido.toFixed(2)})`;

      // Si no es manual, actualizar el precio de venta automáticamente
      if (!precioManualCheckbox.checked) {
        precioVentaInput.value = precioVentaSugerido.toFixed(2);
      }
    } else {
      precioSugeridoSpan.textContent = '';
    }
  }

  // Actualizar estado del input de precio de venta según checkbox
  function actualizarEstadoPrecioVenta() {
    if (precioManualCheckbox.checked) {
      precioVentaInput.disabled = false;
      precioVentaInput.style.backgroundColor = '';
    } else {
      precioVentaInput.disabled = false; // Lo dejamos editable pero se actualiza automáticamente
      precioVentaInput.style.backgroundColor = '#f5f5f5';
      calcularPrecioVenta();
    }
  }

  // Event listeners
  precioCompraInput.addEventListener('input', calcularPrecioVenta);
  margenInput.addEventListener('input', calcularPrecioVenta);
  precioManualCheckbox.addEventListener('change', actualizarEstadoPrecioVenta);

  // Estado inicial
  actualizarEstadoPrecioVenta();
}

async function handleSubmit() {
  const submitBtn = document.getElementById('submitBtn');
  const barcode = document.getElementById('barcode').value.trim();
  const name = document.getElementById('name').value.trim();
  const familia = document.getElementById('familia').value;
  const unidad = document.getElementById('unidad').value;
  const precioCompraBase = parseFloat(document.getElementById('precioCompraBase').value) || 0;
  const margenGananciaPorcentaje = parseFloat(document.getElementById('margenGananciaPorcentaje').value) || 0;
  const precioVentaBase = parseFloat(document.getElementById('precioVentaBase').value) || 0;
  const precioVentaManual = document.getElementById('precioVentaManual').checked;
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
        price: precioVentaBase,
        precioCompraBase,
        margenGananciaPorcentaje,
        precioVentaBase,
        precioVentaManual,
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
      // Resetear estado del precio de venta
      document.getElementById('precioVentaBase').style.backgroundColor = '#f5f5f5';
      document.getElementById('precioSugerido').textContent = '';

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
