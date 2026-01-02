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
