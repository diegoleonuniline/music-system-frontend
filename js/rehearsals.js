checkAuth();
setupUserInfo();

let allSongs = [];
let rehearsals = [];
let currentRehearsal = null;

async function loadData() {
    try {
        const [songsRes, rehearsalsRes] = await Promise.all([
            apiGet('/songs'),
            apiGet('/rehearsals')
        ]);
        
        allSongs = Array.isArray(songsRes) ? songsRes : (songsRes?.data || []);
        rehearsals = Array.isArray(rehearsalsRes) ? rehearsalsRes : (rehearsalsRes?.data || []);
        
        console.log('Songs:', allSongs);
        console.log('Rehearsals:', rehearsals);
        
        renderRehearsals();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        rehearsals = [];
        renderRehearsals();
        updateStats();
    }
}

async function saveRehearsal(data) {
    try {
        if (data.id) {
            await apiPut(`/rehearsals/${data.id}`, data);
        } else {
            await apiPost('/rehearsals', data);
        }
        showToast('Guardado');
    } catch (e) {
        console.error('Error guardando:', e);
        showToast('Error al guardar');
    }
    loadData();
}

async function deleteRehearsal(id) {
    try {
        await apiDelete(`/rehearsals/${id}`);
        showToast('Eliminado');
    } catch (e) {
        console.error('Error eliminando:', e);
    }
    loadData();
}

function updateStats() {
    const total = rehearsals.length;
    const pending = rehearsals.filter(r => r.status === 'pending').length;
    const inProgress = rehearsals.filter(r => r.status === 'in_progress').length;
    const ready = rehearsals.filter(r => r.status === 'ready').length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statLearning').textContent = inProgress;
    document.getElementById('statReady').textContent = ready;
}

