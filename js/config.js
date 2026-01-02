const API_URL = 'https://music-system-backend-api-5646c5d8ff16.herokuapp.com/api';

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered:', registration.scope);
            })
            .catch(function(error) {
                console.log('SW registration failed:', error);
            });
    });
}

// Offline detection
window.addEventListener('online', function() {
    document.body.classList.remove('offline');
    showToast('Conexión restaurada', 'success');
});

window.addEventListener('offline', function() {
    document.body.classList.add('offline');
    showToast('Sin conexión - Modo offline', 'warning');
});

// Check initial state
if (!navigator.onLine) {
    document.body.classList.add('offline');
}

// ========== SPLASH SCREEN ==========
function hideSplash() {
    var splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('hide');
        setTimeout(function() {
            splash.style.display = 'none';
        }, 500);
    }
}

// Solo mostrar splash en primera carga de la sesión
if (sessionStorage.getItem('splashShown')) {
    var splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';
} else {
    sessionStorage.setItem('splashShown', '1');
    setTimeout(hideSplash, 1800);
}

// ========== CONFETTI CELEBRATION ==========
function launchConfetti() {
    var colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    for (var i = 0; i < 60; i++) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.bottom = '-20px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 10 + 6) + 'px';
        confetti.style.height = (Math.random() * 10 + 6) + 'px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(confetti);
        setTimeout(function(el) { el.remove(); }, 4500, confetti);
    }
}

// ========== TOAST MEJORADO ==========
function showToast(message, type) {
    type = type || 'success';
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '✓') + '</span>' + message;
    document.body.appendChild(toast);
    
    // Confetti en acciones exitosas importantes
    if (type === 'success' && (message.includes('guardad') || message.includes('cread') || message.includes('Lista'))) {
        launchConfetti();
    }
    
    setTimeout(function() {
        toast.classList.add('toast-hide');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}
