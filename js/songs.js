checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

let allSongs = [];
let categories = [];
let genres = [];
let viewMode = 'list'; // 'list' o 'table'
let currentSong = null;
let lyricsFontSize = 24;

async function loadData() {
    try {
        [allSongs, categories, genres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);

        // Llenar filtros
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

        renderSongs();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('songsList').innerHTML = '<div class="error-message">Error al cargar canciones</div>';
    }
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
    const typeFilter = document.getElementById('filterType').value;
    const groupBy = document.getElementById('groupBy').value;

    let filtered = allSongs.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search);
        const matchCat = !catFilter || s.category_id == catFilter;
        const matchGen = !genFilter || s.genre_id == genFilter;
        const matchType = !typeFilter || s.song_type === typeFilter;
        return matchSearch && matchCat && matchGen && matchType;
    });

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const container = document.getElementById('songsList');

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎵</div>
                <h3>No hay canciones</h3>
                <p>${allSongs.length === 0 ? 'Agrega tu primera canción' : 'Prueba con otros filtros'}</p>
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
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';
    
    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">⭐</th>
                        <th>Nombre</th>
                        <th>Artista</th>
                        <th>Categoría</th>
                        <th>Género</th>
                        <th>Tipo</th>
                        <th>Duración</th>
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
            let key = '';
            if (groupBy === 'artist') key = s.artist || 'Sin artista';
            else if (groupBy === 'category') key = s.category_name || 'Sin categoría';
            else if (groupBy === 'genre') key = s.genre_name || 'Sin género';
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        Object.keys(groups).sort().forEach(key => {
            html += `<tr><td colspan="10" style="background: var(--bg-secondary); font-weight: 600; color: var(--text-secondary);">${key} (${groups[key].length})</td></tr>`;
            groups[key].forEach(s => {
                html += renderTableRow(s, isAdmin);
            });
        });
    } else {
        filtered.forEach(s => {
            html += renderTableRow(s, isAdmin);
        });
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderTableRow(s, isAdmin) {
    return `
        <tr>
            <td>
                <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">
                    ${s.is_favorite ? '★' : '☆'}
                </button>
            </td>
            <td><strong>${s.name}</strong></td>
            <td>${s.artist || '-'}</td>
            <td>${s.category_name ? `<span class="badge badge-primary">${s.category_name}</span>` : '-'}</td>
            <td>${s.genre_name || '-'}</td>
            <td><span class="badge badge-neutral">${s.song_type || '-'}</span></td>
            <td>${formatDuration(s.duration_seconds)}</td>
            <td>${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : '-'}</td>
            <td>${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : '-'}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-ghost btn-sm" onclick="viewSong(${s.id})" title="Ver">👁</button>
                    ${s.lyrics ? `<button class="btn btn-ghost btn-sm" onclick="viewLyrics(${s.id})" title="Letra">📜</button>` : ''}
                    ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-ghost btn-sm" title="Video">▶</a>` : ''}
                    ${isAdmin ? `
                        <button class="btn btn-ghost btn-sm" onclick="editSong(${s.id})" title="Editar">✎</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteSong(${s.id})" title="Eliminar">×</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function renderListView(filtered, container, groupBy) {
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

    if (groupBy) {
        const groups = {};
        filtered.forEach(s => {
            let key = '';
            if (groupBy === 'artist') key = s.artist || 'Sin artista';
            else if (groupBy === 'category') key = s.category_name || 'Sin categoría';
            else if (groupBy === 'genre') key = s.genre_name || 'Sin género';
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        let html = '';
        Object.keys(groups).sort().forEach(key => {
            html += `<div class="group-header">${key} · ${groups[key].length}</div>`;
            groups[key].forEach(s => {
                html += renderSongItem(s, isAdmin);
            });
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = filtered.map(s => renderSongItem(s, isAdmin)).join('');
    }
}

function renderSongItem(s, isAdmin) {
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
                ${s.duration_seconds ? `<span class="badge badge-neutral">${formatDuration(s.duration_seconds)}</span>` : ''}
                ${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-warning">${s.bpm} bpm</span>` : ''}
            </div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-icon btn-sm" onclick="viewSong(${s.id})" title="Ver">👁</button>
                ${s.lyrics ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="viewLyrics(${s.id})" title="Letra">📜</button>` : ''}
                ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-ghost btn-icon btn-sm" title="Video">▶</a>` : ''}
                ${isAdmin ? `
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="editSong(${s.id})" title="Editar">✎</button>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteSong(${s.id})" title="Eliminar">×</button>
                ` : ''}
            </div>
        </div>
    `;
}

function viewSong(id) {
    currentSong = allSongs.find(s => s.id === id);
    if (!currentSong) return;

    document.getElementById('viewSongTitle').textContent = currentSong.name;
    document.getElementById('btnLyrics').style.display = currentSong.lyrics ? 'inline-flex' : 'none';
    
    document.getElementById('viewSongContent').innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
            ${currentSong.is_favorite ? '<span class="badge badge-warning">⭐ Favorita</span>' : ''}
            ${currentSong.song_type ? `<span class="badge badge-neutral">${currentSong.song_type}</span>` : ''}
            ${currentSong.lyrics_type ? `<span class="badge badge-neutral">${currentSong.lyrics_type}</span>` : ''}
        </div>
        
        <div style="display: grid; gap: 12px;">
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

async function toggleFavorite(id, isFavorite) {
    await apiPatch(`/songs/${id}/favorite`, { is_favorite: isFavorite });
    const song = allSongs.find(s => s.id === id);
    if (song) song.is_favorite = isFavorite;
    renderSongs();
}

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
