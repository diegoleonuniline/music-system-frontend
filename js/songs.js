checkAuth();
setupUserInfo();

let allSongs = [];
let allCategories = [];
let allGenres = [];
let filteredSongs = [];
let currentSong = null;
let currentView = 'list';
let currentCategory = '';
let lyricsFontSize = 20;
let inlineCreateType = '';

async function loadSongs() {
    try {
        [allSongs, allCategories, allGenres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);
        
        filteredSongs = [...allSongs];
        renderCategoryFilters();
        populateSelects();
        renderSongs();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    container.innerHTML = `
        <div class="filter-chip ${currentCategory === '' ? 'active' : ''}" onclick="filterByCategory('')">Todas</div>
        ${allCategories.map(c => `
            <div class="filter-chip ${currentCategory === c.id ? 'active' : ''}" onclick="filterByCategory(${c.id})">${c.name}</div>
        `).join('')}
    `;
}

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    filterSongs();
    renderCategoryFilters();
}

function filterSongs() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    
    filteredSongs = allSongs.filter(s => {
        const matchSearch = !search || 
            s.name?.toLowerCase().includes(search) || 
            s.artist?.toLowerCase().includes(search);
        const matchCategory = !currentCategory || s.category_id === currentCategory;
        return matchSearch && matchCategory;
    });
    
    renderSongs();
}

