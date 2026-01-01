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
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

    let filtered = allRehearsals.filter(r => r.status !== 'ready');

    if (priorityFilter) {
        filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    const container = document.getElementById('rehearsalsList');

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎸</div>
                <h3>Sin canciones por ensayar</h3>
                <p>Agrega canciones para practicar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(r => `
        <div class="song-item priority-${r.priority}">
            <span style="font-size: 16px;">${r.priority === 'high' ? '🔴' : r.priority === 'medium' ? '🟡' : '🟢'}</span>
            <div class="song-info">
                <h4>${r.song_name}</h4>
                <p>${r.artist || 'Sin artista'}${r.notes ? ' · ' + r.notes : ''}</p>
            </div>
            <div class="song-meta">
                <span class="badge ${r.status === 'pending' ? 'badge-neutral' : 'badge-primary'}">
                    ${r.status === 'pending' ? 'Pendiente' : 'En progreso'}
                </span>
                ${r.target_date ? `<span class="badge badge-neutral">${formatDate(r.target_date)}</span>` : ''}
            </div>
            ${isAdmin ? `
                <div class="song-actions" style="opacity: 1;">
                    ${r.status === 'pending' ? `
                        <button class="btn btn-ghost btn-sm" onclick="updateStatus(${r.id}, 'in_progress')">▶ Iniciar</button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="moveToRepertoire(${r.id})">✅ Lista</button>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteRehearsal(${r.id})">×</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function renderReadyList() {
    const ready = allRehearsals.filter(r => r.status === 'ready');
    const container = document.getElementById('readyList');

    if (!ready.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Las canciones listas aparecerán aquí</p>
            </div>
        `;
        return;
    }

    container.innerHTML = ready.slice(0, 10).map(r => `
        <div class="song-item" style="opacity: 0.7;">
            <span>✅</span>
            <div class="song-info">
                <h4>${r.song_name}</h4>
                <p>${r.artist || 'Sin artista'} · Lista el ${formatDate(r.moved_to_repertoire_at)}</p>
            </div>
        </div>
    `).join('');
}

async function updateStatus(id, status) {
    await apiPatch(`/rehearsals/${id}/status`, { status });
    loadData();
}

async function moveToRepertoire(id) {
    await apiPost(`/rehearsals/${id}/move-to-repertoire`);
    loadData();
}

async function deleteRehearsal(id) {
    if (confirm('¿Eliminar de ensayos?')) {
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
    `).join('') : '<div class="empty-state"><p>Sin canciones disponibles</p></div>';
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
