// ===== AUTH =====
const getToken = () => localStorage.getItem('token');
const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');
const isAdmin = () => ['super_admin', 'group_admin'].includes(getUser().role);

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.href = '../index.html';
}

function checkAuth() {
    if (!getToken()) location.href = '../index.html';
}

// ===== THEME =====
function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const metaTheme = document.getElementById('themeColor');
    if (metaTheme) {
        metaTheme.content = theme === 'dark' ? '#000000' : '#ffffff';
    }
    
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
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
        
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

const apiGet = (endpoint) => api(endpoint);
const apiPost = (endpoint, data) => api(endpoint, { method: 'POST', body: JSON.stringify(data) });
const apiPut = (endpoint, data) => api(endpoint, { method: 'PUT', body: JSON.stringify(data) });
const apiPatch = (endpoint, data) => api(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
const apiDelete = (endpoint) => api(endpoint, { method: 'DELETE' });

// ===== UTILS =====
function formatDuration(sec) {
    if (!sec) return '-';
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function formatDate(str) {
    if (!str) return '';
    const [y, m, d] = str.split('T')[0].split('-');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function getDateValue(str) {
    return str ? str.split('T')[0] : '';
}

function getMonthName(m) {
    return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][m];
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
    const start = performance.now();
    const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
    };
    requestAnimationFrame(update);
}

// ===== MODAL HELPERS =====
function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// ===== SONG PICKER GLOBAL =====
let allSongsCache = [];
let songPickerCallback = null;

async function loadSongsCache() {
    if (allSongsCache.length === 0) {
        allSongsCache = await apiGet('/songs') || [];
    }
    return allSongsCache;
}

function refreshSongsCache() {
    allSongsCache = [];
}

async function openSongPicker(selectedIds = [], callback) {
    songPickerCallback = callback;
    const songs = await loadSongsCache();
    
    const overlay = document.getElementById('songPickerModal');
    const list = document.getElementById('songPickerList');
    
    list.innerHTML = songs.map(s => `
        <div class="song-picker-item ${selectedIds.includes(s.id) ? 'selected' : ''}" data-id="${s.id}" onclick="toggleSongSelection(this)">
            <div class="checkbox">${selectedIds.includes(s.id) ? '✓' : ''}</div>
            <div class="song-thumb">🎵</div>
            <div class="song-info">
                <div class="song-title">${s.name}</div>
                <div class="song-artist">${s.artist || 'Sin artista'}</div>
            </div>
        </div>
    `).join('') || '<div class="empty-state"><p>No hay canciones</p></div>';
    
    openModal('songPickerModal');
}

function toggleSongSelection(el) {
    el.classList.toggle('selected');
    const checkbox = el.querySelector('.checkbox');
    checkbox.textContent = el.classList.contains('selected') ? '✓' : '';
}

function confirmSongSelection() {
    const selected = [...document.querySelectorAll('#songPickerList .song-picker-item.selected')]
        .map(el => parseInt(el.dataset.id));
    
    if (songPickerCallback) {
        songPickerCallback(selected);
    }
    
    closeModal('songPickerModal');
}

// ===== QUICK ADD SONG =====
async function openQuickAddSong() {
    openModal('quickAddSongModal');
}

async function saveQuickSong() {
    const name = document.getElementById('quickSongName').value.trim();
    const artist = document.getElementById('quickSongArtist').value.trim();
    
    if (!name) {
        showToast('Escribe el nombre de la canción');
        return;
    }
    
    try {
        await apiPost('/songs', { name, artist });
        refreshSongsCache();
        closeModal('quickAddSongModal');
        document.getElementById('quickSongName').value = '';
        document.getElementById('quickSongArtist').value = '';
        showToast('Canción agregada');
        
        if (typeof loadData === 'function') {
            loadData();
        }
    } catch (e) {
        showToast('Error al guardar');
    }
}

// ===== INIT COMMON =====
function initApp() {
    initTheme();
    
    const user = getUser();
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    
    if (avatarEl) avatarEl.textContent = user.first_name?.charAt(0) || 'U';
    if (nameEl) nameEl.textContent = user.first_name || 'Usuario';
}

// Init on load
document.addEventListener('DOMContentLoaded', initTheme);
