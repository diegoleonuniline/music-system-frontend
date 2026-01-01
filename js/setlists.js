checkAuth();
setupUserInfo();

let allSetlists = [];
let allSongs = [];
let currentSetlist = null;
let viewMode = 'cards';

async function loadSetlists() {
    try {
        [allSetlists, allSongs] = await Promise.all([
            apiGet('/setlists'),
            apiGet('/songs')
        ]);
        renderSetlists();
    } catch (error) {
        console.error('Error:', error);
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(mode === 'cards' ? 'tarjeta' : 'tabla'));
    });
    renderSetlists();
}

function renderSetlists() {
    const container = document.getElementById('setlistsContainer');

    if (!allSetlists?.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>Sin set lists</h3>
                <p>Crea tu primer set list</p>
            </div>
        `;
        return;
    }

    if (viewMode === 'table') {
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Canciones</th>
                            <th>Duración</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allSetlists.map(s => `
                            <tr>
                                <td><strong>${s.name}</strong></td>
                                <td>${s.total_songs || 0}</td>
                                <td>${formatDuration(s.total_duration_seconds)}</td>
                                <td>
                                    <button class="btn btn-ghost btn-sm" onclick="viewSetlist(${s.id})">Ver</button>
                                    ${isAdmin() ? `
                                        <button class="btn btn-ghost btn-sm" onclick="editSetlist(${s.id})">✏️</button>
                                        <button class="btn btn-ghost btn-sm" onclick="deleteSetlist(${s.id})">🗑️</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        container.innerHTML = `<div class="setlist-grid">${allSetlists.map(s => `
            <div class="setlist-card" onclick="viewSetlist(${s.id})">
                <div class="icon">📋</div>
                <h4>${s.name}</h4>
                <div class="meta">
                    <span>${s.total_songs || 0} canciones</span>
                    <span>${formatDuration(s.total_duration_seconds)}</span>
                </div>
                ${isAdmin() ? `
                    <div class="actions" onclick="event.stopPropagation();">
                        <button class="btn btn-ghost btn-sm" onclick="editSetlist(${s.id})">Editar</button>
                        <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="deleteSetlist(${s.id})">Eliminar</button>
                    </div>
                ` : ''}
            </div>
        `).join('')}</div>`;
    }
}

async function viewSetlist(id) {
    try {
        currentSetlist = await apiGet(`/setlists/${id}`);
        document.getElementById('viewSetlistTitle').textContent = currentSetlist.name;
        document.getElementById('viewTotalSongs').textContent = (currentSetlist.songs?.length || 0) + ' canciones';
        document.getElementById('viewTotalDuration').textContent = formatDuration(currentSetlist.total_duration_seconds);
        renderSetlistSongs();
        document.getElementById('viewSetlistModal').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSetlistSongs() {
    const container = document.getElementById('setlistSongs');

    if (!currentSetlist.songs?.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎵</div>
                <h3>Sin canciones</h3>
            </div>
        `;
        return;
    }

    container.innerHTML = currentSetlist.songs.map((s, index) => `
        <div class="song-item">
            <span style="font-weight: 600; color: var(--text-tertiary); width: 24px;">${s.position}</span>
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}${s.musical_key ? ' · ' + s.musical_key : ''}</p>
            </div>
            <span class="badge badge-neutral">${formatDuration(s.duration_seconds)}</span>
            ${isAdmin() ? `
                <div class="song-actions">
                    <button class="btn btn-ghost btn-sm" onclick="removeSongFromSetlist(${s.id})">✕</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// RUTA CORRECTA: POST /setlists/:id/songs
async function addSongToSetlist(songId) {
    try {
        await apiPost(`/setlists/${currentSetlist.id}/songs`, { song_id: songId });
        viewSetlist(currentSetlist.id);
        filterAvailableSongs();
        loadSetlists();
        showToast('Canción agregada');
    } catch (error) {
        console.error('Error adding song:', error);
        showToast('Error al agregar canción');
    }
}

async function removeSongFromSetlist(setlistSongId) {
    if (confirm('¿Quitar esta canción del set list?')) {
        await apiDelete(`/setlists/${currentSetlist.id}/songs/${setlistSongId}`);
        viewSetlist(currentSetlist.id);
        loadSetlists();
        showToast('Canción quitada');
    }
}

function openAddSongModal() {
    document.getElementById('searchSongInput').value = '';
    filterAvailableSongs();
    document.getElementById('addSongModal').classList.add('active');
}

function closeAddSongModal() {
    document.getElementById('addSongModal').classList.remove('active');
}

function filterAvailableSongs() {
    const search = document.getElementById('searchSongInput').value.toLowerCase();
    const setlistSongIds = currentSetlist.songs?.map(s => s.song_id) || [];

    const available = (allSongs || []).filter(s =>
        !setlistSongIds.includes(s.id) &&
        (s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search))
    );

    const container = document.getElementById('availableSongs');
    container.innerHTML = available.length ? available.map(s => `
        <div class="song-item">
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="addSongToSetlist(${s.id})">Agregar</button>
        </div>
    `).join('') : '<div class="empty-state"><p>No hay canciones disponibles</p></div>';
}

function openStageMode() {
    document.getElementById('stageModeTitle').textContent = currentSetlist.name;

    const content = document.getElementById('stageModeContent');
    content.innerHTML = currentSetlist.songs?.map(s => `
        <div class="stage-song">
            <div class="stage-song-header">
                <div>
                    <span class="stage-song-number">${s.position}.</span>
                    <span class="stage-song-title">${s.name}</span>
                    <div class="stage-song-artist">${s.artist || ''}</div>
                </div>
                <div class="stage-song-badges">
                    ${s.musical_key ? `<span class="stage-badge key">${s.musical_key}</span>` : ''}
                    ${s.bpm ? `<span class="stage-badge bpm">${s.bpm} BPM</span>` : ''}
                </div>
            </div>
            ${s.lyrics ? `<pre class="stage-lyrics">${s.lyrics}</pre>` : ''}
        </div>
    `).join('') || '<div class="empty-state" style="color: #fff;"><p>Sin canciones</p></div>';

    document.getElementById('stageModeModal').classList.add('active');
}

function closeStageMode() {
    document.getElementById('stageModeModal').classList.remove('active');
}

function closeViewModal() {
    document.getElementById('viewSetlistModal').classList.remove('active');
}

function openSetlistModal(setlist = null) {
    document.getElementById('setlistModalTitle').textContent = setlist ? 'Editar Set List' : 'Nuevo Set List';
    document.getElementById('setlistId').value = setlist?.id || '';
    document.getElementById('setlistName').value = setlist?.name || '';
    document.getElementById('setlistDescription').value = setlist?.description || '';
    document.getElementById('setlistModal').classList.add('active');
}

function closeSetlistModal() {
    document.getElementById('setlistModal').classList.remove('active');
}

function editSetlist(id) {
    const setlist = allSetlists.find(s => s.id === id);
    openSetlistModal(setlist);
}

async function saveSetlist() {
    const id = document.getElementById('setlistId').value;
    const data = {
        name: document.getElementById('setlistName').value,
        description: document.getElementById('setlistDescription').value
    };

    if (id) {
        await apiPut(`/setlists/${id}`, data);
    } else {
        await apiPost('/setlists', data);
    }

    closeSetlistModal();
    loadSetlists();
    showToast('Set list guardado');
}

async function deleteSetlist(id) {
    if (confirm('¿Eliminar este set list?')) {
        await apiDelete(`/setlists/${id}`);
        loadSetlists();
        showToast('Set list eliminado');
    }
}

loadSetlists();
