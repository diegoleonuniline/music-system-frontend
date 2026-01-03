// Auth helpers
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
        return {};
    }
}

function isAdmin() {
    var user = getUser();
    return user.role === 'super_admin' || user.role === 'group_admin';
}

function isSuperAdmin() {
    var user = getUser();
    return user.role === 'super_admin';
}

function checkAuth() {
    var token = getToken();
    var user = getUser();
    if (!token || !user.id) {
        window.location.href = '../index.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

function togglePasswordVisibility(inputId, btn) {
    var input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// Theme
function initTheme() {
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

initTheme();

// ============ OFFLINE DATA STORAGE ============
var offlineDB = {
    get: function(key) {
        try {
            var data = localStorage.getItem('offline_' + key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },
    set: function(key, data) {
        try {
            localStorage.setItem('offline_' + key, JSON.stringify(data));
            localStorage.setItem('offline_' + key + '_time', Date.now().toString());
        } catch (e) {
            console.warn('Storage full');
        }
    },
    isStale: function(key, maxAge) {
        var time = localStorage.getItem('offline_' + key + '_time');
        if (!time) return true;
        return (Date.now() - parseInt(time)) > (maxAge || 300000); // 5 min default
    }
};

// ============ API calls with offline support ============
async function apiGet(endpoint) {
    var cacheKey = endpoint.replace(/\//g, '_');
    
    try {
        var response = await fetch(API_URL + endpoint, {
            headers: { 
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            logout();
            return null;
        }
        
        if (!response.ok) throw new Error('Error en la petición');
        
        var data = await response.json();
        
        // Cache data for offline use
        offlineDB.set(cacheKey, data);
        
        return data;
    } catch (error) {
        console.error('API GET Error:', error);
        
        // Try offline cache
        var cached = offlineDB.get(cacheKey);
        if (cached) {
            console.log('Using offline cache for:', endpoint);
            return cached;
        }
        
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        var response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401) {
            logout();
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
}

async function apiPut(endpoint, data) {
    try {
        var response = await fetch(API_URL + endpoint, {
            method: 'PUT',
            headers: { 
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401) {
            logout();
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API PUT Error:', error);
        throw error;
    }
}

async function apiPatch(url, data) {
    var response = await fetch(API_URL + url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error en PATCH');
    return response.json();
}

async function apiDelete(endpoint) {
    try {
        var response = await fetch(API_URL + endpoint, {
            method: 'DELETE',
            headers: { 
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 401) {
            logout();
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('API DELETE Error:', error);
        throw error;
    }
}

// ============ Cloudinary Upload ============
var CLOUDINARY_CLOUD_NAME = 'dnodzj8fz';
var CLOUDINARY_UPLOAD_PRESET = 'caiman_uploads';

async function uploadToCloudinary(file, onProgress) {
    return new Promise(function(resolve, reject) {
        var formData = new FormData();
        
        var fileName = file.name.toLowerCase();
        var isPdf = fileName.endsWith('.pdf');
        var endpoint = isPdf ? 'raw' : 'auto';
        
        // Para PDFs, crear un nuevo Blob con el tipo correcto
        if (isPdf) {
            var pdfBlob = new Blob([file], { type: 'application/pdf' });
            formData.append('file', pdfBlob, file.name);
        } else {
            formData.append('file', file);
        }
        
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'caiman');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/' + endpoint + '/upload');

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable && onProgress) {
                var percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                resolve({
                    url: response.secure_url,
                    type: response.resource_type,
                    format: response.format || (isPdf ? 'pdf' : ''),
                    size: response.bytes
                });
            } else {
                console.error('Cloudinary error:', xhr.responseText);
                reject(new Error('Error al subir archivo'));
            }
        };

        xhr.onerror = function() { reject(new Error('Error de conexión')); };
        xhr.send(formData);
    });
}

// ============ OneSignal Notifications ============
async function initOneSignal() {
    if (typeof OneSignal !== 'undefined') {
        try {
            var permission = await OneSignal.Notifications.permission;
            if (!permission) {
                await OneSignal.Notifications.requestPermission();
            }
            
            var user = getUser();
            if (user.id) {
                await OneSignal.login(user.id.toString());
                await OneSignal.User.addTags({
                    user_id: user.id.toString(),
                    group_id: (user.group_id || '').toString(),
                    role: user.role || 'musician'
                });
            }
        } catch (e) {
            console.log('OneSignal init error:', e);
        }
    }
}

// ============ Toast ============
function showToast(message, type) {
    type = type || 'success';
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' + 
        (type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#10B981') + 
        ';color:white;padding:12px 24px;border-radius:8px;z-index:10000;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideUp 0.3s ease;';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

// ============ User Info Setup ============
function setupUserInfo() {
    var user = getUser();
    var avatar = document.getElementById('userAvatar');
    var name = document.getElementById('userName');
    var role = document.getElementById('userRole');

    if (avatar) avatar.textContent = (user.first_name || 'U').charAt(0).toUpperCase();
    if (name) name.textContent = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || 'Usuario';
    if (role) {
        role.textContent = user.role === 'super_admin' ? 'Super Admin' : 
                          user.role === 'group_admin' ? 'Administrador' : 'Músico';
    }

    initOneSignal();
}

// ============ Mobile Menu ============
function toggleMobileMenu() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function closeMobileMenu() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ============ Format Helpers ============
function formatDate(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function nl2br(str) {
    if (!str) return '';
    return str.replace(/(?:\r\n|\r|\n)/g, '<br>');
}

// ============ Cache Management ============
function clearAppCache() {
    if ('caches' in window) {
        caches.keys().then(function(names) {
            names.forEach(function(name) { caches.delete(name); });
        });
    }
    
    // Clear offline data
    Object.keys(localStorage).forEach(function(key) {
        if (key.startsWith('offline_')) {
            localStorage.removeItem(key);
        }
    });
    
    showToast('Cache limpiado, recargando...');
    setTimeout(function() { window.location.reload(true); }, 500);
}

function forceReload() {
    var url = window.location.href.split('?')[0];
    window.location.href = url + '?v=' + Date.now();
}

// CSS Animation
var style = document.createElement('style');
style.textContent = '@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }';
document.head.appendChild(style);

// ============ AUTO CACHE BUSTER ============
(function() {
    var APP_VERSION = '1.0.3';
    var storedVersion = localStorage.getItem('appVersion');
    
    if (storedVersion && storedVersion !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) { caches.delete(name); });
            });
        }
        window.location.reload(true);
    } else {
        localStorage.setItem('appVersion', APP_VERSION);
    }
})();
