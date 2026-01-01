checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

// Ocultar botones admin-only si no es admin
if (!isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
}

let allSongs = [];
let categories = [];
let genres = [];
let viewMode = 'list';
let currentSong = null;
let lyricsFontSize = 20;

async function loadData() {
    try {
        [allSongs, categories, genres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);

        populateFilters();
        renderSongs();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('songsList').innerHTML = '<div class="error-message">Error al cargar canciones</div>';
    }
}

function populateFilters() {
    const catSelect = document.getElementById('filterCategory');
    const catSelectModal = document.getElementById('songCategory');
    catSelect.innerHTML = '<option value="">Categoría</option>';
    catSelectModal.innerHTML = '<option value="">Sin categoría</option>';
    categories.forEach(c => {
        catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        catSelectModal.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    const genSelect = document.getElementById('filterGenre');
    const genSelectModal = document.getElementById('songGenre');
    genSelect.innerHTML = '<option value="">Género</option>';
    genSelectModal.innerHTML = '<option value="">Sin género</option>';
    genres.forEach(g => {
        genSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        genSelectModal.innerHTML += `<option value="${g.id}">${g.name}</option>`;
    });
}

function toggleView() {
    viewMode = viewMode === 'list' ? 'table' : 'list';
    document.getElementById('viewIcon').textContent = viewMode === 'list' ? '☰' : '▤';
    document.getElementById('viewText').textContent = viewMode === 'list' ? 'Tabla' : 'Lista';
    renderSongs();
}

function filterSongs() {
    renderSongs();
}

function renderSongs() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const catFilter = document.getElementById('filterCategory').value;
    const genFilter = document.getElementById('filterGenre').value;
    const groupBy = document.getElementById('groupBy').value;

    let filtered = allSongs.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search);
        const matchCat = !catFilter || s.category_id == catFilter;
        const matchGen = !genFilter || s.genre_id == genFilter;
        return matchSearch && matchCat && matchGen;
    });

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const container = document.getElementById('songsList');

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎵</div>
                <h3>No hay canciones</h3>
                <p>${allSongs.length === 0 ? 'Agrega tu primera canción' : 'Prueba otros filtros'}</p>
            </div>
        `;
        return;
    }

    if (viewMode === 'table') {
        renderTableView(filtered, container, groupBy);
    } else {
        renderListView(filtered, container, groupBy);
    }
}

function renderTableView(filtered, container, groupBy) {
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">⭐</th>
                        <th>Nombre</th>
                        <th>Artista</th>
                        <th>Categoría</th>
                        <th>Tonalidad</th>
                        <th>BPM</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (groupBy) {
        const groups = {};
        filtered.forEach(s => {
            let key = groupBy === 'artist' ? (s.artist || 'Sin artista') :
                      groupBy === 'category' ? (s.category_name || 'Sin categoría') :
                      (s.genre_name || 'Sin género');
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        Object.keys(groups).sort().forEach(key => {
            html += `<tr><td colspan="7" style="background: var(--bg-secondary); font-weight: 600; font-size: 12px;">${key} (${groups[key].length})</td></tr>`;
            groups[key].forEach(s => html += renderTableRow(s));
        });
    } else {
        filtered.forEach(s => html += renderTableRow(s));
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderTableRow(s) {
    return `
        <tr>
            <td>
                <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">
                    ${s.is_favorite ? '★' : '☆'}
                </button>
            </td>
            <td><strong>${s.name}</strong></td>
            <td>${s.artist || '-'}</td>
            <td>${s.category_name || '-'}</td>
            <td>${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : '-'}</td>
            <td>${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : '-'}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-ghost btn-sm" onclick="viewSong(${s.id})">👁</button>
                    ${s.lyrics ? `<button class="btn btn-ghost btn-sm" onclick="viewLyrics(${s.id})">📜</button>` : ''}
                    ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="editSong(${s.id})">✎</button>` : ''}
                </div>
            </td>
        </tr>
    `;
}

