checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

let allSetlists = [];
let allSongs = [];
let currentSetlist = null;

async function loadSetlists() {
    try {
        allSetlists = await apiGet('/setlists');
        allSongs = await apiGet('/songs');
        renderSetlists();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSetlists() {
    const container = document.getElementById('setlistsGrid');
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

    if (!allSetlists.length) {
        container.innerHTML = '<p>No hay set lists creados</p>';
        return;
    }

    container.innerHTML = allSetlists.map(s => `
        <div class="stat-card" style="cursor: pointer;" onclick="viewSetlist(${s.id})">
            <div class="icon">📋</div>
            <div class="number">${s.total_songs || 0}</div>
            <div class="label">${s.name}</div>
            <div style="margin-top: 10px; font-size: 12px; color: var(--gray);">
                ${formatDuration(s.total_duration_seconds)} total
            </div>
            ${isAdmin ? `
                <div style="margin-top: 10px;">
                    <button class="btn btn-sm" onclick="event.stopPropagation(); editSetlist(${s.id})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSetlist(${s.id})">🗑️</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function viewSetlist(id) {
    try {
        currentSetlist = await apiGet(`/setlists/${id}`);
        document.getElementById('viewSetlistTitle').textContent = currentSetlist.name;
        document.getElementById('viewTotalSongs').textContent = currentSetlist.songs?.length + ' canciones';
        document.getElementById('viewTotalDuration').textContent = formatDuration(currentSetlist.total_duration_seconds);
        
        renderSetlistSongs();
        document.getElementById('viewSetlistModal').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSetlistSongs() {
    const container = document.getElementById('setlistSongs');
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

    if (!currentSetlist.songs?.length) {
        container.innerHTML = '<p>No hay canciones en este set list</p>';
        return;
    }

    container.innerHTML = currentSetlist.songs.map((s, index) => `
        <div class="song-item" style="background: ${index % 2 === 0 ? '#f9f9f9' : '#fff'};">
            <span style="font-weight: bold; color: var(--primary); width: 30px;">${s.position}</span>
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'} ${s.musical_key ? '• ' + s.musical_key : ''}</p>
            </div>
            <div>
                <span class="badge badge-primary">${formatDuration(s.duration_seconds)}</span>
            </div>
            ${isAdmin ? `
                <div class="song-actions">
                    ${index > 0 ? `<button class="btn btn-sm" onclick="moveSong(${s.id}, ${s.position - 1})">⬆️</button>` : ''}
                    ${index < currentSetlist.songs.length - 1 ? `<button class="btn btn-sm" onclick="moveSong(${s.id}, ${s.position + 1})">⬇️</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="removeSongFromSetlist(${s.id})">✕</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function moveSong(songId, newPosition) {
    const songs = currentSetlist.songs.map((s, i) => {
        if (s.id === songId) {
            return { id: s.id, position: newPosition };
        }
        if (s.position === newPosition) {
            return { id: s.id, position: currentSetlist.songs.find(x => x.id === songId).position };
        }
        return { id: s.id, position: s.position };
    });

    await apiPut(`/setlists/${currentSetlist.id}/reorder`, { songs });
    viewSetlist(currentSetlist.id);
}

async function removeSongFromSetlist(songId) {
    if (confirm('¿Quitar esta canción del set list?')) {
        await apiDelete(`/setlists/${currentSetlist.id}/songs/${songId}`);
        viewSetlist(currentSetlist.id);
        loadSetlists();
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
    
    const available = allSongs.filter(s => 
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
            <button class="btn btn-sm btn-primary" onclick="addSongToSetlist(${s.id})">+ Agregar</button>
        </div>
    `).join('') : '<p>No hay canciones disponibles</p>';
}

async function addSongToSetlist(songId) {
    await apiPost(`/setlists/${currentSetlist.id}/songs`, { song_id: songId });
    viewSetlist(currentSetlist.id);
    filterAvailableSongs();
    loadSetlists();
}

function openStageMode() {
    document.getElementById('stageModeTitle').textContent = currentSetlist.name;
    
    const content = document.getElementById('stageModeContent');
    content.innerHTML = currentSetlist.songs?.map((s, i) => `
        <div style="background: #222; border-radius: 12px; padding: 24px; margin-bottom: 16px; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="color: var(--primary); font-size: 24px; font-weight: bold;">${s.position}.</span>
                    <span style="color: #fff; font-size: 28px; font-weight: bold; margin-left: 12px;">${s.name}</span>
                </div>
                <div>
                    ${s.musical_key ? `<span style="background: var(--secondary); color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 18px;">${s.musical_key}</span>` : ''}
                    ${s.bpm ? `<span style="background: var(--warning); color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 18px; margin-left: 8px;">${s.bpm} BPM</span>` : ''}
                </div>
            </div>
            <div style="color: #aaa; font-size: 18px; margin-top: 8px;">${s.artist || ''}</div>
            ${s.lyrics ? `<pre style="color: #ddd; font-size: 16px; margin-top: 16px; white-space: pre-wrap; font-family: inherit; line-height: 1.8;">${s.lyrics}</pre>` : ''}
        </div>
    `).join('') || '<p style="color: #fff;">No hay canciones</p>';
    
    document.getElementById('stageModeModal').classList.add('active');
}

function closeStageMode() {
    document.getElementById('stageModeModal').classList.remove('active');
}

function closeViewModal() {
    document.getElementById('viewSetlistModal').classList.remove('active');
}

function openModal(setlist = null) {
    document.getElementById('modalTitle').textContent = setlist ? 'Editar Set List' : 'Nuevo Set List';
    document.getElementById('setlistId').value = setlist?.id || '';
    document.getElementById('setlistName').value = setlist?.name || '';
    document.getElementById('setlistDescription').value = setlist?.description || '';
    document.getElementById('setlistModal').classList.add('active');
}

function closeModal() {
    document.getElementById('setlistModal').classList.remove('active');
}

function editSetlist(id) {
    const setlist = allSetlists.find(s => s.id === id);
    openModal(setlist);
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

    closeModal();
    loadSetlists();
}

async function deleteSetlist(id) {
    if (confirm('¿Eliminar este set list?')) {
        await apiDelete(`/setlists/${id}`);
        loadSetlists();
    }
}

loadSetlists();
