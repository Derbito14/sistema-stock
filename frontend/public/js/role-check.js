// Se carga en <head> para ocultar elementos restringidos ANTES del render
// y mostrar el username cacheado sin esperar al backend
(function() {
  try {
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    if (user.role === 'VENDEDOR') {
      var style = document.createElement('style');
      style.textContent = 'a.sidebar-link[href="reportes.html"], .quick-card[href="reportes.html"] { display: none !important; }';
      document.head.appendChild(style);
    }
    // Registrar DOMContentLoaded temprano (antes que common.js) para inyectar username al instante
    if (user.username) {
      document.addEventListener('DOMContentLoaded', function() {
        var el = document.getElementById('username');
        var icon = document.getElementById('userIcon');
        if (el) el.textContent = user.username;
        if (icon) icon.textContent = user.username.charAt(0).toUpperCase();
      });
    }
  } catch(e) {}
})();
