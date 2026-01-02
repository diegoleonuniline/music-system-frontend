checkAuth();
setupUserInfo();

var allRehearsals = [];
var allSongs = [];
var currentSongResources = [];
var currentResourceSongId = null;

async function loadRehearsals() {
    try {
        var results = await Promise.all([
            apiGet('/rehearsals'),
            apiGet('/songs')
        ]);
        allRehearsals = Array.isArray(results[0]) ? results[0] : [];
        allSongs = Array.isArray(results[1]) ? results[1] : [];
        renderRehearsals();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('rehearsalsContainer').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function getDateValue(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    var parts = dateStr.split('T')[0].split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = parseLocalDate(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function formatDuration(sec) {
    if (!sec) return '0:00';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function nl2br(str) {
    return str ? str.replace(/\n/g, '<br>') : '';
}

function renderRehearsals() {
    var container = document.getElementById('rehearsalsContainer');
    
    if (!allRehearsals.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🎸</div><h3>Sin canciones en ensayo</h3><p>Agrega canciones para practicar</p></div>';
        return;
    }

    var statuses = { pending: 'Pendiente', in_progress: 'En progreso', ready: 'Lista' };
    var statusColors = { pending: 'badge-warning', in_progress: 'badge-primary', ready: 'badge-success' };

    // Render as TABLE
    container.innerHTML = '<div class="table-container"><table><thead><tr>' +
        '<th>Canción</th><th>Artista</th><th>Estado</th><th>Fecha Meta</th><th>Notas</th><th>Acciones</th>' +
        '</tr></thead><tbody>' +
        allRehearsals.map(function(r) {
            var song = allSongs.find(function(s) { return s.id === r.song_id; });
            return '<tr onclick="viewRehearsal(' + r.id + ')" style="cursor:pointer;">' +
                '<td><strong>🎸 ' + (r.song_name || (song ? song.name : 'Canción')) + '</strong></td>' +
                '<td>' + (r.artist || (song ? song.artist : '') || '-') + '</td>' +
                '<td><span class="badge ' + statusColors[r.status || 'pending'] + '">' + statuses[r.status || 'pending'] + '</span></td>' +
                '<td>' + (r.target_date ? formatDate(r.target_date) : '-') + '</td>' +
                '<td>' + (r.notes ? r.notes.substring(0, 30) + (r.notes.length > 30 ? '...' : '') : '-') + '</td>' +
                '<td onclick="event.stopPropagation()">' +
                    '<button class="btn btn-ghost btn-sm" onclick="openSongResources(' + r.song_id + ',\'' + (r.song_name || (song ? song.name : 'Canción')).replace(/'/g, "\\'") + '\')">📎</button>' +
                    (song && song.video_url ? '<button class="btn btn-ghost btn-sm" onclick="window.open(\'' + song.video_url + '\', \'_blank\')">🎬</button>' : '') +
                    '<button class="btn btn-ghost btn-sm" onclick="editRehearsal(' + r.id + ')">✏️</button>' +
                    '<button class="btn btn-ghost btn-sm btn-danger-text" onclick="removeFromRehearsals(' + r.id + ')">✕</button>' +
                '</td></tr>';
        }).join('') + '</tbody></table></div>';
}

function viewSong(id) {
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

function openSongResourcesFromModal() {
    var id = document.getElementById('viewSongModal').dataset.songId;
    var title = document.getElementById('viewSongTitle').textContent;
    openSongResources(id, title);
}

async function toggleFavoriteFromModal() {
    var id = document.getElementById('viewSongModal').dataset.songId;
    var song = allSongs.find(function(s) { return s.id == id; });
    if (!song) return;
    
    try {
        await apiPatch('/songs/' + id + '/favorite', {
            is_favorite: song.is_favorite ? 0 : 1
        });
        song.is_favorite = !song.is_favorite;
        showToast(song.is_favorite ? 'Agregado a favoritos' : 'Quitado de favoritos');
    } catch (e) {
        showToast('Error al actualizar', 'error');
    }
}

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
        if (r.file_type === 'pdf' || r.type === 'pdf') {
            openFullscreenResource(r.title || 'PDF', '<iframe src="' + r.file_url + '" style="width:100%;height:100%;border:none;"></iframe>');
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
        showToast('Guardado');
    } catch (e) {
        showToast('Error', 'error');
    }
}

function viewRehearsal(id) {
    var r = allRehearsals.find(function(x) { return x.id === id; });
    if (!r) return;
    
    var statuses = { pending: 'Pendiente', in_progress: 'En progreso', ready: 'Lista' };
    var song = allSongs.find(function(s) { return s.id === r.song_id; });
    
    document.getElementById('viewRehearsalSong').textContent = r.song_name || (song ? song.name : 'Canción');
    document.getElementById('viewRehearsalArtist').textContent = r.artist || (song ? song.artist : '') || 'Sin artista';
    document.getElementById('viewRehearsalStatus').textContent = statuses[r.status || 'pending'];
    document.getElementById('viewRehearsalDate').textContent = r.target_date ? formatDate(r.target_date) : 'Sin fecha meta';
    document.getElementById('viewRehearsalNotes').innerHTML = r.notes ? nl2br(r.notes) : '<em>Sin notas</em>';
    
    var details = [];
    if (song) {
        if (song.musical_key) details.push('Tono: ' + song.musical_key);
        if (song.bpm) details.push(song.bpm + ' BPM');
        if (song.time_signature) details.push('Compás: ' + song.time_signature);
    }
    document.getElementById('viewRehearsalDetails').textContent = details.join(' · ') || '';
    
    var actionsHtml = '';
    if (song) {
        actionsHtml += '<button class="btn btn-ghost" onclick="viewSong(' + song.id + ')">🎵 Ver canción</button>';
        actionsHtml += '<button class="btn btn-ghost" onclick="openSongResources(' + song.id + ',\'' + song.name.replace(/'/g, "\\'") + '\')">📎 Recursos</button>';
        if (song.video_url) {
            actionsHtml += '<button class="btn btn-ghost" onclick="window.open(\'' + song.video_url + '\', \'_blank\')">🎬 Video</button>';
        }
    }
    actionsHtml += '<button class="btn btn-ghost" onclick="editCurrentRehearsal()">✏️ Editar</button>';
    actionsHtml += '<button class="btn btn-primary" onclick="markCurrentAsReady()">✓ Lista</button>';
    
    document.getElementById('viewRehearsalFooter').innerHTML = actionsHtml;
    
    document.getElementById('viewRehearsalModal').classList.add('active');
    document.getElementById('viewRehearsalModal').dataset.rehearsalId = id;
    document.getElementById('viewRehearsalModal').dataset.songId = r.song_id;
}

function closeViewRehearsalModal() {
    document.getElementById('viewRehearsalModal').classList.remove('active');
}

function openAddRehearsalModal() {
    var availableSongs = allSongs.filter(function(s) {
        return !allRehearsals.some(function(r) { return r.song_id === s.id; });
    });
    
    document.getElementById('addRehearsalSong').innerHTML = '<option value="">Selecciona una canción</option>' +
        availableSongs.map(function(s) {
            return '<option value="' + s.id + '">' + s.name + ' - ' + (s.artist || 'Sin artista') + '</option>';
        }).join('');
    
    document.getElementById('addRehearsalDate').value = '';
    document.getElementById('addRehearsalNotes').value = '';
    document.getElementById('addRehearsalModal').classList.add('active');
}

function closeAddRehearsalModal() {
    document.getElementById('addRehearsalModal').classList.remove('active');
}

async function addToRehearsals() {
    var songId = document.getElementById('addRehearsalSong').value;
    var targetDate = document.getElementById('addRehearsalDate').value;
    var notes = document.getElementById('addRehearsalNotes').value.trim();
    
    if (!songId) {
        showToast('Selecciona una canción', 'warning');
        return;
    }
    
    var payload = {
        song_id: parseInt(songId),
        status: 'pending'
    };
    
    if (targetDate) payload.target_date = targetDate;
    if (notes) payload.notes = notes;
    
    try {
        await apiPost('/rehearsals', payload);
        closeAddRehearsalModal();
        loadRehearsals();
        showToast('Canción agregada a ensayos');
    } catch (e) {
        console.error('Error:', e);
        showToast('Error al agregar', 'error');
    }
}

function editRehearsal(id) {
    if (event) event.stopPropagation();
    var r = allRehearsals.find(function(x) { return x.id === id; });
    if (!r) return;
    
    var song = allSongs.find(function(s) { return s.id === r.song_id; });
    
    document.getElementById('editRehearsalId').value = r.id;
    document.getElementById('editRehearsalSongName').textContent = r.song_name || (song ? song.name : 'Canción');
    document.getElementById('editRehearsalStatus').value = r.status || 'pending';
    document.getElementById('editRehearsalDate').value = r.target_date ? getDateValue(r.target_date) : '';
    document.getElementById('editRehearsalNotes').value = r.notes || '';
    
    document.getElementById('editRehearsalModal').classList.add('active');
}

function closeEditRehearsalModal() {
    document.getElementById('editRehearsalModal').classList.remove('active');
}

async function saveRehearsal() {
    var id = document.getElementById('editRehearsalId').value;
    var notes = document.getElementById('editRehearsalNotes').value.trim();
    var targetDate = document.getElementById('editRehearsalDate').value;
    
    var payload = {
        status: document.getElementById('editRehearsalStatus').value,
        target_date: targetDate || null,
        notes: notes || null
    };
    
    try {
        await apiPut('/rehearsals/' + id, payload);
        closeEditRehearsalModal();
        loadRehearsals();
        showToast('Ensayo actualizado');
    } catch (e) {
        console.error('Error:', e);
        showToast('Error al guardar', 'error');
    }
}

async function removeFromRehearsals(id) {
    if (event) event.stopPropagation();
    if (confirm('¿Quitar de ensayos?')) {
        try {
            await apiDelete('/rehearsals/' + id);
            loadRehearsals();
            showToast('Quitado de ensayos');
        } catch (e) {
            showToast('Error al quitar', 'error');
        }
    }
}

async function markAsReady(id) {
    try {
        await apiPut('/rehearsals/' + id, { status: 'ready' });
        closeViewRehearsalModal();
        loadRehearsals();
        showToast('Marcada como lista');
    } catch (e) {
        showToast('Error', 'error');
    }
}

function markCurrentAsReady() {
    var id = document.getElementById('viewRehearsalModal').dataset.rehearsalId;
    markAsReady(parseInt(id));
}

function editCurrentRehearsal() {
    var id = document.getElementById('viewRehearsalModal').dataset.rehearsalId;
    closeViewRehearsalModal();
    editRehearsal(parseInt(id));
}

loadRehearsals();
