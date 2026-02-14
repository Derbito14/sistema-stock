// Se carga en <head> para ocultar elementos restringidos ANTES del render
(function() {
  try {
    var user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'VENDEDOR') {
      var style = document.createElement('style');
      style.textContent = 'a.sidebar-link[href="reportes.html"], .quick-card[href="reportes.html"] { display: none !important; }';
      document.head.appendChild(style);
    }
  } catch(e) {}
})();