function populateSelects() {
    const catSelect = document.getElementById('songCategory');
    const genreSelect = document.getElementById('songGenre');
    
    catSelect.innerHTML = '<option value="">Sin categoría</option>' + 
        allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    genreSelect.innerHTML = '<option value="">Sin género</option>' + 
        allGenres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

function setView(view) {
    currentView = view;
    document.getElementById('viewList').classList.toggle('active', view === 'list');
    document.getElementById('viewTable').classList.toggle('active', view === 'table');
    renderSongs();
}

function renderSongs() {
    const container = document.getElementById('songsList');
    const groupBy = document.getElementById('groupBy').value;
    
    if (!filteredSongs.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <div class="empty-title">Sin canciones</div>
                <div class="empty-text">Agrega tu primera canción</div>
            </div>
        `;
        return;
    }
    
    // Sort
    let sorted = [...filteredSongs].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    if (groupBy) {
        renderGroupedSongs(sorted, groupBy, container);
    } else if (currentView === 'table') {
        renderTableView(sorted, container);
    } else {
        renderListView(sorted, container);
    }
}

function renderListView(songs, container) {
    container.innerHTML = songs.map(s => `
        <div class="song-item" onclick="viewSong(${s.id})">
            <div class="song-thumb">🎵</div>
            <div class="song-info">
                <div class="song-title">${s.name}</div>
                <div class="song-artist">${s.artist || 'Sin artista'}</div>
            </div>
            <div class="song-badges">
                ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-orange">${s.bpm}</span>` : ''}
            </div>
            <button class="song-fav ${s.is_favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${s.id})">
                ${s.is_favorite ? '⭐' : '☆'}
            </button>
        </div>
    `).join('');
}

function renderTableView(songs, container) {
    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Canción</th>
                        <th>Artista</th>
                        <th>Categoría</th>
                        <th>Tono</th>
                        <th>BPM</th>
                        <th>Dur.</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${songs.map(s => `
                        <tr onclick="viewSong(${s.id})" style="cursor:pointer">
                            <td><strong>${s.name}</strong></td>
                            <td>${s.artist || '-'}</td>
                            <td>${s.category_name || '-'}</td>
                            <td>${s.musical_key || '-'}</td>
                            <td>${s.bpm || '-'}</td>
                            <td>${formatDuration(s.duration)}</td>
                            <td>
                                <button class="song-fav ${s.is_favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${s.id})" style="font-size: 16px;">
                                    ${s.is_favorite ? '⭐' : '☆'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderGroupedSongs(songs, groupBy, container) {
    const groups = {};
    
    songs.forEach(s => {
        let key = 'Sin clasificar';
        if (groupBy === 'artist') key = s.artist || 'Sin artista';
        else if (groupBy === 'category') key = s.category_name || 'Sin categoría';
        else if (groupBy === 'genre') key = s.genre_name || 'Sin género';
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    
    const sortedKeys = Object.keys(groups).sort();
    
    container.innerHTML = sortedKeys.map(key => `
        <div class="song-group">
            <div class="song-group-header">${key} (${groups[key].length})</div>
            ${groups[key].map(s => `
                <div class="song-item" onclick="viewSong(${s.id})">
                    <div class="song-thumb">🎵</div>
                    <div class="song-info">
                        <div class="song-title">${s.name}</div>
                        <div class="song-artist">${s.artist || 'Sin artista'}</div>
                    </div>
                    <div class="song-badges">
                        ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
                    </div>
                    <button class="song-fav ${s.is_favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${s.id})">
                        ${s.is_favorite ? '⭐' : '☆'}
                    </button>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ===== VIEW SONG =====
function viewSong(id) {
    currentSong = allSongs.find(s => s.id === id);
    if (!currentSong) return;
    
    document.getElementById('viewSongTitle').textContent = currentSong.name;
    document.getElementById('viewSongContent').innerHTML = `
        <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-lg);">
            ${currentSong.category_name ? `<span class="badge badge-purple">${currentSong.category_name}</span>` : ''}
            ${currentSong.genre_name ? `<span class="badge badge-primary">${currentSong.genre_name}</span>` : ''}
            ${currentSong.song_type ? `<span class="badge badge-gray">${currentSong.song_type}</span>` : ''}
        </div>
        
        <div style="display: grid; gap: var(--space-md);">
            <div><strong>Artista:</strong> ${currentSong.artist || '-'}</div>
            <div><strong>Tonalidad:</strong> ${currentSong.musical_key || '-'}</div>
            <div><strong>BPM:</strong> ${currentSong.bpm || '-'}</div>
            <div><strong>Duración:</strong> ${formatDuration(currentSong.duration)}</div>
            ${currentSong.video_url ? `<div><a href="${currentSong.video_url}" target="_blank" class="btn btn-ghost btn-sm">🎬 Ver Video</a></div>` : ''}
            ${currentSong.notes ? `<div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--radius-sm);"><strong>Notas:</strong><br>${currentSong.notes}</div>` : ''}
        </div>
        
        <div style="margin-top: var(--space-xl); display: flex; gap: var(--space-sm);" class="admin-only">
            <button class="btn btn-secondary btn-sm" onclick="editSong(${currentSong.id})">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSong(${currentSong.id})">🗑️ Eliminar</button>
        </div>
    `;
    
    document.getElementById('btnViewLyrics').style.display = currentSong.lyrics ? 'flex' : 'none';
    openModal('viewSongModal');
}

// ===== LYRICS =====
function openLyrics() {
    if (!currentSong) return;
    closeModal('viewSongModal');
    
    document.getElementById('lyricsTitle').textContent = currentSong.name;
    document.getElementById('lyricsArtist').textContent = currentSong.artist || 'Sin artista';
    document.getElementById('lyricsKey').textContent = currentSong.musical_key || '';
    document.getElementById('lyricsKey').style.display = currentSong.musical_key ? 'inline-flex' : 'none';
    document.getElementById('lyricsBpm').textContent = currentSong.bpm ? `${currentSong.bpm} BPM` : '';
    document.getElementById('lyricsBpm').style.display = currentSong.bpm ? 'inline-flex' : 'none';
    document.getElementById('lyricsText').textContent = currentSong.lyrics || 'Sin letra disponible';
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
    
    document.getElementById('lyricsOverlay').classList.add('active');
}

function closeLyrics() {
    document.getElementById('lyricsOverlay').classList.remove('active');
}

function changeFontSize(delta) {
    lyricsFontSize = Math.max(14, Math.min(48, lyricsFontSize + delta));
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
}

// ===== FAVORITES =====
async function toggleFavorite(id) {
    const song = allSongs.find(s => s.id === id);
    if (!song) return;
    
    try {
        await apiPut(`/songs/${id}`, { is_favorite: !song.is_favorite });
        song.is_favorite = !song.is_favorite;
        renderSongs();
        showToast(song.is_favorite ? 'Agregada a favoritas' : 'Removida de favoritas');
    } catch (e) {
        showToast('Error al actualizar');
    }
}

// ===== CRUD =====
function openSongModal(song = null) {
    document.getElementById('songModalTitle').textContent = song ? 'Editar Canción' : 'Nueva Canción';
    document.getElementById('songId').value = song?.id || '';
    document.getElementById('songName').value = song?.name || '';
    document.getElementById('songArtist').value = song?.artist || '';
    document.getElementById('songCategory').value = song?.category_id || '';
    document.getElementById('songGenre').value = song?.genre_id || '';
    document.getElementById('songType').value = song?.song_type || 'cover';
    document.getElementById('songLanguage').value = song?.lyrics_type || 'spanish';
    document.getElementById('songKey').value = song?.musical_key || '';
    document.getElementById('songBpm').value = song?.bpm || '';
    document.getElementById('songDuration').value = song?.duration || '';
    document.getElementById('songVideo').value = song?.video_url || '';
    document.getElementById('songLyrics').value = song?.lyrics || '';
    document.getElementById('songNotes').value = song?.notes || '';
    openModal('songModal');
}

function editSong(id) {
    const song = allSongs.find(s => s.id === id);
    closeModal('viewSongModal');
    openSongModal(song);
}

async function saveSong() {
    const id = document.getElementById('songId').value;
    const data = {
        name: document.getElementById('songName').value.trim(),
        artist: document.getElementById('songArtist').value.trim(),
        category_id: document.getElementById('songCategory').value || null,
        genre_id: document.getElementById('songGenre').value || null,
        song_type: document.getElementById('songType').value,
        lyrics_type: document.getElementById('songLanguage').value,
        musical_key: document.getElementById('songKey').value.trim(),
        bpm: document.getElementById('songBpm').value || null,
        duration: document.getElementById('songDuration').value || null,
        video_url: document.getElementById('songVideo').value.trim(),
        lyrics: document.getElementById('songLyrics').value,
        notes: document.getElementById('songNotes').value
    };
    
    if (!data.name) {
        showToast('Ingresa el nombre');
        return;
    }
    
    try {
        if (id) {
            await apiPut(`/songs/${id}`, data);
            showToast('Canción actualizada');
        } else {
            await apiPost('/songs', data);
            showToast('Canción creada');
        }
        closeModal('songModal');
        loadSongs();
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteSong(id) {
    if (!confirm('¿Eliminar esta canción?')) return;
    
    try {
        await apiDelete(`/songs/${id}`);
        closeModal('viewSongModal');
        showToast('Canción eliminada');
        loadSongs();
    } catch (e) {
        showToast('Error al eliminar');
    }
}

// ===== INLINE CREATE =====
function openInlineCreate(type) {
    inlineCreateType = type;
    document.getElementById('inlineCreateTitle').textContent = type === 'category' ? 'Nueva Categoría' : 'Nuevo Género';
    document.getElementById('inlineCreateName').value = '';
    document.getElementById('inlineColorGroup').style.display = type === 'category' ? 'block' : 'none';
    openModal('inlineCreateModal');
    document.getElementById('inlineCreateName').focus();
}

async function saveInlineCreate() {
    const name = document.getElementById('inlineCreateName').value.trim();
    if (!name) {
        showToast('Ingresa el nombre');
        return;
    }
    
    try {
        if (inlineCreateType === 'category') {
            const color = document.getElementById('inlineCreateColor').value;
            const newCat = await apiPost('/categories', { name, color });
            allCategories.push(newCat);
            populateSelects();
            document.getElementById('songCategory').value = newCat.id;
        } else {
            const newGenre = await apiPost('/genres', { name });
            allGenres.push(newGenre);
            populateSelects();
            document.getElementById('songGenre').value = newGenre.id;
        }
        closeModal('inlineCreateModal');
        showToast('Creado correctamente');
    } catch (e) {
        showToast('Error al crear');
    }
}

loadSongs();
