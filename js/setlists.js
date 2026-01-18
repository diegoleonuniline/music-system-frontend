checkAuth();
setupUserInfo();

var allSetlists = [];
var allSongs = [];
var currentSetlist = null;
var currentSongResources = [];
var currentResourceSongId = null;
var viewMode = 'table';
var inStageMode = false;

// Para el modal de crear/editar
var modalSelectedSongs = [];

// Para modal de confirmación
var confirmCallback = null;

// Teleprompter
var tpInterval = null;
var tpSpeed = 25;
var tpRunning = false;
var tpFontSizeVal = 32;
var tpAlign = 'left';
var tpThemes = ['dark', 'light', 'sepia', 'green'];
var tpThemeIndex = 0;
var tpCurrentSong = null;

function showConfirm(message, callback) {
    confirmCallback = callback;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

function executeConfirm() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirm();
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

async function loadSetlists() {
    try {
        var results = await Promise.all([
            apiGet('/setlists'),
            apiGet('/songs')
        ]);
        allSetlists = Array.isArray(results[0]) ? results[0] : [];
        allSongs = Array.isArray(results[1]) ? results[1] : [];
        renderSetlists();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('setlistsContainer').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(function(btn) {
        btn.classList.toggle('active', btn.textContent.toLowerCase().indexOf(mode === 'cards' ? 'tarjeta' : 'tabla') !== -1);
    });
    renderSetlists();
}

function renderSetlists() {
    var container = document.getElementById('setlistsContainer');

    if (!allSetlists.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>Sin set lists</h3><p>Crea tu primer set list</p></div>';
        return;
    }

    if (viewMode === 'table') {
        container.innerHTML = '<div class="table-container"><table><thead><tr>' +
            '<th>Nombre</th><th>Descripción</th><th>Canciones</th><th>Duración</th><th>Acciones</th>' +
            '</tr></thead><tbody>' +
            allSetlists.map(function(s) {
                return '<tr onclick="viewSetlist(' + s.id + ')" style="cursor:pointer;">' +
                    '<td><strong>📋 ' + s.name + '</strong></td>' +
                    '<td>' + (s.description || '-') + '</td>' +
                    '<td>' + (s.total_songs || 0) + '</td>' +
                    '<td>' + formatDuration(s.total_duration_seconds) + '</td>' +
                    '<td onclick="event.stopPropagation()">' +
                        '<button class="btn btn-ghost btn-sm" onclick="viewSetlist(' + s.id + ')">👁️</button>' +
                        (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="editSetlist(' + s.id + ')">✏️</button>' +
                        '<button class="btn btn-ghost btn-sm btn-danger-text" onclick="deleteSetlist(' + s.id + ')">🗑️</button>' : '') +
                    '</td></tr>';
            }).join('') + '</tbody></table></div>';
    } else {
        container.innerHTML = '<div class="setlist-grid">' + allSetlists.map(function(s) { 
            return '<div class="setlist-card" onclick="viewSetlist(' + s.id + ')"><div class="icon">📋</div><h4>' + s.name + '</h4>' +
            '<div class="meta"><span>' + (s.total_songs || 0) + ' canciones</span><span>' + formatDuration(s.total_duration_seconds) + '</span></div>' +
            (isAdmin() ? '<div class="actions" onclick="event.stopPropagation();"><button class="btn btn-ghost btn-sm" onclick="editSetlist(' + s.id + ')">Editar</button><button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="deleteSetlist(' + s.id + ')">Eliminar</button></div>' : '') +
            '</div>';
        }).join('') + '</div>';
    }
}

// ============ MODAL CREAR/EDITAR CON CANCIONES ============

function openSetlistModal(setlist) {
    document.getElementById('setlistModalTitle').textContent = setlist ? 'Editar Set List' : 'Nuevo Set List';
    document.getElementById('setlistId').value = setlist ? setlist.id : '';
    document.getElementById('setlistName').value = setlist ? setlist.name : '';
    document.getElementById('setlistDescription').value = setlist ? (setlist.description || '') : '';
    
    modalSelectedSongs = [];
    
    if (setlist && setlist.id) {
        loadSetlistSongsForEdit(setlist.id);
    } else {
        renderModalSongs();
    }
    
    document.getElementById('setlistModal').classList.add('active');
}

async function loadSetlistSongsForEdit(setlistId) {
    try {
        var data = await apiGet('/setlists/' + setlistId);
        if (data && data.songs) {
            modalSelectedSongs = data.songs.map(function(s) {
                return {
                    id: s.song_id || s.id,
                    setlist_song_id: s.id,
                    name: s.name,
                    artist: s.artist,
                    duration_seconds: s.duration_seconds,
                    musical_key: s.musical_key
                };
            });
        }
        renderModalSongs();
    } catch (e) {
        console.error('Error cargando canciones:', e);
        renderModalSongs();
    }
}

function renderModalSongs() {
    var selectedIds = modalSelectedSongs.map(function(s) { return s.id; });
    
    var available = allSongs.filter(function(s) {
        return selectedIds.indexOf(s.id) === -1;
    });
    
    var search = (document.getElementById('modalSongSearch')?.value || '').toLowerCase();
    if (search) {
        available = available.filter(function(s) {
            return s.name.toLowerCase().indexOf(search) !== -1 || 
                   (s.artist || '').toLowerCase().indexOf(search) !== -1;
        });
    }
    
    var totalSeconds = modalSelectedSongs.reduce(function(sum, s) {
        return sum + (s.duration_seconds || 0);
    }, 0);
    
    document.getElementById('modalTotalInfo').textContent = modalSelectedSongs.length + ' canciones · ' + formatDuration(totalSeconds);
    
    var selectedContainer = document.getElementById('modalSelectedSongs');
    if (!modalSelectedSongs.length) {
        selectedContainer.innerHTML = '<div class="empty-hint">Agrega canciones de la lista de abajo</div>';
    } else {
        selectedContainer.innerHTML = modalSelectedSongs.map(function(s, idx) {
            return '<div class="modal-song-item selected" data-idx="' + idx + '">' +
                '<div class="song-order">' +
                    '<button class="btn-mini" onclick="moveModalSong(' + idx + ', -1)"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
                    '<span>' + (idx + 1) + '</span>' +
                    '<button class="btn-mini" onclick="moveModalSong(' + idx + ', 1)"' + (idx === modalSelectedSongs.length - 1 ? ' disabled' : '') + '>▼</button>' +
                '</div>' +
                '<div class="song-info">' +
                    '<strong>' + s.name + '</strong>' +
                    '<span>' + (s.artist || '') + (s.musical_key ? ' · ' + s.musical_key : '') + '</span>' +
                '</div>' +
                '<span class="song-duration">' + formatDuration(s.duration_seconds) + '</span>' +
                '<button class="btn-remove" onclick="removeModalSong(' + idx + ')">✕</button>' +
            '</div>';
        }).join('');
    }
    
    var availableContainer = document.getElementById('modalAvailableSongs');
    if (!available.length) {
        availableContainer.innerHTML = '<div class="empty-hint">' + (search ? 'Sin resultados' : 'Todas las canciones agregadas') + '</div>';
    } else {
        availableContainer.innerHTML = available.map(function(s) {
            return '<div class="modal-song-item available" onclick="addModalSong(' + s.id + ')">' +
                '<div class="song-info">' +
                    '<strong>' + s.name + '</strong>' +
                    '<span>' + (s.artist || '') + '</span>' +
                '</div>' +
                '<span class="song-duration">' + formatDuration(s.duration_seconds) + '</span>' +
                '<span class="btn-add">+</span>' +
            '</div>';
        }).join('');
    }
}

function addModalSong(songId) {
    var song = allSongs.find(function(s) { return s.id === songId; });
    if (!song) return;
    
    modalSelectedSongs.push({
        id: song.id,
        name: song.name,
        artist: song.artist,
        duration_seconds: song.duration_seconds,
        musical_key: song.musical_key
    });
    
    renderModalSongs();
}

function removeModalSong(idx) {
    modalSelectedSongs.splice(idx, 1);
    renderModalSongs();
}

function moveModalSong(idx, direction) {
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= modalSelectedSongs.length) return;
    
    var temp = modalSelectedSongs[idx];
    modalSelectedSongs[idx] = modalSelectedSongs[newIdx];
    modalSelectedSongs[newIdx] = temp;
    
    renderModalSongs();
}

function filterModalSongs() {
    renderModalSongs();
}

function closeSetlistModal() {
    document.getElementById('setlistModal').classList.remove('active');
    modalSelectedSongs = [];
}

async function saveSetlist() {
    var id = document.getElementById('setlistId').value;
    var name = document.getElementById('setlistName').value.trim();
    var description = document.getElementById('setlistDescription').value.trim();
    
    if (!name) {
        showToast('Ingresa un nombre', 'warning');
        return;
    }
    
    try {
        var setlistId = id;
        
        if (id) {
            await apiPut('/setlists/' + id, { name: name, description: description });
        } else {
            var result = await apiPost('/setlists', { name: name, description: description });
            setlistId = result.id;
        }
        
        await syncSetlistSongs(setlistId, id ? true : false);
        
        closeSetlistModal();
        loadSetlists();
        showToast('Set list guardado');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar', 'error');
    }
}

async function syncSetlistSongs(setlistId, isEdit) {
    if (isEdit) {
        var current = await apiGet('/setlists/' + setlistId);
        var currentSongs = current.songs || [];
        
        var currentIds = currentSongs.map(function(s) { return s.song_id; });
        var wantedIds = modalSelectedSongs.map(function(s) { return s.id; });
        
        for (var i = 0; i < currentSongs.length; i++) {
            var cs = currentSongs[i];
            if (wantedIds.indexOf(cs.song_id) === -1) {
                await apiDelete('/setlists/' + setlistId + '/songs/' + cs.id);
            }
        }
        
        for (var j = 0; j < modalSelectedSongs.length; j++) {
            var ms = modalSelectedSongs[j];
            if (currentIds.indexOf(ms.id) === -1) {
                await apiPost('/setlists/' + setlistId + '/songs', { song_id: ms.id });
            }
        }
        
        if (modalSelectedSongs.length > 0) {
            var updatedSetlist = await apiGet('/setlists/' + setlistId);
            var songMap = {};
            (updatedSetlist.songs || []).forEach(function(s) {
                songMap[s.song_id] = s.id;
            });
            
            var order = modalSelectedSongs.map(function(s, idx) {
                return { id: songMap[s.id], position: idx + 1 };
            }).filter(function(o) { return o.id; });
            
            if (order.length > 0) {
                await apiPut('/setlists/' + setlistId + '/reorder', { songs: order });
            }
        }
    } else {
        for (var k = 0; k < modalSelectedSongs.length; k++) {
            await apiPost('/setlists/' + setlistId + '/songs', { 
                song_id: modalSelectedSongs[k].id,
                position: k + 1
            });
        }
    }
}

async function editSetlist(id) {
    if (event) event.stopPropagation();
    var setlist = allSetlists.find(function(s) { return s.id === id; });
    openSetlistModal(setlist);
}

async function deleteSetlist(id) {
    if (event) event.stopPropagation();
    showConfirm('¿Eliminar este set list?', async function() {
        await apiDelete('/setlists/' + id);
        loadSetlists();
        showToast('Set list eliminado');
    });
}

// ============ VISTA DE SETLIST ============

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
    var container = document.getElementById('setlistSongs');
    var songs = currentSetlist.songs || [];

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

function viewLyrics(idx) {
    var song = currentSetlist.songs[idx];
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
        if (r.type === 'pdf' || r.file_type === 'pdf' || r.file_url.indexOf('.pdf') !== -1) {
            window.open(r.file_url, '_blank');
        } else if (r.type === 'image' || ['jpg','jpeg','png','webp','gif'].indexOf(r.file_type) !== -1) {
            openFullscreenResource(r.title || 'Imagen', '<img src="' + r.file_url + '" style="max-width:100%;max-height:100%;object-fit:contain;">');
        } else {
            window.open(r.file_url, '_blank');
        }
    } else if (r.content) {
        openFullscreenResource(r.title || 'Contenido', '<pre style="white-space:pre-wrap;font-family:monospace;padding:20px;">' + r.content + '</pre>');
    }
}

