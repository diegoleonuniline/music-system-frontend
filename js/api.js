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
    const user = getUser();
    return user.role === 'super_admin' || user.role === 'group_admin';
}

function isSuperAdmin() {
    const user = getUser();
    return user.role === 'super_admin';
}

function checkAuth() {
    const token = getToken();
    const user = getUser();
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
    const input = document.getElementById(inputId);
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
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

initTheme();

// ============ API calls ============
async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 401) {
            logout();
            return null;
        }
        if (!response.ok) throw new Error('Error en la petición');
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${getToken()}`,
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
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${getToken()}`,
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

async function apiDelete(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${getToken()}`,
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
const CLOUDINARY_CLOUD_NAME = 'dnodzj8fz';
const CLOUDINARY_UPLOAD_PRESET = 'caiman_uploads';

async function uploadToCloudinary(file, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'caiman');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve({
                    url: response.secure_url,
                    type: response.resource_type,
                    format: response.format,
                    size: response.bytes
                });
            } else {
                reject(new Error('Error al subir archivo'));
            }
        };

        xhr.onerror = () => reject(new Error('Error de conexión'));
        xhr.send(formData);
    });
}

// ============ OneSignal Notifications ============
async function initOneSignal() {
    if (typeof OneSignal !== 'undefined') {
        try {
            const permission = await OneSignal.Notifications.permission;
            if (!permission) {
                await OneSignal.Notifications.requestPermission();
            }
            
            // Registrar usuario con su ID
            const user = getUser();
            if (user.id) {
                await OneSignal.login(user.id.toString());
                await OneSignal.User.addTags({
                    user_id: user.id.toString(),
                    group_id: user.group_id?.toString() || '',
                    role: user.role || 'musician'
                });
            }
        } catch (e) {
            console.log('OneSignal init error:', e);
        }
    }
}

async function sendPushNotification(title, message, userIds = []) {
    // Las notificaciones se envían desde el backend
    // Esta función es para referencia
    console.log('Push notification:', { title, message, userIds });
}

// ============ Toast ============
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#10B981'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============ User Info Setup ============
function setupUserInfo() {
    const user = getUser();
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const role = document.getElementById('userRole');

    if (avatar) avatar.textContent = (user.first_name || 'U').charAt(0).toUpperCase();
    if (name) name.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
    if (role) {
        role.textContent = user.role === 'super_admin' ? 'Super Admin' : 
                          user.role === 'group_admin' ? 'Administrador' : 'Músico';
    }

    // Init OneSignal después de login
    initOneSignal();
}

// ============ Mobile Menu ============
function toggleMobileMenu() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function closeMobileMenu() {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay').classList.remove('active');
}

// ============ Format Helpers ============
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ============ Text with line breaks ============
function formatTextWithBreaks(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
}

function nl2br(str) {
    if (!str) return '';
    return str.replace(/(?:\r\n|\r|\n)/g, '<br>');
}

// CSS Animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(style);
