checkAuth();
setupUserInfo();

let allSongs = [];
let categories = [];
let genres = [];
let selectedCategory = '';
let viewMode = 'list';
let currentSongResources = [];
let currentResourceSongId = null;

async function loadData() {
    try {
        [allSongs, categories, genres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);

        allSongs = Array.isArray(allSongs) ? allSongs : [];
        categories = Array.isArray(categories) ? categories : [];
        genres = Array.isArray(genres) ? genres : [];

        const chipsContainer = document.getElementById('categoryChips');
        chipsContainer.innerHTML = `
            <button class="filter-chip active" onclick="filterByCategory('')">Todas</button>
            ${categories.map(c => `
                <button class="filter-chip" onclick="filterByCategory('${c.id}')">${c.name}</button>
            `).join('')}
        `;

        populateSelects();
        renderSongs();
    } catch (error) {
        console.error('Error:', error);
    }
}

function populateSelects() {
    const catSelect = document.getElementById('songCategory');
    const genSelect = document.getElementById('songGenre');
    
    const currentCat = catSelect.value;
    const currentGen = genSelect.value;

    catSelect.innerHTML = '<option value="">Sin categoría</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('') +
        '<option value="__new__">+ Nueva categoría...</option>';

    genSelect.innerHTML = '<option value="">Sin género</option>' +
        genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('') +
        '<option value="__new__">+ Nuevo género...</option>';
    
    if (currentCat && currentCat !== '__new__') catSelect.value = currentCat;
    if (currentGen && currentGen !== '__new__') genSelect.value = currentGen;
}

async function handleCategoryChange() {
    const select = document.getElementById('songCategory');
    if (select.value === '__new__') {
        const name = prompt('Nombre de la nueva categoría:');
        if (name && name.trim()) {
            try {
                const newCat = await apiPost('/categories', { name: name.trim() });
                categories.push(newCat);
                populateSelects();
                select.value = newCat.id;
                showToast('Categoría creada');
            } catch (e) {
                showToast('Error al crear');
                select.value = '';
            }
        } else {
            select.value = '';
        }
    }
}

async function handleGenreChange() {
    const select = document.getElementById('songGenre');
    if (select.value === '__new__') {
        const name = prompt('Nombre del nuevo género:');
        if (name && name.trim()) {
            try {
                const newGen = await apiPost('/genres', { name: name.trim() });
                genres.push(newGen);
                populateSelects();
                select.value = newGen.id;
                showToast('Género creado');
            } catch (e) {
                showToast('Error al crear');
                select.value = '';
            }
        } else {
            select.value = '';
        }
    }
}

function filterByCategory(catId) {
    selectedCategory = catId;
    document.querySelectorAll('.filter-chip').forEach((chip, i) => {
        chip.classList.toggle('active', (i === 0 && !catId) || chip.textContent === categories.find(c => c.id == catId)?.name);
    });
    renderSongs();
}

function filterSongs() { renderSongs(); }

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === mode);
    });
    renderSongs();
}