function openFullscreenResource(title, content) {
    document.getElementById('viewResourceTitle').textContent = title;
    document.getElementById('viewResourceContent').innerHTML = content;
    var modal = document.getElementById('viewResourceModal');
    modal.querySelector('.modal').classList.add('modal-fullscreen');
    modal.classList.add('active');
}

function closeViewResourceModal() {
    var modal = document.getElementById('viewResourceModal');
    modal.querySelector('.modal').classList.remove('modal-fullscreen');
    modal.classList.remove('active');
}

async function deleteResource(id) {
    showConfirm('¿Eliminar este recurso?', async function() {
        await apiDelete('/song-resources/' + id);
        loadResources();
        showToast('Recurso eliminado');
    });
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
                var textEl = document.getElementById('uploadProgressText');
                if (textEl) textEl.textContent = percent + '%';
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

async function moveSong(idx, direction) {
    var songs = currentSetlist.songs;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= songs.length) return;

    var temp = songs[idx];
    songs[idx] = songs[newIdx];
    songs[newIdx] = temp;

    songs.forEach(function(s, i) { s.position = i + 1; });
    renderSetlistSongs();

    try {
        var order = songs.map(function(s, i) { 
            return { id: s.id, position: i + 1 }; 
        });
        await apiPut('/setlists/' + currentSetlist.id + '/reorder', { songs: order });
    } catch (error) {
        songs[newIdx] = songs[idx];
        songs[idx] = temp;
        songs.forEach(function(s, i) { s.position = i + 1; });
        renderSetlistSongs();
        showToast('Error al mover', 'error');
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
    showConfirm('¿Quitar esta canción?', async function() {
        await apiDelete('/setlists/' + currentSetlist.id + '/songs/' + setlistSongId);
        viewSetlist(currentSetlist.id);
        loadSetlists();
        showToast('Canción quitada');
    });
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

function closeViewModal() {
    document.getElementById('viewSetlistModal').classList.remove('active');
}

// ============ STAGE MODE ============

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

    var html = '<div style="max-width:900px;margin:0 auto;">';
    html += songs.map(function(s, idx) {
        return '<div class="stage-song" id="stage-song-' + idx + '">' +
            '<div class="stage-song-header">' +
                '<div class="stage-song-left">' +
                    '<span class="stage-song-number">' + (idx + 1) + '.</span>' +
                    '<div><div class="stage-song-title">' + s.name + '</div><div class="stage-song-artist">' + (s.artist || '') + '</div></div>' +
                '</div>' +
                '<div class="stage-song-badges">' +
                    (s.musical_key ? '<span class="stage-badge">' + s.musical_key + '</span>' : '') +
                    (s.bpm ? '<span class="stage-badge">' + s.bpm + ' BPM</span>' : '') +
                    '<span class="stage-badge">⏱ ' + formatDuration(s.duration_seconds) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="stage-controls">' +
                '<button class="stage-btn" onclick="moveSongStage(' + idx + ', -1)"' + (idx === 0 ? ' disabled' : '') + '>⬆️ Subir</button>' +
                '<button class="stage-btn" onclick="moveSongStage(' + idx + ', 1)"' + (idx === songs.length - 1 ? ' disabled' : '') + '>⬇️ Bajar</button>' +
                (s.lyrics ? '<button class="stage-btn" onclick="toggleStageLyrics(' + idx + ')">📄 Letra</button>' : '') +
                (s.lyrics ? '<button class="stage-btn" onclick="openTeleprompter(' + idx + ')" style="background:#4F46E5;">📺 Teleprompter</button>' : '') +
                '<button class="stage-btn" onclick="openSongResources(' + (s.song_id || s.id) + ', \'' + s.name.replace(/'/g, "\\'") + '\')">📎 Recursos</button>' +
                '<button class="stage-btn danger" onclick="removeSongStage(' + idx + ')">✕ Quitar</button>' +
            '</div>' +
            '<div class="stage-lyrics" id="stage-lyrics-' + idx + '" style="display: none;"><pre>' + (s.lyrics || '') + '</pre></div>' +
        '</div>';
    }).join('');
    html += '<div style="text-align: center; padding: 20px;"><button class="btn btn-primary" onclick="openAddSongFromStage()">+ Agregar canción</button></div>';
    html += '</div>';
    container.innerHTML = html;
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

    songs.forEach(function(s, i) { s.position = i + 1; });
    renderStageMode();

    try {
        var order = songs.map(function(s, i) { 
            return { id: s.id, position: i + 1 }; 
        });
        await apiPut('/setlists/' + currentSetlist.id + '/reorder', { songs: order });
    } catch (error) {
        songs[newIdx] = songs[idx];
        songs[idx] = temp;
        songs.forEach(function(s, i) { s.position = i + 1; });
        renderStageMode();
        showToast('Error al mover', 'error');
    }
}

async function removeSongStage(idx) {
    var song = currentSetlist.songs[idx];
    showConfirm('¿Quitar "' + song.name + '"?', async function() {
        try {
            await apiDelete('/setlists/' + currentSetlist.id + '/songs/' + song.id);
            currentSetlist.songs.splice(idx, 1);
            renderStageMode();
            loadSetlists();
            showToast('Canción quitada');
        } catch (error) {
            showToast('Error al quitar');
        }
    });
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

// ============ TELEPROMPTER ============

function openTeleprompter(idx) {
    var song = currentSetlist.songs[idx];
    if (!song || !song.lyrics) {
        showToast('Sin letra disponible');
        return;
    }
    
    tpCurrentSong = song;
    
    document.getElementById('tpTitle').textContent = song.name;
    document.getElementById('tpArtist').textContent = song.artist || '';
    
    var keyEl = document.getElementById('tpKey');
    var bpmEl = document.getElementById('tpBpm');
    
    if (song.musical_key) {
        keyEl.textContent = song.musical_key;
        keyEl.style.display = 'inline-flex';
    } else {
        keyEl.style.display = 'none';
    }
    
    if (song.bpm) {
        bpmEl.textContent = song.bpm + ' BPM';
        bpmEl.style.display = 'inline-flex';
    } else {
        bpmEl.style.display = 'none';
    }
    
    var tpText = document.getElementById('tpText');
    tpText.textContent = song.lyrics;
    tpText.style.fontSize = tpFontSizeVal + 'px';
    tpText.classList.toggle('tp-center', tpAlign === 'center');
    
    tpApplyTheme();
    tpUpdateAlignBtn();
    
    document.getElementById('tpSpeedRange').value = tpSpeed;
    document.getElementById('tpSpeedVal').textContent = tpSpeed;
    
    document.getElementById('tpControls').classList.remove('tp-hidden');
    document.getElementById('tpShowBtn').classList.remove('visible');
    
    document.getElementById('tpOverlay').classList.add('active');
    document.getElementById('tpBody').scrollTop = 0;
}

function closeTeleprompter() {
    tpStop();
    document.getElementById('tpOverlay').classList.remove('active');
    tpCurrentSong = null;
}

function tpToggle() {
    tpRunning ? tpStop() : tpStart();
}

function tpStart() {
    if (tpRunning) return;
    tpRunning = true;
    
    var btn = document.getElementById('tpPlayBtn');
    btn.textContent = '⏸';
    btn.classList.add('active');
    
    var body = document.getElementById('tpBody');
    body.classList.add('no-smooth');
    
    var fps = 60;
    var pxPerFrame = tpSpeed / fps;
    
    tpInterval = setInterval(function() {
        if (body.scrollTop + body.clientHeight >= body.scrollHeight - 5) {
            tpStop();
            return;
        }
        body.scrollTop += pxPerFrame;
    }, 1000 / fps);
}

function tpStop() {
    tpRunning = false;
    
    if (tpInterval) {
        clearInterval(tpInterval);
        tpInterval = null;
    }
    
    var btn = document.getElementById('tpPlayBtn');
    btn.textContent = '▶';
    btn.classList.remove('active');
    
    document.getElementById('tpBody').classList.remove('no-smooth');
}

function tpRestart() {
    tpStop();
    document.getElementById('tpBody').scrollTop = 0;
}

function tpSetSpeed(val) {
    tpSpeed = parseInt(val);
    document.getElementById('tpSpeedVal').textContent = tpSpeed;
    
    if (tpRunning) {
        tpStop();
        tpStart();
    }
}

function tpFontSize(delta) {
    tpFontSizeVal = Math.max(16, Math.min(80, tpFontSizeVal + delta));
    document.getElementById('tpText').style.fontSize = tpFontSizeVal + 'px';
}

function tpToggleAlign() {
    tpAlign = tpAlign === 'left' ? 'center' : 'left';
    document.getElementById('tpText').classList.toggle('tp-center', tpAlign === 'center');
    tpUpdateAlignBtn();
}

function tpUpdateAlignBtn() {
    var btn = document.getElementById('tpAlignBtn');
    btn.textContent = tpAlign === 'left' ? '≡ Izq' : '≡ Centro';
    btn.classList.toggle('tp-active', tpAlign === 'center');
}

function tpNextTheme() {
    tpThemeIndex = (tpThemeIndex + 1) % tpThemes.length;
    tpApplyTheme();
}

function tpApplyTheme() {
    var overlay = document.getElementById('tpOverlay');
    overlay.classList.remove('tp-light', 'tp-sepia', 'tp-green');
    
    var theme = tpThemes[tpThemeIndex];
    if (theme !== 'dark') {
        overlay.classList.add('tp-' + theme);
    }
    
    var themeNames = { dark: '🌙 Oscuro', light: '☀️ Claro', sepia: '📜 Sepia', green: '💚 Verde' };
    document.getElementById('tpThemeBtn').textContent = themeNames[theme];
}

function tpHideControls() {
    document.getElementById('tpControls').classList.add('tp-hidden');
    document.getElementById('tpShowBtn').classList.add('visible');
}

function tpShowControls() {
    document.getElementById('tpControls').classList.remove('tp-hidden');
    document.getElementById('tpShowBtn').classList.remove('visible');
}

function nl2br(str) {
    if (!str) return '';
    return str.replace(/\n/g, '<br>');
}

loadSetlists();
