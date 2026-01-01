checkAuth();
initApp();

if (!isAdmin()) document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

let allSongs = [], categories = [], genres = [];
let currentSong = null, lyricsFontSize = 20, activeCategory = '';

async function loadData() {
    try {
        [allSongs, categories, genres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);
        
        allSongsCache = allSongs; // Para el picker global
        
        renderFilters();
        populateSelects();
        renderSongs();
    } catch (error) {
        document.getElementById('songsList').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function renderFilters() {
    const container = document.getElementById('categoryFilters');
    container.innerHTML = `
        <div class="filter-chip ${!activeCategory ? 'active' : ''}" onclick="filterByCategory('')">Todas</div>
        ${categories.map(c => `
            <div class="filter-chip ${activeCategory == c.id ? 'active' : ''}" onclick="filterByCategory('${c.id}')">${c.name}</div>
        `).join('')}
    `;
}

function filterByCategory(catId) {
    activeCategory = catId;
    renderFilters();
    renderSongs();
}

function populateSelects() {
    const catSel = document.getElementById('songCategory');
    const genSel = document.getElementById('songGenre');
    
    catSel.innerHTML = '<option value="">Sin categoría</option>' + 
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    genSel.innerHTML = '<option value="">Sin género</option>' + 
        genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

function filterSongs() {
    renderSongs();
}

function renderSongs() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = allSongs.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search);
        const matchCat = !activeCategory || s.category_id == activeCategory;
        return matchSearch && matchCat;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const container = document.getElementById('songsList');

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <div class="empty-title">No hay canciones</div>
                <p class="text-muted">${allSongs.length ? 'Prueba otros filtros' : 'Agrega tu primera canción'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(s => `
        <div class="song-item" onclick="viewSong(${s.id})">
            <div class="song-thumb">🎵</div>
            <div class="song-info">
                <div class="song-title">${s.name}</div>
                <div class="song-artist">${s.artist || 'Sin artista'}${s.category_name ? ' · ' + s.category_name : ''}</div>
            </div>
            <div class="song-badges">
                ${s.musical_key ? `<span class="badge badge-green">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-orange">${s.bpm}</span>` : ''}
            </div>
            <button class="song-fav ${s.is_favorite ? 'active' : ''}" onclick="event.stopPropagation();toggleFav(${s.id},${!s.is_favorite})">
                ${s.is_favorite ? '★' : '☆'}
            </button>
        </div>
    `).join('');
}

// ===== VER CANCIÓN =====
function viewSong(id) {
    currentSong = allSongs.find(s => s.id === id);
    if (!currentSong) return;

    document.getElementById('viewTitle').textContent = currentSong.name;
    document.getElementById('btnLyrics').style.display = currentSong.lyrics ? 'inline-flex' : 'none';
    
    document.getElementById('viewContent').innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
            ${currentSong.is_favorite ? '<span class="badge badge-orange">⭐ Favorita</span>' : ''}
            ${currentSong.song_type ? `<span class="badge badge-gray">${currentSong.song_type}</span>` : ''}
        </div>
        <div style="display:grid;gap:16px">
            <div><strong class="text-muted">Artista:</strong> ${currentSong.artist || '-'}</div>
            <div><strong class="text-muted">Categoría:</strong> ${currentSong.category_name || '-'}</div>
            <div><strong class="text-muted">Género:</strong> ${currentSong.genre_name || '-'}</div>
            <div><strong class="text-muted">Tonalidad:</strong> ${currentSong.musical_key || '-'}</div>
            <div><strong class="text-muted">BPM:</strong> ${currentSong.bpm || '-'}</div>
            ${currentSong.video_url ? `<a href="${currentSong.video_url}" target="_blank" class="btn btn-secondary btn-sm">▶ Ver Video</a>` : ''}
            ${currentSong.notes ? `<div><strong class="text-muted">Notas:</strong> ${currentSong.notes}</div>` : ''}
        </div>
        ${isAdmin() ? `
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-default);display:flex;gap:8px">
                <button class="btn btn-secondary btn-sm" onclick="editSong(${currentSong.id})">✎ Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSong(${currentSong.id})">Eliminar</button>
            </div>
        ` : ''}
    `;
    
    openModal('viewModal');
}

// ===== LETRAS =====
function openLyrics() {
    if (!currentSong) return;
    
    document.getElementById('lyricsTitle').textContent = currentSong.name;
    document.getElementById('lyricsArtist').textContent = currentSong.artist || '';
    document.getElementById('lyricsKey').textContent = currentSong.musical_key || '';
    document.getElementById('lyricsKey').style.display = currentSong.musical_key ? 'inline-flex' : 'none';
    document.getElementById('lyricsBpm').textContent = currentSong.bpm ? currentSong.bpm + ' BPM' : '';
    document.getElementById('lyricsBpm').style.display = currentSong.bpm ? 'inline-flex' : 'none';
    document.getElementById('lyricsText').textContent = currentSong.lyrics || 'Sin letra';
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
    
    closeModal('viewModal');
    document.getElementById('lyricsView').classList.add('active');
}

function closeLyrics() {
    document.getElementById('lyricsView').classList.remove('active');
}

function changeFontSize(d) {
    lyricsFontSize = Math.max(14, Math.min(48, lyricsFontSize + d));
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
}

// ===== FAVORITOS =====
async function toggleFav(id, val) {
    await apiPatch(`/songs/${id}/favorite`, { is_favorite: val });
    const song = allSongs.find(s => s.id === id);
    if (song) song.is_favorite = val;
    renderSongs();
    showToast(val ? 'Agregada a favoritas' : 'Removida de favoritas');
}

// ===== CREAR CATEGORÍA/GÉNERO INLINE =====
function showNewCat() { document.getElementById('newCatForm').classList.remove('hidden'); }
function hideNewCat() { document.getElementById('newCatForm').classList.add('hidden'); document.getElementById('newCatName').value = ''; }
function showNewGen() { document.getElementById('newGenForm').classList.remove('hidden'); }
function hideNewGen() { document.getElementById('newGenForm').classList.add('hidden'); document.getElementById('newGenName').value = ''; }

async function createCat() {
    const name = document.getElementById('newCatName').value.trim();
    if (!name) return;
    const result = await apiPost('/categories', { name });
    categories.push(result);
    populateSelects();
    document.getElementById('songCategory').value = result.id;
    hideNewCat();
    showToast('Categoría creada');
}

async function createGen() {
    const name = document.getElementById('newGenName').value.trim();
    if (!name) return;
    const result = await apiPost('/genres', { name });
    genres.push(result);
    populateSelects();
    document.getElementById('songGenre').value = result.id;
    hideNewGen();
    showToast('Género creado');
}

// ===== MODAL CRUD =====
function openSongModal(song = null) {
    document.getElementById('modalTitle').textContent = song ? 'Editar Canción' : 'Nueva Canción';
    document.getElementById('songId').value = song?.id || '';
    document.getElementById('songName').value = song?.name || '';
    document.getElementById('songArtist').value = song?.artist || '';
    document.getElementById('songCategory').value = song?.category_id || '';
    document.getElementById('songGenre').value = song?.genre_id || '';
    document.getElementById('songKey').value = song?.musical_key || '';
    document.getElementById('songBpm').value = song?.bpm || '';
    document.getElementById('songVideo').value = song?.video_url || '';
    document.getElementById('songLyrics').value = song?.lyrics || '';
    document.getElementById('songNotes').value = song?.notes || '';
    hideNewCat();
    hideNewGen();
    openModal('songModal');
}

function editSong(id) {
    closeModal('viewModal');
    openSongModal(allSongs.find(s => s.id === id));
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
        video_url: document.getElementById('songVideo').value,
        lyrics: document.getElementById('songLyrics').value,
        notes: document.getElementById('songNotes').value
    };

    if (!data.name) {
        showToast('El nombre es obligatorio');
        return;
    }

    try {
        if (id) {
            await apiPut(`/songs/${id}`, data);
        } else {
            await apiPost('/songs', data);
        }
        closeModal('songModal');
        refreshSongsCache();
        loadData();
        showToast(id ? 'Canción actualizada' : 'Canción creada');
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteSong(id) {
    if (confirm('¿Eliminar esta canción?')) {
        await apiDelete(`/songs/${id}`);
        closeModal('viewModal');
        refreshSongsCache();
        loadData();
        showToast('Canción eliminada');
    }
}

loadData();
