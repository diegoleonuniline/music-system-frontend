// ===== AUTH =====
function getToken() { return localStorage.getItem('token'); }
function getUser() { return JSON.parse(localStorage.getItem('user') || '{}'); }
function isAdmin() { const u = getUser(); return u.role === 'super_admin' || u.role === 'group_admin'; }
function isSuperAdmin() { return getUser().role === 'super_admin'; }

function checkAuth() {
    if (!getToken()) { window.location.href = '../index.html'; return false; }
    initTheme();
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// ===== THEME =====
function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const meta = document.getElementById('themeColor');
    if (meta) meta.content = theme === 'dark' ? '#000000' : '#ffffff';
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = localStorage.getItem('theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
}

// ===== API CALLS =====
async function api(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`,
                ...options.headers
            }
        });
        if (response.status === 401) { logout(); return null; }
        if (response.status === 204) return null;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

const apiGet = (endpoint) => api(endpoint);
const apiPost = (endpoint, data) => api(endpoint, { method: 'POST', body: JSON.stringify(data) });
const apiPut = (endpoint, data) => api(endpoint, { method: 'PUT', body: JSON.stringify(data) });
const apiDelete = (endpoint) => api(endpoint, { method: 'DELETE' });

// ===== UTILS =====
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return { day: '-', month: '-' };
    const d = new Date(dateStr + 'T12:00:00');
    return {
        day: d.getDate(),
        month: d.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()
    };
}

function getDateValue(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

function formatDuration(seconds) {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

// ===== UI HELPERS =====
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function animateNumber(el, target, duration = 600) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
        m.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ===== USER INFO =====
function setupUserInfo() {
    const user = getUser();
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
    const initial = (user.first_name || 'U').charAt(0).toUpperCase();
    const roleText = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
    
    // Desktop nav profile
    const navName = document.getElementById('navUserName');
    const navRole = document.getElementById('navUserRole');
    const navAvatar = document.getElementById('navUserAvatar');
    if (navName) navName.textContent = name;
    if (navRole) navRole.textContent = roleText;
    if (navAvatar) navAvatar.textContent = initial;
    
    // Mobile header avatar
    const headerAvatar = document.getElementById('headerUserAvatar');
    if (headerAvatar) headerAvatar.textContent = initial;
    
    // Admin only elements
    if (!isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    if (!isSuperAdmin()) {
        document.querySelectorAll('.super-admin-only').forEach(el => el.style.display = 'none');
    }
}

// ===== SONG PICKER (Global) =====
let allSongsCache = [];
let selectedSongsForPicker = [];
let songPickerCallback = null;

async function loadSongsCache(force = false) {
    if (allSongsCache.length === 0 || force) {
        allSongsCache = await apiGet('/songs') || [];
    }
    return allSongsCache;
}

function refreshSongsCache() { allSongsCache = []; }

async function openSongPicker(selectedIds = [], callback = null) {
    selectedSongsForPicker = [...selectedIds];
    songPickerCallback = callback;
    await loadSongsCache();
    renderSongPicker();
    openModal('songPickerModal');
}

function renderSongPicker(filter = '') {
    const container = document.getElementById('songPickerList');
    if (!container) return;
    
    let songs = allSongsCache;
    if (filter) {
        const f = filter.toLowerCase();
        songs = songs.filter(s => 
            s.name?.toLowerCase().includes(f) || 
            s.artist?.toLowerCase().includes(f)
        );
    }
    
    if (!songs.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">No hay canciones</p></div>';
        return;
    }
    
    container.innerHTML = songs.map(s => `
        <div class="song-picker-item ${selectedSongsForPicker.includes(s.id) ? 'selected' : ''}" onclick="toggleSongPicker(${s.id})">
            <div class="checkbox">${selectedSongsForPicker.includes(s.id) ? '✓' : ''}</div>
            <div class="song-info">
                <div class="song-title">${s.name}</div>
                <div class="song-artist">${s.artist || 'Sin artista'}</div>
            </div>
            ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
        </div>
    `).join('');
}

function toggleSongPicker(id) {
    const idx = selectedSongsForPicker.indexOf(id);
    if (idx === -1) {
        selectedSongsForPicker.push(id);
    } else {
        selectedSongsForPicker.splice(idx, 1);
    }
    renderSongPicker(document.getElementById('songPickerSearch')?.value || '');
}

function filterSongPicker() {
    const val = document.getElementById('songPickerSearch')?.value || '';
    renderSongPicker(val);
}

function confirmSongPicker() {
    if (songPickerCallback) {
        songPickerCallback(selectedSongsForPicker);
    }
    closeModal('songPickerModal');
}

// ===== QUICK ADD SONG =====
async function openQuickAddSong(callback = null) {
    window.quickAddCallback = callback;
    document.getElementById('quickSongName').value = '';
    document.getElementById('quickSongArtist').value = '';
    openModal('quickAddSongModal');
    document.getElementById('quickSongName').focus();
}

async function saveQuickSong() {
    const name = document.getElementById('quickSongName').value.trim();
    const artist = document.getElementById('quickSongArtist').value.trim();
    
    if (!name) {
        showToast('Ingresa el nombre');
        return;
    }
    
    try {
        const newSong = await apiPost('/songs', { name, artist });
        refreshSongsCache();
        await loadSongsCache(true);
        closeModal('quickAddSongModal');
        showToast('Canción creada');
        
        if (window.quickAddCallback) {
            window.quickAddCallback(newSong);
        }
    } catch (e) {
        showToast('Error al crear');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
