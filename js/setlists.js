checkAuth();
initApp();

let allSetlists = [], currentSetlist = null;

async function loadData() {
    try {
        allSetlists = await apiGet('/setlists') || [];
        await loadSongsCache();
        renderSetlists();
    } catch (error) {
        document.getElementById('setlistsList').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function renderSetlists() {
    const container = document.getElementById('setlistsList');
    
    if (!allSetlists.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">Sin set lists</div>
                <p class="text-muted">Crea tu primer set list</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allSetlists.map(s => `
        <div class="setlist-item" onclick="viewSetlist(${s.id})">
            <div class="setlist-icon">📋</div>
            <div class="setlist-info">
                <div class="setlist-title">${s.name}</div>
                <div class="setlist-meta">${s.song_count || 0} canciones · ${s.total_duration ? formatDuration(s.total_duration) : '-'}</div>
            </div>
            <span style="color:var(--text-tertiary)">›</span>
        </div>
    `).join('');
}

// ===== VER SETLIST =====
async function viewSetlist(id) {
    currentSetlist = allSetlists.find(s => s.id === id);
    if (!currentSetlist) return;

    document.getElementById('viewSetlistTitle').textContent = currentSetlist.name;
    
    // Cargar canciones del setlist
    const songs = await apiGet(`/setlists/${id}/songs`) || [];
    
    document.getElementById('viewSetlistContent').innerHTML = `
        <p class="text-muted" style="margin-bottom:16px">${currentSetlist.description || ''}</p>
        
        <!-- Quick add canciones -->
        <div class="quick-add-trigger" onclick="openSongPickerForSetlist()">
            <div class="icon">+</div>
            <span>Agregar canciones</span>
        </div>
        
        ${songs.length ? `
            <div style="margin-top:16px">
                ${songs.map((s, i) => `
                    <div class="song-item" style="padding:12px 0">
                        <span style="width:24px;color:var(--text-tertiary);font-weight:600">${i + 1}</span>
                        <div class="song-thumb" style="width:40px;height:40px;font-size:16px">🎵</div>
                        <div class="song-info">
                            <div class="song-title">${s.name}</div>
                            <div class="song-artist">${s.artist || 'Sin artista'}</div>
                        </div>
                        <div class="song-badges">
                            ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="removeSongFromSetlist(${s.id})">×</button>
                    </div>
                `).join('')}
            </div>
        ` : '<p class="text-muted text-center" style="margin-top:24px">Sin canciones aún</p>'}
        
        ${isAdmin() ? `
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-default);display:flex;gap:8px">
                <button class="btn btn-secondary btn-sm" onclick="editSetlist()">✎ Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSetlist(${currentSetlist.id})">Eliminar</button>
            </div>
        ` : ''}
    `;
    
    openModal('viewSetlistModal');
}

// ===== SONG PICKER =====
let selectedSongsForSetlist = [];

async function openSongPickerForSetlist() {
    const currentSongs = await apiGet(`/setlists/${currentSetlist.id}/songs`) || [];
    selectedSongsForSetlist = currentSongs.map(s => s.id);
    
    renderSongPicker();
    openModal('songPickerModal');
}

function renderSongPicker() {
    const songs = allSongsCache;
    const search = document.getElementById('pickerSearch')?.value?.toLowerCase() || '';
    
    const filtered = songs.filter(s => 
        s.name.toLowerCase().includes(search) || 
        (s.artist || '').toLowerCase().includes(search)
    );
    
    document.getElementById('songPickerList').innerHTML = filtered.map(s => `
        <div class="song-picker-item ${selectedSongsForSetlist.includes(s.id) ? 'selected' : ''}" 
             data-id="${s.id}" onclick="toggleSongInPicker(this, ${s.id})">
            <div class="checkbox">${selectedSongsForSetlist.includes(s.id) ? '✓' : ''}</div>
            <div class="song-thumb" style="width:40px;height:40px;font-size:16px">🎵</div>
            <div class="song-info">
                <div class="song-title">${s.name}</div>
                <div class="song-artist">${s.artist || 'Sin artista'}</div>
            </div>
        </div>
    `).join('') || '<p class="text-muted text-center">Sin canciones</p>';
}

function filterPicker() {
    renderSongPicker();
}

function toggleSongInPicker(el, id) {
    if (selectedSongsForSetlist.includes(id)) {
        selectedSongsForSetlist = selectedSongsForSetlist.filter(x => x !== id);
    } else {
        selectedSongsForSetlist.push(id);
    }
    
    el.classList.toggle('selected');
    el.querySelector('.checkbox').textContent = el.classList.contains('selected') ? '✓' : '';
}

async function confirmSongSelection() {
    try {
        await apiPut(`/setlists/${currentSetlist.id}/songs`, { song_ids: selectedSongsForSetlist });
        closeModal('songPickerModal');
        viewSetlist(currentSetlist.id);
        showToast('Canciones actualizadas');
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function removeSongFromSetlist(songId) {
    selectedSongsForSetlist = selectedSongsForSetlist.filter(id => id !== songId);
    await apiPut(`/setlists/${currentSetlist.id}/songs`, { song_ids: selectedSongsForSetlist });
    viewSetlist(currentSetlist.id);
    showToast('Canción removida');
}

// ===== QUICK ADD SONG =====
function openQuickAddFromPicker() {
    closeModal('songPickerModal');
    openModal('quickAddSongModal');
}

async function saveQuickSongAndSelect() {
    const name = document.getElementById('quickSongName').value.trim();
    const artist = document.getElementById('quickSongArtist').value.trim();
    
    if (!name) {
        showToast('El nombre es obligatorio');
        return;
    }

    try {
        const newSong = await apiPost('/songs', { name, artist });
        refreshSongsCache();
        allSongsCache = await apiGet('/songs') || [];
        
        selectedSongsForSetlist.push(newSong.id);
        
        document.getElementById('quickSongName').value = '';
        document.getElementById('quickSongArtist').value = '';
        
        closeModal('quickAddSongModal');
        renderSongPicker();
        openModal('songPickerModal');
        
        showToast('Canción creada');
    } catch (e) {
        showToast('Error al crear');
    }
}

// ===== CRUD SETLIST =====
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
        name: document.getElementById('setlistName').value,
        description: document.getElementById('setlistDesc').value
    };

    if (!data.name) {
        showToast('El nombre es obligatorio');
        return;
    }

    try {
        if (id) {
            await apiPut(`/setlists/${id}`, data);
        } else {
            await apiPost('/setlists', data);
        }
        closeModal('setlistModal');
        loadData();
        showToast(id ? 'Set list actualizado' : 'Set list creado');
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteSetlist(id) {
    if (confirm('¿Eliminar este set list?')) {
        await apiDelete(`/setlists/${id}`);
        closeModal('viewSetlistModal');
        loadData();
        showToast('Set list eliminado');
    }
}

loadData();
