// Configuración global
const API_URL = 'https://sistema-stock-l23q.onrender.com/api';

// Datos del usuario actual - leer de localStorage inmediatamente para evitar flicker
(function() {
  try {
    const cached = JSON.parse(localStorage.getItem('user'));
    window.userRole = cached?.role || null;
    window.cachedUsername = cached?.username || null;
  } catch(e) {
    window.userRole = null;
    window.cachedUsername = null;
  }
})();

// Verificar autenticación al cargar cualquier página
document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar username y restricciones inmediatamente desde cache
  if (window.cachedUsername) {
    const usernameEl = document.getElementById('username');
    const userIconEl = document.getElementById('userIcon');
    if (usernameEl) usernameEl.textContent = window.cachedUsername;
    if (userIconEl) userIconEl.textContent = window.cachedUsername.charAt(0).toUpperCase();
  }
  applyRoleRestrictions();
  await verifyAuth();
  // Re-aplicar con rol confirmado del servidor
  applyRoleRestrictions();
  setupLogoutButton();
});

// Verificar autenticación
async function verifyAuth() {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'index.html';
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Verificar si la respuesta es OK
    if (!response.ok) {
      // Si es 401 (no autorizado), el token es inválido
      if (response.status === 401) {
        console.error('Token inválido o expirado');
        logout();
        return false;
      }
      // Para otros errores, no hacer logout automático
      console.error('Error en la verificación:', response.status);
      return false;
    }

    const data = await response.json();

    if (data.success) {
      // Guardar rol del usuario globalmente
      window.userRole = data.user.role;

      // Mostrar información del usuario
      const usernameEl = document.getElementById('username');
      const userIconEl = document.getElementById('userIcon');

      if (usernameEl) usernameEl.textContent = data.user.username;
      if (userIconEl) userIconEl.textContent = data.user.username.charAt(0).toUpperCase();

      return true;
    } else {
      // Solo hacer logout si el token es inválido
      logout();
      return false;
    }
  } catch (error) {
    console.error('Error de red al verificar token:', error);
    // No hacer logout automático en errores de red
    // El usuario puede tener problemas temporales de conexión
    return false;
  }
}

// Configurar botón de logout
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        '¿Cerrar sesión?',
        '¿Estás seguro de que quieres cerrar sesión?',
        'Sí, salir',
        'Cancelar'
      );
      if (confirmed) {
        logout();
      }
    });
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Obtener token
function getToken() {
  return localStorage.getItem('token');
}

// Realizar fetch con autenticación
async function authenticatedFetch(url, options = {}) {
  const token = getToken();

  if (!token) {
    console.error('No hay token disponible');
    window.location.href = 'index.html';
    throw new Error('No autenticado');
  }

  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);

    // Si es 401, el token expiró o es inválido
    if (response.status === 401) {
      console.error('Token inválido o expirado');
      logout();
      throw new Error('Sesión expirada');
    }

    return response;
  } catch (error) {
    console.error('Error en fetch:', error);
    throw error;
  }
}

// Funciones de UI
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

function hideMessage(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove('show');
  }
}

function hideAllMessages() {
  document.querySelectorAll('.error-message, .success-message').forEach(el => {
    el.classList.remove('show');
  });
}

// Formatear fecha
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Obtener fecha de hoy en formato YYYY-MM-DD (hora local, no UTC)
function getTodayLocal() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formatear precio
function formatPrice(price) {
  return parseFloat(price).toFixed(2);
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== SweetAlert2 Helpers ====================

// Mostrar alerta de éxito
function showSuccessAlert(title, text = '') {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    timer: 2500,
    showConfirmButton: false
  });
}

// Mostrar alerta de error
function showErrorAlert(title, text = '') {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: text,
    confirmButtonColor: '#d33'
  });
}

// Mostrar alerta de advertencia
function showWarningAlert(title, text = '') {
  return Swal.fire({
    icon: 'warning',
    title: title,
    text: text,
    confirmButtonColor: '#f0ad4e'
  });
}

// Mostrar alerta de información
function showInfoAlert(title, text = '') {
  return Swal.fire({
    icon: 'info',
    title: title,
    text: text,
    confirmButtonColor: '#3085d6'
  });
}

// Confirmar acción (reemplaza confirm())
async function showConfirm(title, text = '', confirmText = 'Sí', cancelText = 'Cancelar') {
  const result = await Swal.fire({
    title: title,
    text: text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#6c757d',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText
  });
  return result.isConfirmed;
}

// Confirmar eliminación (con estilo peligro)
async function showDeleteConfirm(title, text = '') {
  const result = await Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });
  return result.isConfirmed;
}

// Toast (notificación pequeña)
function showToast(icon, title) {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
  return Toast.fire({ icon, title });
}

// ==================== Restricciones por Rol ====================

function applyRoleRestrictions() {
  if (window.userRole !== 'VENDEDOR') return;

  // Ocultar link de Reportes en sidebar (todas las páginas)
  document.querySelectorAll('a.sidebar-link[href="reportes.html"]').forEach(el => {
    el.style.display = 'none';
  });

  // Ocultar quick-card de Reportes en dashboard
  document.querySelectorAll('.quick-card[href="reportes.html"]').forEach(el => {
    el.style.display = 'none';
  });

  // Remover opciones AC+ y AC- de selects de tipo movimiento
  const tipoSelect = document.getElementById('tipoMovimiento');
  if (tipoSelect) {
    const optToRemove = tipoSelect.querySelector('option[value="AJUSTE_POSITIVO"]') ||
                        tipoSelect.querySelector('option[value="AJUSTE_NEGATIVO"]');
    if (optToRemove) optToRemove.remove();
  }
}

function isVendedor() {
  return window.userRole === 'VENDEDOR';
}
