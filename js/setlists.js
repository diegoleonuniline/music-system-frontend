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
    renderStageMode();
    document.getElementById('stageModeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderStageMode() {
    const songs = currentSetlist.songs || [];
    const container = document.getElementById('stageModeContent');

    if (!songs.length) {
        container.innerHTML = '<div class="empty-state" style="color:#fff;"><div class="icon">🎵</div><h3>Sin canciones</h3></div>';
        return;
    }

    container.innerHTML = songs.map((s, idx) => `
        <div class="stage-song" id="stage-song-${idx}">
            <div class="stage-song-header">
                <div class="stage-song-left">
                    <span class="stage-song-number">${idx + 1}.</span>
                    <div>
                        <div class="stage-song-title">${s.name}</div>
                        <div class="stage-song-artist">${s.artist || ''}</div>
                    </div>
                </div>
                <div class="stage-song-badges">
                    ${s.musical_key ? `<span class="stage-badge">${s.musical_key}</span>` : ''}
                    ${s.bpm ? `<span class="stage-badge">${s.bpm} BPM</span>` : ''}
                </div>
            </div>
            <div class="stage-controls">
                <button class="stage-btn" onclick="moveSongStage(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>⬆️ Subir</button>
                <button class="stage-btn" onclick="moveSongStage(${idx}, 1)" ${idx === songs.length - 1 ? 'disabled' : ''}>⬇️ Bajar</button>
                ${s.lyrics ? `<button class="stage-btn" onclick="toggleLyrics(${idx})">📄 Letra</button>` : ''}
                <button class="stage-btn danger" onclick="removeSongStage(${idx})">✕ Quitar</button>
            </div>
            <div class="stage-lyrics" id="lyrics-${idx}" style="display: none;">
                <pre>${s.lyrics || ''}</pre>
            </div>
        </div>
    `).join('') + `
        <div style="text-align: center; padding: 20px;">
            <button class="btn btn-primary" onclick="openAddSongFromStage()">+ Agregar canción</button>
        </div>
    `;
}

function toggleLyrics(idx) {
    const el = document.getElementById(`lyrics-${idx}`);
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function moveSongStage(idx, direction) {
    const songs = currentSetlist.songs;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= songs.length) return;

    [songs[idx], songs[newIdx]] = [songs[newIdx], songs[idx]];

    try {
        const order = songs.map((s, i) => ({ song_id: s.song_id || s.id, position: i + 1 }));
        await apiPut(`/setlists/${currentSetlist.id}/songs/reorder`, { songs: order });
        songs.forEach((s, i) => s.position = i + 1);
        renderStageMode();
        showToast('Orden actualizado');
    } catch (error) {
        [songs[idx], songs[newIdx]] = [songs[newIdx], songs[idx]];
        showToast('Error al mover');
    }
}

async function removeSongStage(idx) {
    const song = currentSetlist.songs[idx];
    if (!confirm(`¿Quitar "${song.name}"?`)) return;

    try {
        await apiDelete(`/setlists/${currentSetlist.id}/songs/${song.id}`);
        currentSetlist.songs.splice(idx, 1);
        renderStageMode();
        loadSetlists();
        showToast('Canción quitada');
    } catch (error) {
        showToast('Error al quitar');
    }
}

function openAddSongFromStage() {
    closeStageMode();
    setTimeout(() => openAddSongModal(), 100);
}

function closeStageMode() {
    document.getElementById('stageModeModal').classList.remove('active');
    document.body.style.overflow = '';
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