function renderSongs() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const groupBy = document.getElementById('groupBy').value;

    let filtered = allSongs.filter(s => {
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

    if (viewMode === 'table') {
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>⭐</th>
                            <th>Nombre</th>
                            <th>Artista</th>
                            <th>Categoría</th>
                            <th>Tono</th>
                            <th>BPM</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(s => `
                            <tr>
                                <td><button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">${s.is_favorite ? '⭐' : '☆'}</button></td>
                                <td><strong>${s.name}</strong></td>
                                <td>${s.artist || '-'}</td>
                                <td>${s.category_name || '-'}</td>
                                <td>${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : '-'}</td>
                                <td>${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : '-'}</td>
                                <td>
                                    <button class="btn btn-ghost btn-sm" onclick="openResourcesModal(${s.id})" title="Recursos">📎</button>
                                    ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-ghost btn-sm">🎬</a>` : ''}
                                    ${isAdmin() ? `
                                        <button class="btn btn-ghost btn-sm" onclick="editSong(${s.id})">✏️</button>
                                        <button class="btn btn-ghost btn-sm" onclick="deleteSong(${s.id})">🗑️</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
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
            <button class="favorite-btn ${s.is_favorite ? 'active' : ''}" onclick="toggleFavorite(${s.id}, ${!s.is_favorite})">${s.is_favorite ? '⭐' : '☆'}</button>
            <div class="song-thumb">🎵</div>
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}</p>
            </div>
            <div class="song-badges">
                ${s.musical_key ? `<span class="badge badge-success">${s.musical_key}</span>` : ''}
                ${s.bpm ? `<span class="badge badge-warning">${s.bpm}</span>` : ''}
            </div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="openResourcesModal(${s.id})" title="Recursos">📎</button>
                ${s.video_url ? `<a href="${s.video_url}" target="_blank" class="btn btn-ghost btn-sm">🎬</a>` : ''}
                ${isAdmin() ? `
                    <button class="btn btn-ghost btn-sm" onclick="editSong(${s.id})">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteSong(${s.id})">🗑️</button>
                ` : ''}
            </div>
        </div>
    `;
}

async function toggleFavorite(id, isFavorite) {
    await apiPut(`/songs/${id}`, { is_favorite: isFavorite });
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

function closeSongModal() { document.getElementById('songModal').classList.remove('active'); }

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

    if (id) await apiPut(`/songs/${id}`, data);
    else await apiPost('/songs', data);

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

// ============ RECURSOS ============
async function openResourcesModal(songId) {
    currentResourceSongId = songId;
    const song = allSongs.find(s => s.id === songId);
    
    document.getElementById('resourcesSongName').textContent = song?.name || 'Canción';
    document.getElementById('resourcesModal').classList.add('active');
    
    await loadResources();
}

function closeResourcesModal() {
    document.getElementById('resourcesModal').classList.remove('active');
    currentResourceSongId = null;
}

async function loadResources() {
    const filter = document.getElementById('resourcesFilter').value;
    try {
        currentSongResources = await apiGet(`/song-resources/song/${currentResourceSongId}?filter=${filter}`) || [];
        renderResources();
    } catch (e) {
        currentSongResources = [];
        renderResources();
    }
}

function renderResources() {
    const container = document.getElementById('resourcesList');
    
    if (!currentSongResources.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin recursos</p><small>Agrega letras, acordes, partituras o notas</small></div>';
        return;
    }
    
    const typeIcons = {
        lyrics: '📝', chords: '🎸', tabs: '🎼', sheet: '📄', 
        notes: '📒', pdf: '📕', image: '🖼️', audio: '🎵'
    };
    
    const typeNames = {
        lyrics: 'Letra', chords: 'Acordes', tabs: 'Tablatura', sheet: 'Partitura',
        notes: 'Notas', pdf: 'PDF', image: 'Imagen', audio: 'Audio'
    };
    
    container.innerHTML = currentSongResources.map(r => `
        <div class="song-item resource-item">
            <div class="song-thumb">${typeIcons[r.type] || '📎'}</div>
            <div class="song-info">
                <h4>${r.title || typeNames[r.type] || 'Recurso'}</h4>
                <p>${r.user_name || 'Usuario'} · ${r.is_shared ? '🌐 Compartido' : '🔒 Privado'}</p>
            </div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="viewResource(${r.id})">👁️</button>
                ${r.file_url ? `<a href="${r.file_url}" target="_blank" class="btn btn-ghost btn-sm">⬇️</a>` : ''}
                <button class="btn btn-ghost btn-sm" onclick="deleteResource(${r.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function viewResource(id) {
    const r = currentSongResources.find(x => x.id === id);
    if (!r) return;
    
    if (r.file_url) {
        window.open(r.file_url, '_blank');
    } else if (r.content) {
        document.getElementById('viewResourceTitle').textContent = r.title || 'Contenido';
        document.getElementById('viewResourceContent').innerHTML = nl2br(r.content);
        document.getElementById('viewResourceModal').classList.add('active');
    }
}

function closeViewResourceModal() {
    document.getElementById('viewResourceModal').classList.remove('active');
}

async function deleteResource(id) {
    if (confirm('¿Eliminar este recurso?')) {
        await apiDelete(`/song-resources/${id}`);
        loadResources();
        showToast('Recurso eliminado');
    }
}

function openAddResourceModal() {
    document.getElementById('resourceType').value = 'notes';
    document.getElementById('resourceTitle').value = '';
    document.getElementById('resourceContent').value = '';
    document.getElementById('resourceShared').checked = true;
    document.getElementById('resourceFileInput').value = '';
    document.getElementById('uploadProgress').style.display = 'none';
    toggleResourceContentType();
    document.getElementById('addResourceModal').classList.add('active');
}

function closeAddResourceModal() {
    document.getElementById('addResourceModal').classList.remove('active');
}

function toggleResourceContentType() {
    const type = document.getElementById('resourceType').value;
    const textTypes = ['lyrics', 'chords', 'tabs', 'notes'];
    const isText = textTypes.includes(type);
    
    document.getElementById('resourceContentGroup').style.display = isText ? 'block' : 'none';
    document.getElementById('resourceFileGroup').style.display = isText ? 'none' : 'block';
}

async function saveResource() {
    const type = document.getElementById('resourceType').value;
    const title = document.getElementById('resourceTitle').value.trim();
    const isShared = document.getElementById('resourceShared').checked;
    
    const textTypes = ['lyrics', 'chords', 'tabs', 'notes'];
    const isText = textTypes.includes(type);
    
    let fileUrl = null;
    let fileType = null;
    let content = null;
    
    if (isText) {
        content = document.getElementById('resourceContent').value;
        if (!content.trim()) {
            showToast('Ingresa el contenido', 'warning');
            return;
        }
    } else {
        const fileInput = document.getElementById('resourceFileInput');
        if (!fileInput.files.length) {
            showToast('Selecciona un archivo', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            showToast('El archivo no puede superar 10MB', 'error');
            return;
        }
        
        try {
            document.getElementById('uploadProgress').style.display = 'block';
            const result = await uploadToCloudinary(file, (percent) => {
                document.getElementById('uploadProgressBar').style.width = percent + '%';
                document.getElementById('uploadProgressText').textContent = percent + '%';
            });
            fileUrl = result.url;
            fileType = result.format;
        } catch (e) {
            showToast('Error al subir archivo', 'error');
            document.getElementById('uploadProgress').style.display = 'none';
            return;
        }
    }
    
    try {
        await apiPost('/song-resources', {
            song_id: currentResourceSongId,
            type,
            title: title || null,
            content,
            file_url: fileUrl,
            file_type: fileType,
            is_shared: isShared ? 1 : 0
        });
        
        closeAddResourceModal();
        loadResources();
        showToast('Recurso guardado');
    } catch (e) {
        showToast('Error al guardar', 'error');
    }
}

function formatDuration(seconds) {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

loadData();