function renderRehearsals() {
    const container = document.getElementById('rehearsalsList');

    if (!rehearsals || !rehearsals.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎸</div>
                <h3>Sin canciones para ensayar</h3>
                <p>Agrega canciones que necesites practicar</p>
            </div>
        `;
        return;
    }

    const sorted = [...rehearsals].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] || 1) - (order[b.priority] || 1);
    });

    container.innerHTML = sorted.map(r => {
        const songId = r.song_id || r.songId;
        const song = allSongs.find(s => s.id === songId);
        if (!song) return '';
        
        const targetDate = r.target_date || r.targetDate;
        const daysLeft = targetDate ? getDaysUntil(targetDate) : null;
        const isOverdue = daysLeft !== null && daysLeft < 0;
        const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
        
        let daysText = '';
        if (daysLeft !== null && !isNaN(daysLeft)) {
            if (isOverdue) daysText = `Vencida (${Math.abs(daysLeft)} días)`;
            else if (daysLeft === 0) daysText = 'Hoy';
            else if (daysLeft === 1) daysText = 'Mañana';
            else daysText = `${daysLeft} días`;
        }
        
        return `
            <div class="song-item" style="flex-wrap: wrap; gap: 8px;">
                <div class="song-thumb" style="background: ${getPriorityColor(r.priority)};">
                    ${r.priority === 'high' ? '🔥' : r.priority === 'medium' ? '⚡' : '📌'}
                </div>
                <div class="song-info" style="flex: 1; min-width: 150px;">
                    <h4>${song.name}</h4>
                    <p>${song.artist || 'Sin artista'}${song.musical_key ? ' · ' + song.musical_key : ''}</p>
                    ${daysText ? `
                        <small style="color: ${isOverdue ? 'var(--danger)' : isUrgent ? 'var(--warning)' : 'var(--text-tertiary)'};">
                            📅 ${daysText}
                        </small>
                    ` : ''}
                    ${r.notes ? `<small style="color: var(--text-tertiary); display: block;">📝 ${r.notes.substring(0, 30)}${r.notes.length > 30 ? '...' : ''}</small>` : ''}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    ${song.video_url ? `<a href="${song.video_url}" target="_blank" class="btn btn-ghost btn-sm" title="Ver video">🎬</a>` : ''}
                    <select onchange="quickUpdateStatus(${r.id}, this.value)" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); font-size: 13px; background: var(--bg-secondary);">
                        <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                        <option value="in_progress" ${r.status === 'in_progress' ? 'selected' : ''}>Aprendiendo</option>
                        <option value="ready" ${r.status === 'ready' ? 'selected' : ''}>Lista ✓</option>
                    </select>
                    <button class="btn btn-ghost btn-sm" onclick="openEditModal(${r.id})" title="Editar">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="confirmRemove(${r.id})" title="Quitar">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    // Manejar formato YYYY-MM-DD o ISO
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function getPriorityColor(priority) {
    if (priority === 'high') return 'linear-gradient(135deg, #EF4444, #DC2626)';
    if (priority === 'medium') return 'linear-gradient(135deg, #F59E0B, #D97706)';
    return 'linear-gradient(135deg, #6B7280, #4B5563)';
}

async function quickUpdateStatus(id, status) {
    const item = rehearsals.find(r => r.id === id);
    if (item) {
        await saveRehearsal({ ...item, status });
    }
}

function confirmRemove(id) {
    if (confirm('¿Quitar del repertorio de ensayo?')) {
        deleteRehearsal(id);
    }
}

// ===== MODAL AGREGAR =====
function openAddModal() {
    document.getElementById('searchSongInput').value = '';
    filterAvailableSongs();
    document.getElementById('addModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
}

function filterAvailableSongs() {
    const search = document.getElementById('searchSongInput').value.toLowerCase();
    const rehearsalSongIds = rehearsals.map(r => r.song_id || r.songId);

    const available = allSongs.filter(s =>
        !rehearsalSongIds.includes(s.id) &&
        (s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search))
    );

    const container = document.getElementById('availableSongs');
    container.innerHTML = available.length ? available.map(s => `
        <div class="song-item">
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}${s.musical_key ? ' · ' + s.musical_key : ''}</p>
            </div>
            ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-ghost btn-sm">🎬</a>` : ''}
            <button class="btn btn-primary btn-sm" onclick="selectSongToAdd(${s.id})">+ Agregar</button>
        </div>
    `).join('') : '<div class="empty-state"><p>No hay más canciones disponibles</p></div>';
}

function selectSongToAdd(songId) {
    const song = allSongs.find(s => s.id === songId);
    closeAddModal();
    
    currentRehearsal = {
        song_id: songId,
        priority: 'medium',
        status: 'pending',
        target_date: null,
        notes: ''
    };
    
    document.getElementById('editModalTitle').textContent = 'Agregar a Ensayos';
    document.getElementById('editSongName').textContent = song.name;
    document.getElementById('editSongArtist').textContent = song.artist || 'Sin artista';
    document.getElementById('editVideoBtn').style.display = song.video_url ? 'inline-flex' : 'none';
    document.getElementById('editVideoBtn').onclick = () => window.open(song.video_url, '_blank');
    
    document.getElementById('editPriority').value = 'medium';
    document.getElementById('editStatus').value = 'pending';
    document.getElementById('editTargetDate').value = '';
    document.getElementById('editNotes').value = '';
    
    document.getElementById('editModal').classList.add('active');
}

// ===== MODAL EDITAR =====
function openEditModal(id) {
    const r = rehearsals.find(x => x.id === id);
    if (!r) return;
    
    currentRehearsal = { ...r };
    const songId = r.song_id || r.songId;
    const song = allSongs.find(s => s.id === songId);
    
    document.getElementById('editModalTitle').textContent = 'Editar Canción';
    document.getElementById('editSongName').textContent = song?.name || 'Canción';
    document.getElementById('editSongArtist').textContent = song?.artist || 'Sin artista';
    document.getElementById('editVideoBtn').style.display = song?.video_url ? 'inline-flex' : 'none';
    if (song?.video_url) {
        document.getElementById('editVideoBtn').onclick = () => window.open(song.video_url, '_blank');
    }
    
    document.getElementById('editPriority').value = r.priority || 'medium';
    document.getElementById('editStatus').value = r.status || 'pending';
    
    // Formatear fecha para input date
    const targetDate = r.target_date || r.targetDate;
    document.getElementById('editTargetDate').value = targetDate ? targetDate.split('T')[0] : '';
    document.getElementById('editNotes').value = r.notes || '';
    
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentRehearsal = null;
}

async function saveEdit() {
    if (!currentRehearsal) return;
    
    const targetDate = document.getElementById('editTargetDate').value;
    
    currentRehearsal.priority = document.getElementById('editPriority').value;
    currentRehearsal.status = document.getElementById('editStatus').value;
    currentRehearsal.target_date = targetDate || null;
    currentRehearsal.notes = document.getElementById('editNotes').value.trim() || null;
    
    console.log('Guardando:', currentRehearsal);
    
    await saveRehearsal(currentRehearsal);
    closeEditModal();
}

loadData();
