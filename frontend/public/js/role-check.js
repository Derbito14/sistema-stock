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
    // Inyectar username via CSS ANTES de que el body se pinte (sin titileo)
    if (user.username) {
      var nameStyle = document.createElement('style');
      nameStyle.id = 'cached-user-style';
      var initial = user.username.charAt(0).toUpperCase();
      var safeName = user.username.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      var safeInitial = initial.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      nameStyle.textContent = '#username:empty::after { content: "' + safeName + '"; } #userIcon:empty::after { content: "' + safeInitial + '"; }';
      document.head.appendChild(nameStyle);
    }
  } catch(e) {}
})();
