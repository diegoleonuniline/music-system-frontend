checkAuth();
setupUserInfo();

let allSongs = [];
let allCategories = [];
let allGenres = [];
let currentSongResources = [];
let currentResourceSongId = null;
let viewMode = 'cards';

async function loadSongs() {
    try {
        [allSongs, allCategories, allGenres] = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);
        allSongs = Array.isArray(allSongs) ? allSongs : [];
        allCategories = Array.isArray(allCategories) ? allCategories : [];
        allGenres = Array.isArray(allGenres) ? allGenres : [];
        renderSongs();
        populateFilters();
    } catch (error) {
        console.error('Error:', error);
    }
}

function populateFilters() {
    var catFilter = document.getElementById('filterCategory');
    var genFilter = document.getElementById('filterGenre');
    
    if (catFilter) {
        catFilter.innerHTML = '<option value="">Todas las categorías</option>' +
            allCategories.map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
    }
    if (genFilter) {
        genFilter.innerHTML = '<option value="">Todos los géneros</option>' +
            allGenres.map(function(g) { return '<option value="' + g.id + '">' + g.name + '</option>'; }).join('');
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(function(btn) {
        btn.classList.toggle('active', btn.textContent.toLowerCase().indexOf(mode === 'cards' ? 'tarjeta' : 'tabla') !== -1);
    });
    renderSongs();
}

function filterSongs() {
    renderSongs();
}

function renderSongs() {
    var search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    var catId = document.getElementById('filterCategory')?.value || '';
    var genId = document.getElementById('filterGenre')?.value || '';

    var filtered = allSongs.filter(function(s) {
        var matchSearch = s.name.toLowerCase().indexOf(search) !== -1 || (s.artist || '').toLowerCase().indexOf(search) !== -1;
        var matchCat = !catId || s.category_id == catId;
        var matchGen = !genId || s.genre_id == genId;
        return matchSearch && matchCat && matchGen;
    });

    var container = document.getElementById('songsContainer');

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🎵</div><h3>Sin canciones</h3></div>';
        return;
    }

    if (viewMode === 'table') {
        container.innerHTML = '<div class="table-container"><table><thead><tr><th>Canción</th><th>Artista</th><th>Tono</th><th>BPM</th><th>Duración</th><th></th></tr></thead><tbody>' +
            filtered.map(function(s) {
                return '<tr onclick="viewSong(' + s.id + ')" style="cursor:pointer;"><td><strong>' + s.name + '</strong>' + (s.is_favorite ? ' ⭐' : '') + '</td>' +
                '<td>' + (s.artist || '-') + '</td><td>' + (s.musical_key || '-') + '</td><td>' + (s.bpm || '-') + '</td>' +
                '<td>' + formatDuration(s.duration_seconds) + '</td>' +
                '<td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openSongResources(' + s.id + ',\'' + s.name.replace(/'/g, "\\'") + '\')">📎</button></td></tr>';
            }).join('') + '</tbody></table></div>';
    } else {
        container.innerHTML = '<div class="songs-grid">' + filtered.map(function(s) {
            return '<div class="song-card" onclick="viewSong(' + s.id + ')">' +
                '<div class="song-thumb">🎵</div>' +
                '<div class="song-info"><h4>' + s.name + (s.is_favorite ? ' ⭐' : '') + '</h4><p>' + (s.artist || 'Sin artista') + '</p></div>' +
                '<div class="song-meta">' + (s.musical_key ? '<span class="badge badge-neutral">' + s.musical_key + '</span>' : '') +
                '<span class="badge badge-neutral">' + formatDuration(s.duration_seconds) + '</span></div>' +
                '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openSongResources(' + s.id + ',\'' + s.name.replace(/'/g, "\\'") + '\')">📎</button>' +
            '</div>';
        }).join('') + '</div>';
    }
}

function formatDuration(sec) {
    if (!sec) return '0:00';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

async function viewSong(id) {
    var song = allSongs.find(function(s) { return s.id === id; });
    if (!song) return;

    document.getElementById('viewSongTitle').textContent = song.name;
    document.getElementById('viewSongArtist').textContent = song.artist || 'Sin artista';
    
    var details = [];
    if (song.musical_key) details.push('Tono: ' + song.musical_key);
    if (song.bpm) details.push(song.bpm + ' BPM');
    if (song.time_signature) details.push('Compás: ' + song.time_signature);
    if (song.duration_seconds) details.push(formatDuration(song.duration_seconds));
    document.getElementById('viewSongDetails').textContent = details.join(' · ');

    document.getElementById('viewSongLyrics').innerHTML = song.lyrics ? nl2br(song.lyrics) : '<em>Sin letra</em>';
    
    var linksHtml = '';
    if (song.video_url) linksHtml += '<a href="' + song.video_url + '" target="_blank" class="btn btn-ghost btn-sm">🎬 Video</a>';
    if (song.audio_url) linksHtml += '<a href="' + song.audio_url + '" target="_blank" class="btn btn-ghost btn-sm">🎧 Audio</a>';
    document.getElementById('viewSongLinks').innerHTML = linksHtml;

    document.getElementById('viewSongModal').classList.add('active');
    document.getElementById('viewSongModal').dataset.songId = id;
}

function closeViewSongModal() {
    document.getElementById('viewSongModal').classList.remove('active');
}

function editCurrentSong() {
    var id = document.getElementById('viewSongModal').dataset.songId;
    closeViewSongModal();
    editSong(parseInt(id));
}

function editSong(id) {
    var song = allSongs.find(function(s) { return s.id === id; });
    if (!song) return;
    openSongModal(song);
}

function openSongModal(song) {
    document.getElementById('songModalTitle').textContent = song ? 'Editar Canción' : 'Nueva Canción';
    document.getElementById('songId').value = song ? song.id : '';
    document.getElementById('songName').value = song ? song.name : '';
    document.getElementById('songArtist').value = song ? (song.artist || '') : '';
    document.getElementById('songKey').value = song ? (song.musical_key || '') : '';
    document.getElementById('songBpm').value = song ? (song.bpm || '') : '';
    document.getElementById('songTimeSignature').value = song ? (song.time_signature || '4/4') : '4/4';
    document.getElementById('songDuration').value = song ? (song.duration_seconds || '') : '';
    document.getElementById('songVideoUrl').value = song ? (song.video_url || '') : '';
    document.getElementById('songAudioUrl').value = song ? (song.audio_url || '') : '';
    document.getElementById('songLyrics').value = song ? (song.lyrics || '') : '';
    document.getElementById('songFavorite').checked = song ? song.is_favorite : false;

    // Categorías
    var catSelect = document.getElementById('songCategory');
    catSelect.innerHTML = '<option value="">Sin categoría</option>' +
        allCategories.map(function(c) { return '<option value="' + c.id + '"' + (song && song.category_id == c.id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('') +
        '<option value="__new__">+ Crear nueva...</option>';
    
    // Géneros
    var genSelect = document.getElementById('songGenre');
    genSelect.innerHTML = '<option value="">Sin género</option>' +
        allGenres.map(function(g) { return '<option value="' + g.id + '"' + (song && song.genre_id == g.id ? ' selected' : '') + '>' + g.name + '</option>'; }).join('') +
        '<option value="__new__">+ Crear nuevo...</option>';

    document.getElementById('newCategoryGroup').style.display = 'none';
    document.getElementById('newGenreGroup').style.display = 'none';

    document.getElementById('songModal').classList.add('active');
}

function closeSongModal() {
    document.getElementById('songModal').classList.remove('active');
}

function onCategoryChange() {
    var val = document.getElementById('songCategory').value;
    document.getElementById('newCategoryGroup').style.display = val === '__new__' ? 'block' : 'none';
}

function onGenreChange() {
    var val = document.getElementById('songGenre').value;
    document.getElementById('newGenreGroup').style.display = val === '__new__' ? 'block' : 'none';
}

async function createCategory() {
    var name = document.getElementById('newCategoryName').value.trim();
    if (!name) {
        showToast('Ingresa nombre de categoría', 'warning');
        return;
    }
    try {
        var result = await apiPost('/categories', { name: name });
        var newCat = { id: result.id, name: name };
        allCategories.push(newCat);
        
        var select = document.getElementById('songCategory');
        // Remover opción "crear nueva" temporalmente
        var newOption = select.querySelector('option[value="__new__"]');
        // Insertar nueva categoría antes de "crear nueva"
        var opt = document.createElement('option');
        opt.value = newCat.id;
        opt.textContent = newCat.name;
        opt.selected = true;
        select.insertBefore(opt, newOption);
        
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryGroup').style.display = 'none';
        showToast('Categoría creada');
    } catch (e) {
        showToast('Error al crear categoría', 'error');
    }
}

async function createGenre() {
    var name = document.getElementById('newGenreName').value.trim();
    if (!name) {
        showToast('Ingresa nombre de género', 'warning');
        return;
    }
    try {
        var result = await apiPost('/genres', { name: name });
        var newGen = { id: result.id, name: name };
        allGenres.push(newGen);
        
        var select = document.getElementById('songGenre');
        var newOption = select.querySelector('option[value="__new__"]');
        var opt = document.createElement('option');
        opt.value = newGen.id;
        opt.textContent = newGen.name;
        opt.selected = true;
        select.insertBefore(opt, newOption);
        
        document.getElementById('newGenreName').value = '';
        document.getElementById('newGenreGroup').style.display = 'none';
        showToast('Género creado');
    } catch (e) {
        showToast('Error al crear género', 'error');
    }
}

async function saveSong() {
    var id = document.getElementById('songId').value;
    var catVal = document.getElementById('songCategory').value;
    var genVal = document.getElementById('songGenre').value;

    if (catVal === '__new__' || genVal === '__new__') {
        showToast('Primero crea la categoría/género', 'warning');
        return;
    }

    var data = {
        name: document.getElementById('songName').value,
        artist: document.getElementById('songArtist').value || null,
        musical_key: document.getElementById('songKey').value || null,
        bpm: document.getElementById('songBpm').value ? parseInt(document.getElementById('songBpm').value) : null,
        time_signature: document.getElementById('songTimeSignature').value || null,
        duration_seconds: document.getElementById('songDuration').value ? parseInt(document.getElementById('songDuration').value) : null,
        video_url: document.getElementById('songVideoUrl').value || null,
        audio_url: document.getElementById('songAudioUrl').value || null,
        lyrics: document.getElementById('songLyrics').value || null,
        is_favorite: document.getElementById('songFavorite').checked ? 1 : 0,
        category_id: catVal ? parseInt(catVal) : null,
        genre_id: genVal ? parseInt(genVal) : null
    };

    try {
        if (id) {
            await apiPut('/songs/' + id, data);
        } else {
            await apiPost('/songs', data);
        }
        closeSongModal();
        loadSongs();
        showToast('Canción guardada');
    } catch (e) {
        showToast('Error al guardar', 'error');
    }
}

async function deleteSong(id) {
    if (confirm('¿Eliminar esta canción?')) {
        await apiDelete('/songs/' + id);
        closeViewSongModal();
        loadSongs();
        showToast('Canción eliminada');
    }
}

function deleteCurrentSong() {
    var id = document.getElementById('viewSongModal').dataset.songId;
    deleteSong(parseInt(id));
}

async function toggleFavorite(id) {
    var song = allSongs.find(function(s) { return s.id === id; });
    if (!song) return;
    await apiPut('/songs/' + id, { is_favorite: song.is_favorite ? 0 : 1 });
    loadSongs();
}

// Recursos
async function openSongResources(songId, songName) {
    currentResourceSongId = songId;
    document.getElementById('resourcesSongName').textContent = songName;
    document.getElementById('resourcesModal').classList.add('active');
    await loadResources();
}

function closeResourcesModal() {
    document.getElementById('resourcesModal').classList.remove('active');
}

async function loadResources() {
    var filter = document.getElementById('resourcesFilter').value;
    try {
        currentSongResources = await apiGet('/song-resources/song/' + currentResourceSongId + '?filter=' + filter) || [];
        renderResources();
    } catch (e) {
        currentSongResources = [];
        renderResources();
    }
}

function renderResources() {
    var container = document.getElementById('resourcesList');
    if (!currentSongResources.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin recursos</p></div>';
        return;
    }
    var icons = { lyrics: '📝', chords: '🎸', tabs: '🎼', sheet: '📄', notes: '📒', pdf: '📕', image: '🖼️' };
    var names = { lyrics: 'Letra', chords: 'Acordes', tabs: 'Tablatura', sheet: 'Partitura', notes: 'Notas', pdf: 'PDF', image: 'Imagen' };
    
    container.innerHTML = currentSongResources.map(function(r) {
        return '<div class="song-item"><div class="song-thumb">' + (icons[r.type] || '📎') + '</div>' +
            '<div class="song-info"><h4>' + (r.title || names[r.type] || 'Recurso') + '</h4><p>' + (r.user_name || '') + '</p></div>' +
            '<div class="song-actions"><button class="btn btn-ghost btn-sm" onclick="viewResource(' + r.id + ')">👁️</button>' +
            (r.file_url ? '<a href="' + r.file_url + '" target="_blank" class="btn btn-ghost btn-sm">⬇️</a>' : '') +
            '<button class="btn btn-ghost btn-sm" onclick="deleteResource(' + r.id + ')">🗑️</button></div></div>';
    }).join('');
}

function viewResource(id) {
    var r = currentSongResources.find(function(x) { return x.id === id; });
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
    if (confirm('¿Eliminar recurso?')) {
        await apiDelete('/song-resources/' + id);
        loadResources();
        showToast('Eliminado');
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
    var type = document.getElementById('resourceType').value;
    var isText = ['lyrics', 'chords', 'tabs', 'notes'].indexOf(type) !== -1;
    document.getElementById('resourceContentGroup').style.display = isText ? 'block' : 'none';
    document.getElementById('resourceFileGroup').style.display = isText ? 'none' : 'block';
}

async function saveResource() {
    var type = document.getElementById('resourceType').value;
    var title = document.getElementById('resourceTitle').value.trim();
    var isShared = document.getElementById('resourceShared').checked;
    var isText = ['lyrics', 'chords', 'tabs', 'notes'].indexOf(type) !== -1;
    
    var fileUrl = null, fileType = null, content = null;
    
    if (isText) {
        content = document.getElementById('resourceContent').value;
        if (!content.trim()) { showToast('Ingresa contenido', 'warning'); return; }
    } else {
        var fileInput = document.getElementById('resourceFileInput');
        if (!fileInput.files.length) { showToast('Selecciona archivo', 'warning'); return; }
        var file = fileInput.files[0];
        if (file.size > 10485760) { showToast('Max 10MB', 'error'); return; }
        try {
            document.getElementById('uploadProgress').style.display = 'block';
            var result = await uploadToCloudinary(file, function(p) {
                document.getElementById('uploadProgressBar').style.width = p + '%';
            });
            fileUrl = result.url;
            fileType = result.format;
        } catch (e) {
            showToast('Error subiendo', 'error');
            document.getElementById('uploadProgress').style.display = 'none';
            return;
        }
    }
    
    try {
        await apiPost('/song-resources', {
            song_id: currentResourceSongId, type: type, title: title || null,
            content: content, file_url: fileUrl, file_type: fileType, is_shared: isShared ? 1 : 0
        });
        closeAddResourceModal();
        loadResources();
        showToast('Guardado');
    } catch (e) {
        showToast('Error', 'error');
    }
}

function nl2br(str) {
    return str ? str.replace(/\n/g, '<br>') : '';
}

loadSongs();
