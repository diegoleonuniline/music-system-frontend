checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

let allRehearsals = [];
let allSongs = [];

async function loadData() {
    try {
        [allRehearsals, allSongs] = await Promise.all([
            apiGet('/rehearsals'),
            apiGet('/songs')
        ]);
        updateStats();
        renderRehearsals();
        renderReadyList();
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateStats() {
    const pending = allRehearsals.filter(r => r.status !== 'ready');
    document.getElementById('highCount').textContent = pending.filter(r => r.priority === 'high').length;
    document.getElementById('mediumCount').textContent = pending.filter(r => r.priority === 'medium').length;
    document.getElementById('lowCount').textContent = pending.filter(r => r.priority === 'low').length;
    document.getElementById('readyCount').textContent = allRehearsals.filter(r => r.status === 'ready').length;
}

function renderRehearsals() {
    const priorityFilter = document.getElementById('filterPriority').value;
    const statusFilter = document.getElementById('filterRehStatus').value;
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

    let filtered = allRehearsals.filter(r => r.status !== 'ready');

    if (priorityFilter) {
        filtered = filtered.filter(r => r.priority === priorityFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
    }

    const container = document.getElementById('rehearsalsList');

    if (!filtered.length) {
        container.innerHTML = '<p>No hay canciones por ensayar</p>';
        return;
    }

    container.innerHTML = filtered.map(r => `
        <div class="song-item" style="border-left: 4px solid ${r.priority === 'high' ? 'var(--danger)' : r.priority === 'medium' ? 'var(--warning)' : 'var(--secondary)'};">
            <div style="width: 30px; text-align: center;">
                ${r.priority === 'high' ? '🔴' : r.priority === 'medium' ? '🟡' : '🟢'}
            </div>
            <div class="song-info">
                <h4>${r.song_name}</h4>
                <p>${r.artist || 'Sin artista'}</p>
                ${r.notes ? `<small style="color: var(--gray);">📝 ${r.notes}</small>` : ''}
            </div>
            <div>
                <span class="badge ${r.status === 'pending' ? 'badge-warning' : 'badge-primary'}">
                    ${r.status === 'pending' ? 'Pendiente' : 'En progreso'}
                </span>
                ${r.target_date ? `<br><small>📅 ${formatDate(r.target_date)}</small>` : ''}
            </div>
            ${isAdmin ? `
                <div class="song-actions">
                    ${r.status === 'pending' ? `
                        <button class="btn btn-sm btn-primary" onclick="updateStatus(${r.id}, 'in_progress')" title="Marcar en progreso">▶️</button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="moveToRepertoire(${r.id})" title="Pasar a repertorio">✅</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRehearsal(${r.id})" title="Eliminar">🗑️</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function renderReadyList() {
    const ready = allRehearsals.filter(r => r.status === 'ready');
    const container = document.getElementById('readyList');

    if (!ready.length) {
        container.innerHTML = '<p>No hay canciones listas aún</p>';
        return;
    }

    container.innerHTML = ready.slice(0, 10).map(r => `
        <div class="song-item" style="opacity: 0.7;">
            <div style="width: 30px; text-align: center;">✅</div>
            <div class="song-info">
                <h4>${r.song_name}</h4>
                <p>${r.artist || 'Sin artista'}</p>
            </div>
            <div>
                <small style="color: var(--gray);">Listo el ${formatDate(r.moved_to_repertoire_at)}</small>
            </div>
        </div>
    `).join('');
}

async function updateStatus(id, status) {
    await apiPatch(`/rehearsals/${id}/status`, { status });
    loadData();
}

async function moveToRepertoire(id) {
    if (confirm('¿Marcar esta canción como lista y pasarla a repertorio?')) {
        await apiPost(`/rehearsals/${id}/move-to-repertoire`);
        loadData();
    }
}

async function deleteRehearsal(id) {
    if (confirm('¿Eliminar de la lista de ensayos?')) {
        await apiDelete(`/rehearsals/${id}`);
        loadData();
    }
}

function openModal() {
    document.getElementById('searchSongInput').value = '';
    document.getElementById('selectedSongId').value = '';
    document.getElementById('selectedSongInfo').style.display = 'none';
    document.getElementById('rehearsalPriority').value = 'medium';
    document.getElementById('rehearsalTargetDate').value = '';
    document.getElementById('rehearsalNotes').value = '';
    filterAvailableSongs();
    document.getElementById('rehearsalModal').classList.add('active');
}

function closeModal() {
    document.getElementById('rehearsalModal').classList.remove('active');
}

function filterAvailableSongs() {
    const search = document.getElementById('searchSongInput').value.toLowerCase();
    const rehearsalSongIds = allRehearsals.filter(r => r.status !== 'ready').map(r => r.song_id);

    const available = allSongs.filter(s =>
        !rehearsalSongIds.includes(s.id) &&
        (s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search))
    );

    const container = document.getElementById('availableSongs');
    container.innerHTML = available.length ? available.slice(0, 20).map(s => `
        <div class="song-item" style="cursor: pointer;" onclick="selectSong(${s.id}, '${s.name.replace(/'/g, "\\'")}')">
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}</p>
            </div>
        </div>
    `).join('') : '<p>No hay canciones disponibles</p>';
}

function selectSong(id, name) {
    document.getElementById('selectedSongId').value = id;
    document.getElementById('selectedSongName').textContent = name;
    document.getElementById('selectedSongInfo').style.display = 'block';
}

async function saveRehearsal() {
    const songId = document.getElementById('selectedSongId').value;
    
    if (!songId) {
        alert('Selecciona una canción');
        return;
    }

    const data = {
        song_id: parseInt(songId),
        priority: document.getElementById('rehearsalPriority').value,
        target_date: document.getElementById('rehearsalTargetDate').value || null,
        notes: document.getElementById('rehearsalNotes').value
    };

    await apiPost('/rehearsals', data);
    closeModal();
    loadData();
}

loadData();
