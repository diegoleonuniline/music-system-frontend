checkAuth();
setupUserInfo();

let allSongs = [];
let categories = [];
let genres = [];
let selectedCategory = '';

async function loadData() {
    try {
        [allSongs, categories, genres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);

        // Category chips
        const chipsContainer = document.getElementById('categoryChips');
        chipsContainer.innerHTML = `
            <button class="filter-chip active" onclick="filterByCategory('')">Todas</button>
            ${(categories || []).map(c => `
                <button class="filter-chip" onclick="filterByCategory('${c.id}')">${c.name}</button>
            `).join('')}
        `;

        // Fill selects in modal
        const catSelect = document.getElementById('songCategory');
        catSelect.innerHTML = '<option value="">Sin categoría</option>' +
            (categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        const genSelect = document.getElementById('songGenre');
        genSelect.innerHTML = '<option value="">Sin género</option>' +
            (genres || []).map(g => `<option value="${g.id}">${g.name}</option>`).join('');

        renderSongs();
    } catch (error) {
        console.error('Error:', error);
    }
}

function filterByCategory(catId) {
    selectedCategory = catId;
    document.querySelectorAll('.filter-chip').forEach((chip, i) => {
        chip.classList.toggle('active', (i === 0 && !catId) || chip.textContent === categories.find(c => c.id == catId)?.name);
    });
    renderSongs();
}

function filterSongs() {
    renderSongs();
}

function renderSongs() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const groupBy = document.getElementById('groupBy').value;

    let filtered = (allSongs || []).filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search);
        const matchCat = !selectedCategory || s.category_id == selectedCategory;
        return matchSearch && matchCat;
    });

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const container = document.getElementById('songsList');

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🎵</div><h3>Sin canciones</h3></div>';
        return;
    }

    if (groupBy) {
        const groups = {};
        filtered.forEach(s => {
            let key = 'Sin ' + groupBy;
            if (groupBy === 'artist') key = s.artist || 'Sin artista';
            else if (groupBy === 'category') key = s.category_name || 'Sin categoría';
            else if (groupBy === 'genre') key = s.genre_name || 'Sin género';
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        container.innerHTML = Object.keys(groups).sort().map(key => `
            <div class="group-header">${key} <span class="count">${groups[key].length}</span></div>
            ${groups[key].map(s => renderSongItem(s)).join('')}
        `).join('');
    } else {
        container.innerHTML = filtered.map(s => renderSongItem(s)).join('');
    }
}

function renderSongItem(s) {
    return `
        <div class="song-item">
            <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">
                ${s.is_favorite ? '⭐' : '☆'}
            </button>
            <div class="song-thumb">🎵</div>
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}</p>
            </div>
            <div class="song-badges">
                ${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : ''}
            </div>
            ${isAdmin() ? `
                <div class="song-actions">
                    <button class="btn btn-ghost btn-sm" onclick="editSong(${s.id})">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteSong(${s.id})">🗑️</button>
                </div>
            ` : ''}
        </div>
    `;
}

async function toggleFavorite(id, isFavorite) {
    await apiPatch(`/songs/${id}/favorite`, { is_favorite: isFavorite });
    const song = allSongs.find(s => s.id === id);
    if (song) song.is_favorite = isFavorite;
    renderSongs();
    showToast(isFavorite ? 'Agregada a favoritas' : 'Quitada de favoritas');
}

function openSongModal(song = null) {
    document.getElementById('songModalTitle').textContent = song ? 'Editar Canción' : 'Nueva Canción';
    document.getElementById('songId').value = song?.id || '';
    document.getElementById('songName').value = song?.name || '';
    document.getElementById('songArtist').value = song?.artist || '';
    document.getElementById('songCategory').value = song?.category_id || '';
    document.getElementById('songGenre').value = song?.genre_id || '';
    document.getElementById('songKey').value = song?.musical_key || '';
    document.getElementById('songBpm').value = song?.bpm || '';
    document.getElementById('songDuration').value = song?.duration_seconds || '';
    document.getElementById('songVideo').value = song?.video_url || '';
    document.getElementById('songLyrics').value = song?.lyrics || '';
    document.getElementById('songModal').classList.add('active');
}

function closeSongModal() {
    document.getElementById('songModal').classList.remove('active');
}

function editSong(id) {
    const song = allSongs.find(s => s.id === id);
    openSongModal(song);
}

async function saveSong() {
    const id = document.getElementById('songId').value;
    const data = {
        name: document.getElementById('songName').value,
        artist: document.getElementById('songArtist').value,
        category_id: document.getElementById('songCategory').value || null,
        genre_id: document.getElementById('songGenre').value || null,
        musical_key: document.getElementById('songKey').value,
        bpm: document.getElementById('songBpm').value || null,
        duration_seconds: document.getElementById('songDuration').value || null,
        video_url: document.getElementById('songVideo').value,
        lyrics: document.getElementById('songLyrics').value
    };

    if (id) {
        await apiPut(`/songs/${id}`, data);
    } else {
        await apiPost('/songs', data);
    }

    closeSongModal();
    loadData();
    showToast('Canción guardada');
}

async function deleteSong(id) {
    if (confirm('¿Eliminar esta canción?')) {
        await apiDelete(`/songs/${id}`);
        loadData();
        showToast('Canción eliminada');
    }
}

loadData();
