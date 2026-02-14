// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
  // Esperar a que verifyAuth termine (common.js)
  await new Promise(resolve => setTimeout(resolve, 100));

  setupEventListeners();
  await cargarEstadoCaja();

  // Mostrar secciones segun rol
  if (window.userRole === 'MASTER') {
    document.getElementById('seccionRetiro').style.display = '';
    document.getElementById('seccionHistorial').style.display = '';
    cargarHistorial();
  }

  // VENDEDOR: ocultar retiros
  if (window.userRole === 'VENDEDOR') {
    document.getElementById('cardRetiros').style.display = 'none';
  }
});

function setupEventListeners() {
  document.getElementById('btnAbrirCaja').addEventListener('click', abrirCaja);
  document.getElementById('btnCerrarCaja').addEventListener('click', cerrarCaja);
  document.getElementById('btnRegistrarGasto').addEventListener('click', registrarGasto);

  const btnRetiro = document.getElementById('btnRegistrarRetiro');
  if (btnRetiro) {
    btnRetiro.addEventListener('click', registrarRetiro);
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value || 0);
}

function formatFecha(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Cargar estado actual de la caja
async function cargarEstadoCaja() {
  const loading = document.getElementById('loadingState');
  const abrirView = document.getElementById('abrirCajaView');
  const abiertaView = document.getElementById('cajaAbiertaView');

  loading.style.display = 'block';
  abrirView.style.display = 'none';
  abiertaView.style.display = 'none';

  try {
    const response = await authenticatedFetch(`${API_URL}/cash/actual`);
    const data = await response.json();

    loading.style.display = 'none';

    if (data.success && data.abierta) {
      renderCajaAbierta(data);
      abiertaView.style.display = '';
    } else {
      abrirView.style.display = '';
    }
  } catch (error) {
    console.error('Error al cargar caja:', error);
    loading.style.display = 'none';
    loading.textContent = 'Error al cargar el estado de la caja';
    loading.style.display = 'block';
  }
}

// Renderizar caja abierta
function renderCajaAbierta(data) {
  const { sesion, resumen, movimientos } = data;

  // Info
  document.getElementById('infoCaja').textContent =
    `Abierta por ${sesion.usuarioApertura?.username || '?'} el ${formatFecha(sesion.fechaApertura)}`;

  // Stats
  document.getElementById('statApertura').textContent = formatMoney(resumen.montoApertura);
  document.getElementById('statVentas').textContent = formatMoney(resumen.ventasEfectivo);
  document.getElementById('statGastos').textContent = formatMoney(resumen.gastos);
  document.getElementById('statSaldo').textContent = formatMoney(resumen.saldoTeorico);

  if (resumen.retiros !== undefined) {
    document.getElementById('statRetiros').textContent = formatMoney(resumen.retiros);
  }

  // Movimientos
  renderMovimientos(movimientos);
}

// Renderizar movimientos de caja
function renderMovimientos(movimientos) {
  const tbody = document.getElementById('movimientosTableBody');
  const empty = document.getElementById('movimientosEmpty');
  const container = document.getElementById('movimientosTableContainer');

  tbody.innerHTML = '';

  if (!movimientos || movimientos.length === 0) {
    empty.style.display = '';
    container.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  container.style.display = '';

  movimientos.forEach(mov => {
    const row = document.createElement('tr');
    const tipoClass = mov.tipo.toLowerCase();
    const signo = mov.tipo === 'INGRESO' ? '+' : '-';

    row.innerHTML = `
      <td><span class="badge-tipo ${tipoClass}">${mov.tipo}</span></td>
      <td>${escapeHtml(mov.descripcion)}</td>
      <td class="text-right"><strong>${signo} ${formatMoney(mov.monto)}</strong></td>
      <td>${mov.usuario?.username || '?'}</td>
      <td>${formatFecha(mov.fecha)}</td>
    `;
    tbody.appendChild(row);
  });
}

// Abrir caja
async function abrirCaja() {
  const montoInput = document.getElementById('montoApertura');
  const monto = parseFloat(montoInput.value);

  if (isNaN(monto) || monto < 0) {
    showErrorAlert('Error', 'El monto de apertura no puede ser negativo');
    return;
  }

  const btn = document.getElementById('btnAbrirCaja');
  btn.disabled = true;
  btn.textContent = 'Abriendo...';

  try {
    const response = await authenticatedFetch(`${API_URL}/cash/abrir`, {
      method: 'POST',
      body: JSON.stringify({ montoApertura: monto })
    });
    const data = await response.json();

    if (data.success) {
      showSuccessAlert('Caja abierta', 'La caja fue abierta exitosamente');
      await cargarEstadoCaja();
    } else {
      showErrorAlert('Error', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert('Error', 'Error de conexion');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Abrir Caja';
  }
}

// Cerrar caja
async function cerrarCaja() {
  const montoInput = document.getElementById('montoCierre');
  const monto = parseFloat(montoInput.value);

  if (isNaN(monto) || monto < 0) {
    showErrorAlert('Error', 'Ingrese el monto real contado en caja');
    return;
  }

  const confirmed = await showConfirm(
    'Cerrar Caja',
    `Monto real ingresado: ${formatMoney(monto)}. Esta seguro?`,
    'Si, cerrar',
    'Cancelar'
  );

  if (!confirmed) return;

  const btn = document.getElementById('btnCerrarCaja');
  btn.disabled = true;
  btn.textContent = 'Cerrando...';

  try {
    const response = await authenticatedFetch(`${API_URL}/cash/cerrar`, {
      method: 'POST',
      body: JSON.stringify({ montoCierreReal: monto })
    });
    const data = await response.json();

    if (data.success) {
      const dif = data.sesion.diferencia;
      let difText = '';
      if (dif > 0) difText = `Sobrante: ${formatMoney(dif)}`;
      else if (dif < 0) difText = `Faltante: ${formatMoney(Math.abs(dif))}`;
      else difText = 'Sin diferencia';

      // Solo MASTER ve la diferencia
      const msgText = window.userRole === 'MASTER'
        ? `Saldo teorico: ${formatMoney(data.sesion.saldoTeorico)}\n${difText}`
        : 'La caja fue cerrada exitosamente';

      await Swal.fire({
        icon: dif === 0 ? 'success' : 'info',
        title: 'Caja Cerrada',
        text: msgText
      });

      montoInput.value = '';
      await cargarEstadoCaja();

      // Recargar historial si es MASTER
      if (window.userRole === 'MASTER') {
        cargarHistorial();
      }
    } else {
      showErrorAlert('Error', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert('Error', 'Error de conexion');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Cerrar Caja';
  }
}

// Registrar gasto
async function registrarGasto() {
  const montoInput = document.getElementById('gastoMonto');
  const descInput = document.getElementById('gastoDescripcion');
  const monto = parseFloat(montoInput.value);
  const descripcion = descInput.value.trim();

  if (!monto || monto <= 0) {
    showErrorAlert('Error', 'El monto debe ser mayor a cero');
    return;
  }
  if (!descripcion) {
    showErrorAlert('Error', 'La descripcion es requerida');
    return;
  }

  const btn = document.getElementById('btnRegistrarGasto');
  btn.disabled = true;

  try {
    const response = await authenticatedFetch(`${API_URL}/cash/gasto`, {
      method: 'POST',
      body: JSON.stringify({ monto, descripcion })
    });
    const data = await response.json();

    if (data.success) {
      showToast('success', 'Gasto registrado');
      montoInput.value = '';
      descInput.value = '';
      await cargarEstadoCaja();
    } else {
      showErrorAlert('Error', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert('Error', 'Error de conexion');
  } finally {
    btn.disabled = false;
  }
}

// Registrar retiro
async function registrarRetiro() {
  const montoInput = document.getElementById('retiroMonto');
  const descInput = document.getElementById('retiroDescripcion');
  const monto = parseFloat(montoInput.value);
  const descripcion = descInput.value.trim();

  if (!monto || monto <= 0) {
    showErrorAlert('Error', 'El monto debe ser mayor a cero');
    return;
  }
  if (!descripcion) {
    showErrorAlert('Error', 'La descripcion es requerida');
    return;
  }

  const btn = document.getElementById('btnRegistrarRetiro');
  btn.disabled = true;

  try {
    const response = await authenticatedFetch(`${API_URL}/cash/retiro`, {
      method: 'POST',
      body: JSON.stringify({ monto, descripcion })
    });
    const data = await response.json();

    if (data.success) {
      showToast('success', 'Retiro registrado');
      montoInput.value = '';
      descInput.value = '';
      await cargarEstadoCaja();
    } else {
      showErrorAlert('Error', data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert('Error', 'Error de conexion');
  } finally {
    btn.disabled = false;
  }
}

// Cargar historial (solo MASTER)
async function cargarHistorial() {
  try {
    const response = await authenticatedFetch(`${API_URL}/cash/historial`);
    const data = await response.json();

    if (data.success) {
      renderHistorial(data.sesiones);
    }
  } catch (error) {
    console.error('Error al cargar historial:', error);
  }
}

// Renderizar historial
function renderHistorial(sesiones) {
  const tbody = document.getElementById('historialTableBody');
  const empty = document.getElementById('historialEmpty');
  const container = document.getElementById('historialTableContainer');

  tbody.innerHTML = '';

  if (!sesiones || sesiones.length === 0) {
    empty.style.display = '';
    container.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  container.style.display = '';

  sesiones.forEach(s => {
    const row = document.createElement('tr');
    let difClass = 'diferencia-cero';
    let difText = formatMoney(0);
    if (s.diferencia > 0) {
      difClass = 'diferencia-positiva';
      difText = '+' + formatMoney(s.diferencia);
    } else if (s.diferencia < 0) {
      difClass = 'diferencia-negativa';
      difText = formatMoney(s.diferencia);
    }

    row.innerHTML = `
      <td>${formatFecha(s.fechaApertura)}</td>
      <td>${formatFecha(s.fechaCierre)}</td>
      <td class="text-right">${formatMoney(s.montoApertura)}</td>
      <td class="text-right">${formatMoney(s.saldoTeorico)}</td>
      <td class="text-right">${formatMoney(s.montoCierreReal)}</td>
      <td class="text-right"><span class="${difClass}">${difText}</span></td>
      <td>${s.usuarioApertura?.username || '?'}</td>
      <td>${s.usuarioCierre?.username || '?'}</td>
    `;
    tbody.appendChild(row);
  });
}
