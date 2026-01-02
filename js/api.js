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

function togglePassword(inputId, btn) {
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

// API calls
async function apiGet(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.status === 401) { logout(); return null; }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401) { logout(); return null; }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function apiPut(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401) { logout(); return null; }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function apiPatch(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(data)
        });
        if (response.status === 401) { logout(); return null; }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function apiDelete(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.status === 401) { logout(); return null; }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// Date formatting - CORREGIDO para evitar Invalid Date
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        // Handle ISO string with timezone
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        // Adjust for timezone offset to get correct local date
        const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        
        return utcDate.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return '-';
    }
}

function formatDateShort(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short'
        });
    } catch (e) {
        return '-';
    }
}

function getDateValue(dateString) {
    if (!dateString) return '';
    try {
        // Extract just the date part YYYY-MM-DD
        if (dateString.includes('T')) {
            return dateString.split('T')[0];
        }
        // If already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        // Try to parse and format
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// UI helpers
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// Mobile Menu
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

function setupUserInfo() {
    const user = getUser();
    
    // Desktop sidebar
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
    if (userRole) {
        const roles = { super_admin: 'Super Admin', group_admin: 'Admin', musician: 'Músico' };
        userRole.textContent = roles[user.role] || 'Usuario';
    }
    if (userAvatar) userAvatar.textContent = (user.first_name || 'U').charAt(0).toUpperCase();
    
    // Mobile
    const mobileUserName = document.getElementById('mobileUserName');
    const mobileUserRole = document.getElementById('mobileUserRole');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    
    if (mobileUserName) mobileUserName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
    if (mobileUserRole) {
        const roles = { super_admin: 'Super Admin', group_admin: 'Admin', musician: 'Músico' };
        mobileUserRole.textContent = roles[user.role] || 'Usuario';
    }
    if (mobileUserAvatar) mobileUserAvatar.textContent = (user.first_name || 'U').charAt(0).toUpperCase();
}
