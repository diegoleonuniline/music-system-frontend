checkAuth();
const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';
if (!isAdmin) document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

let allSongs = [], categories = [], genres = [];
let viewMode = 'list', currentSong = null, lyricsFontSize = 20;

async function loadData() {
    try {
        [allSongs, categories, genres] = await Promise.all([
            apiGet('/songs'), apiGet('/categories'), apiGet('/genres')
        ]);
        populateFilters();
        renderSongs();
    } catch (error) {
        document.getElementById('songsList').innerHTML = '<div class="error-message">Error al cargar</div>';
    }
}

function populateFilters() {
    const catFilter = document.getElementById('filterCategory');
    const catModal = document.getElementById('songCategory');
    catFilter.innerHTML = '<option value="">Categoría</option>';
    catModal.innerHTML = '<option value="">Sin categoría</option>';
    categories.forEach(c => {
        catFilter.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        catModal.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    const genFilter = document.getElementById('filterGenre');
    const genModal = document.getElementById('songGenre');
    genFilter.innerHTML = '<option value="">Género</option>';
    genModal.innerHTML = '<option value="">Sin género</option>';
    genres.forEach(g => {
        genFilter.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        genModal.innerHTML += `<option value="${g.id}">${g.name}</option>`;
    });
}

function toggleView() {
    viewMode = viewMode === 'list' ? 'table' : 'list';
    document.getElementById('viewIcon').textContent = viewMode === 'list' ? '☰' : '▤';
    renderSongs();
}

function filterSongs() { renderSongs(); }

function renderSongs() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const catFilter = document.getElementById('filterCategory').value;
    const genFilter = document.getElementById('filterGenre').value;
    const groupBy = document.getElementById('groupBy').value;

    let filtered = allSongs.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search);
        return matchSearch && (!catFilter || s.category_id == catFilter) && (!genFilter || s.genre_id == genFilter);
    }).sort((a, b) => a.name.localeCompare(b.name));

    const container = document.getElementById('songsList');

    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><div class="icon">🎵</div><h3>No hay canciones</h3></div>`;
        return;
    }

    if (viewMode === 'table') {
        let html = `<div class="table-container"><table><thead><tr>
            <th style="width:40px">⭐</th><th>Nombre</th><th>Artista</th><th>Categoría</th><th>🎵</th><th>BPM</th><th></th>
        </tr></thead><tbody>`;

        if (groupBy) {
            const groups = {};
            filtered.forEach(s => {
                const key = groupBy === 'artist' ? (s.artist || 'Sin artista') : (s.category_name || 'Sin categoría');
                if (!groups[key]) groups[key] = [];
                groups[key].push(s);
            });
            Object.keys(groups).sort().forEach(key => {
                html += `<tr><td colspan="7" style="background:var(--bg-elevated);font-weight:600;font-size:12px;color:var(--text-muted)">${key}</td></tr>`;
                groups[key].forEach(s => html += tableRow(s));
            });
        } else {
            filtered.forEach(s => html += tableRow(s));
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } else {
        let html = '';
        if (groupBy) {
            const groups = {};
            filtered.forEach(s => {
                const key = groupBy === 'artist' ? (s.artist || 'Sin artista') : (s.category_name || 'Sin categoría');
                if (!groups[key]) groups[key] = [];
                groups[key].push(s);
            });
            Object.keys(groups).sort().forEach(key => {
                html += `<div class="group-header">${key}</div>`;
                groups[key].forEach(s => html += listItem(s));
            });
        } else {
            filtered.forEach(s => html += listItem(s));
        }
        container.innerHTML = html;
    }
}

function tableRow(s) {
    return `<tr>
        <td><button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id},${!s.is_favorite})">${s.is_favorite ? '★' : '☆'}</button></td>
        <td><strong>${s.name}</strong></td>
        <td style="color:var(--text-muted)">${s.artist || '-'}</td>
        <td>${s.category_name || '-'}</td>
        <td>${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : '-'}</td>
        <td>${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : '-'}</td>
        <td><div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="viewSong(${s.id})">👁</button>
            ${s.lyrics ? `<button class="btn btn-ghost btn-sm" onclick="viewLyrics(${s.id})">📜</button>` : ''}
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="editSong(${s.id})">✎</button>` : ''}
        </div></td>
    </tr>`;
}