function renderListView(filtered, container, groupBy) {
    if (groupBy) {
        const groups = {};
        filtered.forEach(s => {
            let key = groupBy === 'artist' ? (s.artist || 'Sin artista') :
                      groupBy === 'category' ? (s.category_name || 'Sin categoría') :
                      (s.genre_name || 'Sin género');
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        let html = '';
        Object.keys(groups).sort().forEach(key => {
            html += `<div class="group-header">${key} · ${groups[key].length}</div>`;
            groups[key].forEach(s => html += renderSongItem(s));
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = filtered.map(s => renderSongItem(s)).join('');
    }
}

function renderSongItem(s) {
    return `
        <div class="song-item">
            <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">
                ${s.is_favorite ? '★' : '☆'}
            </button>
            <div class="song-info" style="cursor: pointer;" onclick="viewSong(${s.id})">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}${s.category_name ? ' · ' + s.category_name : ''}</p>
            </div>
            <div class="song-meta">
                ${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : ''}
            </div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="viewSong(${s.id})">👁</button>
                ${s.lyrics ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="viewLyrics(${s.id})">📜</button>` : ''}
                ${isAdmin ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="editSong(${s.id})">✎</button>` : ''}
            </div>
        </div>
    `;
}

// ============ VER CANCIÓN ============

function viewSong(id) {
    currentSong = allSongs.find(s => s.id === id);
    if (!currentSong) return;

    document.getElementById('viewSongTitle').textContent = currentSong.name;
    document.getElementById('btnLyrics').style.display = currentSong.lyrics ? 'inline-flex' : 'none';
    
    document.getElementById('viewSongContent').innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
            ${currentSong.is_favorite ? '<span class="badge badge-warning">⭐ Favorita</span>' : ''}
            ${currentSong.song_type ? `<span class="badge badge-neutral">${currentSong.song_type}</span>` : ''}
        </div>
        <div style="display: grid; gap: 10px; font-size: 14px;">
            <div><strong>🎤 Artista:</strong> ${currentSong.artist || '-'}</div>
            <div><strong>📁 Categoría:</strong> ${currentSong.category_name || '-'}</div>
            <div><strong>🎸 Género:</strong> ${currentSong.genre_name || '-'}</div>
            <div><strong>⏱️ Duración:</strong> ${formatDuration(currentSong.duration_seconds)}</div>
            <div><strong>🎵 Tonalidad:</strong> ${currentSong.musical_key || '-'}</div>
            <div><strong>💓 BPM:</strong> ${currentSong.bpm || '-'}</div>
            ${currentSong.video_url ? `<div><a href="${currentSong.video_url}" target="_blank" class="btn btn-ghost btn-sm">▶️ Ver Video</a></div>` : ''}
            ${currentSong.notes ? `<div><strong>📝 Notas:</strong> ${currentSong.notes}</div>` : ''}
        </div>
    `;
    
    document.getElementById('viewSongModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewSongModal').classList.remove('active');
}

// ============ VER LETRA ============

function viewLyrics(id) {
    currentSong = allSongs.find(s => s.id === id);
    openLyricsMode();
}

function openLyricsMode() {
    if (!currentSong) return;
    
    document.getElementById('lyricsSongTitle').textContent = currentSong.name;
    document.getElementById('lyricsSongArtist').textContent = currentSong.artist || '';
    document.getElementById('lyricsSongKey').textContent = currentSong.musical_key || '';
    document.getElementById('lyricsSongKey').style.display = currentSong.musical_key ? 'inline-flex' : 'none';
    document.getElementById('lyricsSongBpm').textContent = currentSong.bpm ? currentSong.bpm + ' BPM' : '';
    document.getElementById('lyricsSongBpm').style.display = currentSong.bpm ? 'inline-flex' : 'none';
    document.getElementById('lyricsText').textContent = currentSong.lyrics || 'Sin letra disponible';
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
    
    closeViewModal();
    document.getElementById('lyricsModal').classList.add('active');
}

function closeLyricsMode() {
    document.getElementById('lyricsModal').classList.remove('active');
}

function changeFontSize(delta) {
    lyricsFontSize = Math.max(14, Math.min(48, lyricsFontSize + delta));
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
}

// ============ FAVORITOS ============

async function toggleFavorite(id, isFavorite) {
    await apiPatch(`/songs/${id}/favorite`, { is_favorite: isFavorite });
    const song = allSongs.find(s => s.id === id);
    if (song) song.is_favorite = isFavorite;
    renderSongs();
}

// ============ CREAR CATEGORÍA INLINE ============

function showNewCategory() {
    document.getElementById('categoryInline').classList.add('hidden');
    document.getElementById('newCategoryForm').classList.remove('hidden');
    document.getElementById('newCategoryName').focus();
}

function hideNewCategory() {
    document.getElementById('categoryInline').classList.remove('hidden');
    document.getElementById('newCategoryForm').classList.add('hidden');
    document.getElementById('newCategoryName').value = '';
}

async function createCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;

    try {
        const result = await apiPost('/categories', { name });
        categories.push(result);
        populateFilters();
        document.getElementById('songCategory').value = result.id;
        hideNewCategory();
    } catch (error) {
        alert('Error al crear categoría');
    }
}

// ============ CREAR GÉNERO INLINE ============

function showNewGenre() {
    document.getElementById('genreInline').classList.add('hidden');
    document.getElementById('newGenreForm').classList.remove('hidden');
    document.getElementById('newGenreName').focus();
}

function hideNewGenre() {
    document.getElementById('genreInline').classList.remove('hidden');
    document.getElementById('newGenreForm').classList.add('hidden');
    document.getElementById('newGenreName').value = '';
}

async function createGenre() {
    const name = document.getElementById('newGenreName').value.trim();
    if (!name) return;

    try {
        const result = await apiPost('/genres', { name });
        genres.push(result);
        populateFilters();
        document.getElementById('songGenre').value = result.id;
        hideNewGenre();
    } catch (error) {
        alert('Error al crear género');
    }
}

// ============ MODAL CANCIÓN ============

function openModal(song = null) {
    document.getElementById('modalTitle').textContent = song ? 'Editar Canción' : 'Nueva Canción';
    document.getElementById('songId').value = song?.id || '';
    document.getElementById('songName').value = song?.name || '';
    document.getElementById('songArtist').value = song?.artist || '';
    document.getElementById('songCategory').value = song?.category_id || '';
    document.getElementById('songGenre').value = song?.genre_id || '';
    document.getElementById('songType').value = song?.song_type || 'cover';
    document.getElementById('songLyricsType').value = song?.lyrics_type || 'spanish';
    document.getElementById('songVideo').value = song?.video_url || '';
    document.getElementById('songDuration').value = song?.duration_seconds || '';
    document.getElementById('songBpm').value = song?.bpm || '';
    document.getElementById('songKey').value = song?.musical_key || '';
    document.getElementById('songLyrics').value = song?.lyrics || '';
    document.getElementById('songNotes').value = song?.notes || '';
    
    hideNewCategory();
    hideNewGenre();
    
    document.getElementById('songModal').classList.add('active');
}

function closeModal() {
    document.getElementById('songModal').classList.remove('active');
}

function editSong(id) {
    const song = allSongs.find(s => s.id === id);
    openModal(song);
}

async function saveSong() {
    const id = document.getElementById('songId').value;
    const data = {
        name: document.getElementById('songName').value,
        artist: document.getElementById('songArtist').value,
        category_id: document.getElementById('songCategory').value || null,
        genre_id: document.getElementById('songGenre').value || null,
        song_type: document.getElementById('songType').value,
        lyrics_type: document.getElementById('songLyricsType').value,
        video_url: document.getElementById('songVideo').value,
        duration_seconds: document.getElementById('songDuration').value || null,
        bpm: document.getElementById('songBpm').value || null,
        musical_key: document.getElementById('songKey').value,
        lyrics: document.getElementById('songLyrics').value,
        notes: document.getElementById('songNotes').value
    };

    try {
        if (id) {
            await apiPut(`/songs/${id}`, data);
        } else {
            await apiPost('/songs', data);
        }
        closeModal();
        loadData();
    } catch (error) {
        alert('Error al guardar: ' + error.message);
    }
}

async function deleteSong(id) {
    if (confirm('¿Eliminar esta canción?')) {
        await apiDelete(`/songs/${id}`);
        loadData();
    }
}

loadData();
