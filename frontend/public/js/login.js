const API_URL = "https://sistema-stock-l23q.onrender.com/api";

// Verificar si ya hay un token guardado
if (localStorage.getItem('token')) {
  window.location.href = 'dashboard.html';
}

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  // Validación básica
  if (!username || !password) {
    showError('Por favor completa todos los campos');
    return;
  }

  try {
    // Deshabilitar botón
    loginBtn.disabled = true;
    loginBtn.textContent = 'Ingresando...';
    hideError();

    // Llamada a la API
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      // Guardar token y datos de usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirigir al dashboard
      window.location.href = 'dashboard.html';
    } else {
      showError(data.message || 'Error al iniciar sesión');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Ingresar';
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error de conexión. Verifica que el servidor esté corriendo.');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Ingresar';
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.remove('show');
}