function listItem(s) {
    return `<div class="song-item" onclick="viewSong(${s.id})">
        <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="event.stopPropagation();toggleFavorite(${s.id},${!s.is_favorite})">${s.is_favorite ? '★' : '☆'}</button>
        <div class="song-info"><h4>${s.name}</h4><p>${s.artist || 'Sin artista'}</p></div>
        <div class="song-meta">
            ${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : ''}
            ${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : ''}
        </div>
        <div class="song-actions">
            ${s.lyrics ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();viewLyrics(${s.id})">📜</button>` : ''}
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editSong(${s.id})">✎</button>` : ''}
        </div>
    </div>`;
}

function viewSong(id) {
    currentSong = allSongs.find(s => s.id === id);
    if (!currentSong) return;
    document.getElementById('viewTitle').textContent = currentSong.name;
    document.getElementById('btnLyrics').style.display = currentSong.lyrics ? 'inline-flex' : 'none';
    document.getElementById('viewContent').innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
            ${currentSong.is_favorite ? '<span class="badge badge-warning">⭐ Favorita</span>' : ''}
            ${currentSong.song_type ? `<span class="badge badge-neutral">${currentSong.song_type}</span>` : ''}
        </div>
        <div style="display:grid;gap:12px;font-size:14px">
            <div><strong style="color:var(--text-muted)">Artista:</strong> ${currentSong.artist || '-'}</div>
            <div><strong style="color:var(--text-muted)">Categoría:</strong> ${currentSong.category_name || '-'}</div>
            <div><strong style="color:var(--text-muted)">Género:</strong> ${currentSong.genre_name || '-'}</div>
            <div><strong style="color:var(--text-muted)">Duración:</strong> ${formatDuration(currentSong.duration_seconds)}</div>
            <div><strong style="color:var(--text-muted)">Tonalidad:</strong> ${currentSong.musical_key || '-'}</div>
            <div><strong style="color:var(--text-muted)">BPM:</strong> ${currentSong.bpm || '-'}</div>
            ${currentSong.video_url ? `<div><a href="${currentSong.video_url}" target="_blank" class="btn btn-outline btn-sm">▶ Ver Video</a></div>` : ''}
            ${currentSong.notes ? `<div><strong style="color:var(--text-muted)">Notas:</strong> ${currentSong.notes}</div>` : ''}
        </div>
    `;
    document.getElementById('viewModal').classList.add('active');
}

function closeViewModal() { document.getElementById('viewModal').classList.remove('active'); }

function viewLyrics(id) {
    currentSong = allSongs.find(s => s.id === id);
    openLyrics();
}

function openLyrics() {
    if (!currentSong) return;
    document.getElementById('lyricsSongTitle').textContent = currentSong.name;
    document.getElementById('lyricsSongArtist').textContent = currentSong.artist || '';
    document.getElementById('lyricsSongKey').textContent = currentSong.musical_key || '';
    document.getElementById('lyricsSongKey').style.display = currentSong.musical_key ? 'inline-flex' : 'none';
    document.getElementById('lyricsSongBpm').textContent = currentSong.bpm ? currentSong.bpm + ' BPM' : '';
    document.getElementById('lyricsSongBpm').style.display = currentSong.bpm ? 'inline-flex' : 'none';
    document.getElementById('lyricsText').textContent = currentSong.lyrics || 'Sin letra';
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
    closeViewModal();
    document.getElementById('lyricsModal').classList.add('active');
}

function closeLyrics() { document.getElementById('lyricsModal').classList.remove('active'); }
function changeFontSize(d) {
    lyricsFontSize = Math.max(14, Math.min(48, lyricsFontSize + d));
    document.getElementById('lyricsText').style.fontSize = lyricsFontSize + 'px';
}

async function toggleFavorite(id, val) {
    await apiPatch(`/songs/${id}/favorite`, { is_favorite: val });
    const song = allSongs.find(s => s.id === id);
    if (song) song.is_favorite = val;
    renderSongs();
}

// Crear categoría/género inline
function showNewCategory() {
    document.getElementById('categoryInline').classList.add('hidden');
    document.getElementById('newCategoryForm').classList.remove('hidden');
}
function hideNewCategory() {
    document.getElementById('categoryInline').classList.remove('hidden');
    document.getElementById('newCategoryForm').classList.add('hidden');
    document.getElementById('newCategoryName').value = '';
}
async function createCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;
    const result = await apiPost('/categories', { name });
    categories.push(result);
    populateFilters();
    document.getElementById('songCategory').value = result.id;
    hideNewCategory();
}

function showNewGenre() {
    document.getElementById('genreInline').classList.add('hidden');
    document.getElementById('newGenreForm').classList.remove('hidden');
}
function hideNewGenre() {
    document.getElementById('genreInline').classList.remove('hidden');
    document.getElementById('newGenreForm').classList.add('hidden');
    document.getElementById('newGenreName').value = '';
}
async function createGenre() {
    const name = document.getElementById('newGenreName').value.trim();
    if (!name) return;
    const result = await apiPost('/genres', { name });
    genres.push(result);
    populateFilters();
    document.getElementById('songGenre').value = result.id;
    hideNewGenre();
}

// Modal CRUD
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

function closeModal() { document.getElementById('songModal').classList.remove('active'); }
function editSong(id) { openModal(allSongs.find(s => s.id === id)); }

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
    if (id) await apiPut(`/songs/${id}`, data);
    else await apiPost('/songs', data);
    closeModal();
    loadData();
}

loadData();
