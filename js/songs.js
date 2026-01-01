checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

let allSongs = [];
let categories = [];
let genres = [];

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

    // Ordenar A-Z
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
                html += renderSongItem(s);
            });
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = filtered.map(s => renderSongItem(s)).join('');
    }
}

function renderSongItem(s) {
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';
    return `
        <div class="song-item">
            <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">
                ${s.is_favorite ? '★' : '☆'}
            </button>
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}${s.category_name ? ' · ' + s.category_name : ''}</p>
            </div>
            <div class="song-meta">
                ${s.duration_seconds ? `<span class="badge badge-neutral">${formatDuration(s.duration_seconds)}</span>` : ''}
                ${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-warning">${s.bpm} bpm</span>` : ''}
            </div>
            <div class="song-actions">
                ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-ghost btn-icon btn-sm" title="Ver video">▶</a>` : ''}
                ${isAdmin ? `
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="editSong(${s.id})" title="Editar">✎</button>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteSong(${s.id})" title="Eliminar">×</button>
                ` : ''}
            </div>
        </div>
    `;
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
