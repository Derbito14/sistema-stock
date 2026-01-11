const API_URL = "https://sistema-stock-l23q.onrender.com/api";

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // Verificar token con el backend
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Verificar si la respuesta es OK (status 200-299)
    if (!response.ok) {
      console.error('Error en la verificación:', response.status, response.statusText);
      logout();
      return;
    }

    const data = await response.json();

    if (data.success) {
      // Mostrar información del usuario
      document.getElementById('username').textContent = data.user.username;
      document.getElementById('userIcon').textContent = data.user.username.charAt(0).toUpperCase();
    } else {
      // Token inválido, redirigir al login
      logout();
    }
  } catch (error) {
    console.error('Error completo al verificar token:', error);

    // Mostrar mensaje más descriptivo en la consola
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
