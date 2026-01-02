checkAuth();
setupUserInfo();

let allSetlists = [];
let allSongs = [];
let currentSetlist = null;
let currentSongResources = [];
let currentResourceSongId = null;
let viewMode = 'cards';
let inStageMode = false;

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

async function loadSetlists() {
    try {
        [allSetlists, allSongs] = await Promise.all([
            apiGet('/setlists'),
            apiGet('/songs')
        ]);
        allSetlists = Array.isArray(allSetlists) ? allSetlists : [];
        allSongs = Array.isArray(allSongs) ? allSongs : [];
        renderSetlists();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('setlistsContainer').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(mode === 'cards' ? 'tarjeta' : 'tabla'));
    });
    renderSetlists();
}

function renderSetlists() {
    const container = document.getElementById('setlistsContainer');

    if (!allSetlists.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>Sin set lists</h3><p>Crea tu primer set list</p></div>';
        return;
    }

    if (viewMode === 'table') {
        container.innerHTML = '<div class="table-container"><table><thead><tr><th>Nombre</th><th>Canciones</th><th>Duración</th><th></th></tr></thead><tbody>' +
            allSetlists.map(s => '<tr><td><strong>' + s.name + '</strong></td><td>' + (s.total_songs || 0) + '</td><td>' + formatDuration(s.total_duration_seconds) + '</td><td>' +
                '<button class="btn btn-ghost btn-sm" onclick="viewSetlist(' + s.id + ')">Ver</button>' +
                (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="editSetlist(' + s.id + ')">✏️</button><button class="btn btn-ghost btn-sm" onclick="deleteSetlist(' + s.id + ')">🗑️</button>' : '') +
                '</td></tr>').join('') + '</tbody></table></div>';
    } else {
        container.innerHTML = '<div class="setlist-grid">' + allSetlists.map(s => 
            '<div class="setlist-card" onclick="viewSetlist(' + s.id + ')"><div class="icon">📋</div><h4>' + s.name + '</h4>' +
            '<div class="meta"><span>' + (s.total_songs || 0) + ' canciones</span><span>' + formatDuration(s.total_duration_seconds) + '</span></div>' +
            (isAdmin() ? '<div class="actions" onclick="event.stopPropagation();"><button class="btn btn-ghost btn-sm" onclick="editSetlist(' + s.id + ')">Editar</button><button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="deleteSetlist(' + s.id + ')">Eliminar</button></div>' : '') +
            '</div>').join('') + '</div>';
    }
}

async function viewSetlist(id) {
    try {
        currentSetlist = await apiGet('/setlists/' + id);
        document.getElementById('viewSetlistTitle').textContent = currentSetlist.name;
        document.getElementById('viewTotalSongs').textContent = (currentSetlist.songs?.length || 0) + ' canciones';
        document.getElementById('viewTotalDuration').textContent = formatDuration(currentSetlist.total_duration_seconds);
        renderSetlistSongs();
        document.getElementById('viewSetlistModal').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar setlist', 'error');
    }
}

function renderSetlistSongs() {
    const container = document.getElementById('setlistSongs');
    const songs = currentSetlist.songs || [];

    if (!songs.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🎵</div><h3>Sin canciones</h3></div>';
        return;
    }

    container.innerHTML = songs.map(function(s, idx) {
        return '<div class="song-item">' +
            '<div class="song-order-controls">' +
                '<button class="btn btn-ghost btn-sm" onclick="moveSong(' + idx + ', -1)"' + (idx === 0 ? ' disabled' : '') + '>⬆️</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="moveSong(' + idx + ', 1)"' + (idx === songs.length - 1 ? ' disabled' : '') + '>⬇️</button>' +
            '</div>' +
            '<span style="font-weight: 600; color: var(--text-tertiary); min-width: 24px;">' + (idx + 1) + '</span>' +
            '<div class="song-info">' +
                '<h4>' + s.name + '</h4>' +
                '<p>' + (s.artist || 'Sin artista') + (s.musical_key ? ' · ' + s.musical_key : '') + '</p>' +
            '</div>' +
            '<div class="song-actions" style="display: flex; gap: 4px;">' +
                (s.lyrics ? '<button class="btn btn-ghost btn-sm" onclick="viewLyrics(' + idx + ')" title="Letra">📝</button>' : '') +
                '<button class="btn btn-ghost btn-sm" onclick="openSongResources(' + (s.song_id || s.id) + ', \'' + s.name.replace(/'/g, "\\'") + '\')" title="Recursos">📎</button>' +
                (s.video_url ? '<a href="' + s.video_url + '" target="_blank" class="btn btn-ghost btn-sm" title="Video">🎬</a>' : '') +
            '</div>' +
            '<span class="badge badge-neutral">' + formatDuration(s.duration_seconds) + '</span>' +
            '<button class="btn btn-ghost btn-sm" onclick="removeSongFromSetlist(' + s.id + ')" style="color: var(--danger);">✕</button>' +
        '</div>';
    }).join('');
}

// Ver letra
function viewLyrics(idx) {
    const song = currentSetlist.songs[idx];
    if (!song || !song.lyrics) {
        showToast('Sin letra disponible');
        return;
    }
    document.getElementById('lyricsModalTitle').textContent = song.name + ' - Letra';
    document.getElementById('lyricsContent').innerHTML = nl2br(song.lyrics);
    document.getElementById('lyricsModal').classList.add('active');
}

function closeLyricsModal() {
    document.getElementById('lyricsModal').classList.remove('active');
}

// Recursos de canción
async function openSongResources(songId, songName) {
    currentResourceSongId = songId;
    document.getElementById('resourcesSongName').textContent = songName;
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
        currentSongResources = await apiGet('/song-resources/song/' + currentResourceSongId + '?filter=' + filter) || [];
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
    
    var typeIcons = { lyrics: '📝', chords: '🎸', tabs: '🎼', sheet: '📄', notes: '📒', pdf: '📕', image: '🖼️', audio: '🎵' };
    var typeNames = { lyrics: 'Letra', chords: 'Acordes', tabs: 'Tablatura', sheet: 'Partitura', notes: 'Notas', pdf: 'PDF', image: 'Imagen', audio: 'Audio' };
    
    container.innerHTML = currentSongResources.map(function(r) {
        return '<div class="song-item resource-item">' +
            '<div class="song-thumb">' + (typeIcons[r.type] || '📎') + '</div>' +
            '<div class="song-info"><h4>' + (r.title || typeNames[r.type] || 'Recurso') + '</h4><p>' + (r.user_name || 'Usuario') + ' · ' + (r.is_shared ? '🌐 Compartido' : '🔒 Privado') + '</p></div>' +
            '<div class="song-actions">' +
                '<button class="btn btn-ghost btn-sm" onclick="viewResource(' + r.id + ')">👁️</button>' +
                (r.file_url ? '<a href="' + r.file_url + '" target="_blank" class="btn btn-ghost btn-sm">⬇️</a>' : '') +
                '<button class="btn btn-ghost btn-sm" onclick="deleteResource(' + r.id + ')">🗑️</button>' +
            '</div></div>';
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
    if (confirm('¿Eliminar este recurso?')) {
        await apiDelete('/song-resources/' + id);
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
    var type = document.getElementById('resourceType').value;
    var textTypes = ['lyrics', 'chords', 'tabs', 'notes'];
    var isText = textTypes.indexOf(type) !== -1;
    document.getElementById('resourceContentGroup').style.display = isText ? 'block' : 'none';
    document.getElementById('resourceFileGroup').style.display = isText ? 'none' : 'block';
}

async function saveResource() {
    var type = document.getElementById('resourceType').value;
    var title = document.getElementById('resourceTitle').value.trim();
    var isShared = document.getElementById('resourceShared').checked;
    
    var textTypes = ['lyrics', 'chords', 'tabs', 'notes'];
    var isText = textTypes.indexOf(type) !== -1;
    
    var fileUrl = null;
    var fileType = null;
    var content = null;
    
    if (isText) {
        content = document.getElementById('resourceContent').value;
        if (!content.trim()) {
            showToast('Ingresa el contenido', 'warning');
            return;
        }
    } else {
        var fileInput = document.getElementById('resourceFileInput');
        if (!fileInput.files.length) {
            showToast('Selecciona un archivo', 'warning');
            return;
        }
        
        var file = fileInput.files[0];
        if (file.size > 10 * 1024 * 1024) {
            showToast('El archivo no puede superar 10MB', 'error');
            return;
        }
        
        try {
            document.getElementById('uploadProgress').style.display = 'block';
            var result = await uploadToCloudinary(file, function(percent) {
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
            type: type,
            title: title || null,
            content: content,
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

// Movimiento de canciones
async function moveSong(idx, direction) {
    var songs = currentSetlist.songs;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= songs.length) return;

    var temp = songs[idx];
    songs[idx] = songs[newIdx];
    songs[newIdx] = temp;

    try {
        var order = songs.map(function(s, i) { return { song_id: s.song_id || s.id, position: i + 1 }; });
        await apiPut('/setlists/' + currentSetlist.id + '/songs/reorder', { songs: order });
        songs.forEach(function(s, i) { s.position = i + 1; });
        renderSetlistSongs();
        showToast('Orden actualizado');
    } catch (error) {
        songs[newIdx] = songs[idx];
        songs[idx] = temp;
        showToast('Error al mover');
    }
}

async function addSongToSetlist(songId) {
    try {
        await apiPost('/setlists/' + currentSetlist.id + '/songs', { song_id: songId });
        viewSetlist(currentSetlist.id);
        filterAvailableSongs();
        loadSetlists();
        showToast('Canción agregada');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al agregar');
    }
}

async function removeSongFromSetlist(setlistSongId) {
    if (confirm('¿Quitar esta canción?')) {
        await apiDelete('/setlists/' + currentSetlist.id + '/songs/' + setlistSongId);
        viewSetlist(currentSetlist.id);
        loadSetlists();
        showToast('Canción quitada');
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
    var search = document.getElementById('searchSongInput').value.toLowerCase();
    var setlistSongIds = (currentSetlist.songs || []).map(function(s) { return s.song_id; });

    var available = allSongs.filter(function(s) {
        return setlistSongIds.indexOf(s.id) === -1 &&
            (s.name.toLowerCase().indexOf(search) !== -1 || (s.artist || '').toLowerCase().indexOf(search) !== -1);
    });

    var container = document.getElementById('availableSongs');
    container.innerHTML = available.length ? available.map(function(s) {
        return '<div class="song-item"><div class="song-info"><h4>' + s.name + '</h4><p>' + (s.artist || 'Sin artista') + '</p></div>' +
            '<button class="btn btn-primary btn-sm" onclick="addSongToSetlist(' + s.id + ')">Agregar</button></div>';
    }).join('') : '<div class="empty-state"><p>No hay canciones disponibles</p></div>';
}

// Modo Escenario
function openStageMode() {
    inStageMode = true;
    document.getElementById('stageModeTitle').textContent = currentSetlist.name;
    initStageTheme();
    renderStageMode();
    document.getElementById('stageModeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderStageMode() {
    var songs = currentSetlist.songs || [];
    var container = document.getElementById('stageModeContent');

    if (!songs.length) {
        container.innerHTML = '<div class="empty-state" style="color:#fff;"><div class="icon">🎵</div><h3>Sin canciones</h3></div>';
        return;
    }

    container.innerHTML = songs.map(function(s, idx) {
        return '<div class="stage-song" id="stage-song-' + idx + '">' +
            '<div class="stage-song-header">' +
                '<div class="stage-song-left">' +
                    '<span class="stage-song-number">' + (idx + 1) + '.</span>' +
                    '<div><div class="stage-song-title">' + s.name + '</div><div class="stage-song-artist">' + (s.artist || '') + '</div></div>' +
                '</div>' +
                '<div class="stage-song-badges">' +
                    (s.musical_key ? '<span class="stage-badge">' + s.musical_key + '</span>' : '') +
                    (s.bpm ? '<span class="stage-badge">' + s.bpm + ' BPM</span>' : '') +
                '</div>' +
            '</div>' +
            '<div class="stage-controls">' +
                '<button class="stage-btn" onclick="moveSongStage(' + idx + ', -1)"' + (idx === 0 ? ' disabled' : '') + '>⬆️ Subir</button>' +
                '<button class="stage-btn" onclick="moveSongStage(' + idx + ', 1)"' + (idx === songs.length - 1 ? ' disabled' : '') + '>⬇️ Bajar</button>' +
                (s.lyrics ? '<button class="stage-btn" onclick="toggleStageLyrics(' + idx + ')">📄 Letra</button>' : '') +
                '<button class="stage-btn" onclick="openSongResources(' + (s.song_id || s.id) + ', \'' + s.name.replace(/'/g, "\\'") + '\')">📎 Recursos</button>' +
                '<button class="stage-btn danger" onclick="removeSongStage(' + idx + ')">✕ Quitar</button>' +
            '</div>' +
            '<div class="stage-lyrics" id="stage-lyrics-' + idx + '" style="display: none;"><pre>' + (s.lyrics || '') + '</pre></div>' +
        '</div>';
    }).join('') + '<div style="text-align: center; padding: 20px;"><button class="btn btn-primary" onclick="openAddSongFromStage()">+ Agregar canción</button></div>';
}

function toggleStageLyrics(idx) {
    var el = document.getElementById('stage-lyrics-' + idx);
    var isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    if (isHidden) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleStageTheme() {
    var modal = document.getElementById('stageModeModal');
    var current = localStorage.getItem('stageTheme') || 'dark';
    var newTheme = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('stageTheme', newTheme);
    modal.classList.toggle('stage-light', newTheme === 'light');
    document.getElementById('stageThemeBtn').textContent = newTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}

function initStageTheme() {
    var theme = localStorage.getItem('stageTheme') || 'dark';
    var modal = document.getElementById('stageModeModal');
    modal.classList.toggle('stage-light', theme === 'light');
    document.getElementById('stageThemeBtn').textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}

async function moveSongStage(idx, direction) {
    var songs = currentSetlist.songs;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= songs.length) return;

    var temp = songs[idx];
    songs[idx] = songs[newIdx];
    songs[newIdx] = temp;

    try {
        var order = songs.map(function(s, i) { return { song_id: s.song_id || s.id, position: i + 1 }; });
        await apiPut('/setlists/' + currentSetlist.id + '/songs/reorder', { songs: order });
        songs.forEach(function(s, i) { s.position = i + 1; });
        renderStageMode();
        showToast('Orden actualizado');
    } catch (error) {
        songs[newIdx] = songs[idx];
        songs[idx] = temp;
        showToast('Error al mover');
    }
}

async function removeSongStage(idx) {
    var song = currentSetlist.songs[idx];
    if (!confirm('¿Quitar "' + song.name + '"?')) return;

    try {
        await apiDelete('/setlists/' + currentSetlist.id + '/songs/' + song.id);
        currentSetlist.songs.splice(idx, 1);
        renderStageMode();
        loadSetlists();
        showToast('Canción quitada');
    } catch (error) {
        showToast('Error al quitar');
    }
}

function openAddSongFromStage() {
    document.getElementById('searchSongInput').value = '';
    filterAvailableSongs();
    document.getElementById('addSongModal').classList.add('active');
}

function closeStageMode() {
    inStageMode = false;
    document.getElementById('stageModeModal').classList.remove('active');
    document.body.style.overflow = '';
}

function closeViewModal() {
    document.getElementById('viewSetlistModal').classList.remove('active');
}

function openSetlistModal(setlist) {
    document.getElementById('setlistModalTitle').textContent = setlist ? 'Editar Set List' : 'Nuevo Set List';
    document.getElementById('setlistId').value = setlist ? setlist.id : '';
    document.getElementById('setlistName').value = setlist ? setlist.name : '';
    document.getElementById('setlistDescription').value = setlist ? (setlist.description || '') : '';
    document.getElementById('setlistModal').classList.add('active');
}

function closeSetlistModal() {
    document.getElementById('setlistModal').classList.remove('active');
}

function editSetlist(id) {
    var setlist = allSetlists.find(function(s) { return s.id === id; });
    openSetlistModal(setlist);
}

async function saveSetlist() {
    var id = document.getElementById('setlistId').value;
    var data = {
        name: document.getElementById('setlistName').value,
        description: document.getElementById('setlistDescription').value
    };

    if (id) {
        await apiPut('/setlists/' + id, data);
    } else {
        await apiPost('/setlists', data);
    }

    closeSetlistModal();
    loadSetlists();
    showToast('Set list guardado');
}

async function deleteSetlist(id) {
    if (confirm('¿Eliminar este set list?')) {
        await apiDelete('/setlists/' + id);
        loadSetlists();
        showToast('Set list eliminado');
    }
}

function nl2br(str) {
    if (!str) return '';
    return str.replace(/\n/g, '<br>');
}

loadSetlists();
