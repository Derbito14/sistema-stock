const API_URL = "https://sistema-stock-l23q.onrender.com/api";

// Aplicar restricciones inmediatamente con datos cacheados
(function() {
  try {
    const cached = JSON.parse(localStorage.getItem('user'));
    if (cached?.role === 'VENDEDOR') {
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('a.sidebar-link[href="reportes.html"]').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.quick-card[href="reportes.html"]').forEach(el => el.style.display = 'none');
      });
    }
  } catch(e) {}
})();

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Error en la verificación:', response.status, response.statusText);
      logout();
      return;
    }

    const data = await response.json();

    if (data.success) {
      document.getElementById('username').textContent = data.user.username;
      document.getElementById('userIcon').textContent = data.user.username.charAt(0).toUpperCase();

      // Aplicar restricciones de rol (confirmadas por servidor)
      if (data.user.role === 'VENDEDOR') {
        document.querySelectorAll('a.sidebar-link[href="reportes.html"]').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.quick-card[href="reportes.html"]').forEach(el => el.style.display = 'none');
      }
    } else {
      logout();
    }
  } catch (error) {
    console.error('Error completo al verificar token:', error);
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('No se pudo conectar al servidor backend en:', API_URL);
    }
    logout();
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
    logout();
  }
});

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}
