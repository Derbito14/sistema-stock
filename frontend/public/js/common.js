// Configuración global
const API_URL = 'http://localhost:5000/api';

// Verificar autenticación al cargar cualquier página
document.addEventListener('DOMContentLoaded', async () => {
  await verifyAuth();
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

    const data = await response.json();

    if (data.success) {
      // Mostrar información del usuario
      const usernameEl = document.getElementById('username');
      const userIconEl = document.getElementById('userIcon');

      if (usernameEl) usernameEl.textContent = data.user.username;
      if (userIconEl) userIconEl.textContent = data.user.username.charAt(0).toUpperCase();

      return true;
    } else {
      logout();
      return false;
    }
  } catch (error) {
    console.error('Error al verificar token:', error);
    logout();
    return false;
  }
}

// Configurar botón de logout
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
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
