checkAuth();
setupUserInfo();

let allSetlists = [];
let currentSetlist = null;
let selectedSongsForSetlist = [];

async function loadSetlists() {
    try {
        allSetlists = await apiGet('/setlists') || [];
        renderSetlists();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSetlists() {
    const container = document.getElementById('setlistsList');
    
    if (!allSetlists.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">Sin set lists</div>
                <div class="empty-text">Crea tu primer set list</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allSetlists.map(s => `
        <div class="setlist-item" onclick="viewSetlist(${s.id})">
            <div class="setlist-icon">📋</div>
            <div class="setlist-info">
                <div class="setlist-title">${s.name}</div>
                <div class="setlist-meta">${s.song_count || 0} canciones · ${s.total_duration ? formatDuration(s.total_duration) : '0:00'}</div>
            </div>
            <span style="color: var(--text-tertiary);">›</span>
        </div>
    `).join('');
}

// ===== VIEW SETLIST =====
async function viewSetlist(id) {
    currentSetlist = await apiGet(`/setlists/${id}`);
    if (!currentSetlist) return;

    document.getElementById('viewSetlistTitle').textContent = currentSetlist.name;
    
    const songs = currentSetlist.songs || [];
    const totalDuration = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    document.getElementById('viewSetlistContent').innerHTML = `
        <p class="text-muted" style="margin-bottom: var(--space-lg);">${currentSetlist.description || ''}</p>
        
        <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-lg);">
            <span class="badge badge-primary">${songs.length} canciones</span>
            <span class="badge badge-gray">${formatDuration(totalDuration)}</span>
        </div>
        
        <!-- Quick add -->
        <div class="quick-add-trigger admin-only" onclick="openSongPickerForSetlist()">
            <div class="icon">+</div>
            <span>Agregar canciones</span>
        </div>
        
        ${songs.length ? `
            <div style="margin-top: var(--space-md);">
                ${songs.map((s, i) => `
                    <div class="song-item">
                        <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">${i + 1}</div>
                        <div class="song-info">
                            <div class="song-title">${s.name}</div>
                            <div class="song-artist">${s.artist || 'Sin artista'}</div>
                        </div>
                        <div class="song-badges">
                            ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
                        </div>
                        <button class="btn btn-ghost btn-sm admin-only" onclick="event.stopPropagation(); removeSongFromSetlist(${s.id})" style="color: var(--red);">✕</button>
                    </div>
                `).join('')}
            </div>
        ` : '<p class="text-muted text-center">Sin canciones aún</p>'}
        
        <div style="margin-top: var(--space-xl); display: flex; gap: var(--space-sm);" class="admin-only">
            <button class="btn btn-secondary btn-sm" onclick="editSetlist()">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSetlist(${currentSetlist.id})">🗑️ Eliminar</button>
        </div>
    `;
    
    openModal('viewSetlistModal');
}

// ===== SONG PICKER =====
async function openSongPickerForSetlist() {
    const currentSongs = currentSetlist.songs || [];
    selectedSongsForSetlist = currentSongs.map(s => s.id);
    await loadSongsCache();
    renderSetlistSongPicker();
    openModal('songPickerModal');
}

function renderSetlistSongPicker(filter = '') {
    const container = document.getElementById('songPickerList');
    
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
        <div class="song-picker-item ${selectedSongsForSetlist.includes(s.id) ? 'selected' : ''}" onclick="toggleSetlistSong(${s.id})">
            <div class="checkbox">${selectedSongsForSetlist.includes(s.id) ? '✓' : ''}</div>
            <div class="song-info">
                <div class="song-title">${s.name}</div>
                <div class="song-artist">${s.artist || 'Sin artista'}</div>
            </div>
            ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
        </div>
    `).join('');
}

function toggleSetlistSong(id) {
    const idx = selectedSongsForSetlist.indexOf(id);
    if (idx === -1) {
        selectedSongsForSetlist.push(id);
    } else {
        selectedSongsForSetlist.splice(idx, 1);
    }
    renderSetlistSongPicker(document.getElementById('songPickerSearch')?.value || '');
}

function filterSongPicker() {
    const val = document.getElementById('songPickerSearch')?.value || '';
    renderSetlistSongPicker(val);
}

async function confirmSongSelection() {
    try {
        await apiPost('/setlist-songs/sync', { 
            setlist_id: currentSetlist.id, 
            song_ids: selectedSongsForSetlist 
        });
        closeModal('songPickerModal');
        viewSetlist(currentSetlist.id);
        showToast('Canciones actualizadas');
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function removeSongFromSetlist(songId) {
    selectedSongsForSetlist = (currentSetlist.songs || []).map(s => s.id).filter(id => id !== songId);
    try {
        await apiPost('/setlist-songs/sync', { 
            setlist_id: currentSetlist.id, 
            song_ids: selectedSongsForSetlist 
        });
        viewSetlist(currentSetlist.id);
        showToast('Canción removida');
    } catch (e) {
        showToast('Error al remover');
    }
}

// ===== QUICK ADD FROM PICKER =====
function openQuickAddFromPicker() {
    document.getElementById('quickSongName').value = '';
    document.getElementById('quickSongArtist').value = '';
    openModal('quickAddSongModal');
    document.getElementById('quickSongName').focus();
}

async function saveQuickSongFromPicker() {
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
        selectedSongsForSetlist.push(newSong.id);
        closeModal('quickAddSongModal');
        renderSetlistSongPicker();
        showToast('Canción creada y agregada');
    } catch (e) {
        showToast('Error al crear');
    }
}

// ===== STAGE MODE =====
function openStageMode() {
    if (!currentSetlist) return;
    
    closeModal('viewSetlistModal');
    document.getElementById('stageModeTitle').textContent = currentSetlist.name;
    
    const songs = currentSetlist.songs || [];
    document.getElementById('stageModeContent').innerHTML = songs.length ? songs.map((s, i) => `
        <div class="stage-song">
            <div class="stage-song-number">${i + 1}</div>
            <div class="stage-song-info">
                <div class="stage-song-title">${s.name}</div>
                <div class="stage-song-artist">${s.artist || ''}</div>
            </div>
            <div class="stage-song-badges">
                ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-orange">${s.bpm} BPM</span>` : ''}
            </div>
        </div>
    `).join('') : '<p style="text-align:center;color:#888;">Sin canciones</p>';
    
    openModal('stageModeModal');
}

function closeStageMode() {
    closeModal('stageModeModal');
}

// ===== CRUD =====
function openSetlistModal(setlist = null) {
    document.getElementById('setlistModalTitle').textContent = setlist ? 'Editar Set List' : 'Nuevo Set List';
    document.getElementById('setlistId').value = setlist?.id || '';
    document.getElementById('setlistName').value = setlist?.name || '';
    document.getElementById('setlistDesc').value = setlist?.description || '';
    openModal('setlistModal');
}

function editSetlist() {
    closeModal('viewSetlistModal');
    openSetlistModal(currentSetlist);
}

async function saveSetlist() {
    const id = document.getElementById('setlistId').value;
    const data = {
        name: document.getElementById('setlistName').value.trim(),
        description: document.getElementById('setlistDesc').value.trim()
    };
    
    if (!data.name) {
        showToast('Ingresa el nombre');
        return;
    }
    
    try {
        if (id) {
            await apiPut(`/setlists/${id}`, data);
            showToast('Set list actualizado');
        } else {
            await apiPost('/setlists', data);
            showToast('Set list creado');
        }
        closeModal('setlistModal');
        loadSetlists();
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteSetlist(id) {
    if (!confirm('¿Eliminar este set list?')) return;
    
    try {
        await apiDelete(`/setlists/${id}`);
        closeModal('viewSetlistModal');
        showToast('Set list eliminado');
        loadSetlists();
    } catch (e) {
        showToast('Error al eliminar');
    }
}

loadSetlists();
