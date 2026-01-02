checkAuth();
setupUserInfo();

var allSongs = [];
var allCategories = [];
var allGenres = [];
var currentSongResources = [];
var currentResourceSongId = null;

function getDateValue(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

async function loadDashboard() {
    try {
        var results = await Promise.all([
            apiGet('/songs'),
            apiGet('/setlists'),
            apiGet('/events'),
            apiGet('/users'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);
        
        var songs = results[0];
        var setlists = results[1];
        var events = results[2];
        var users = results[3];
        var categories = results[4];
        var genres = results[5];
        
        allSongs = songs || [];
        allCategories = categories || [];
        allGenres = genres || [];
        
        document.getElementById('totalSongs').textContent = allSongs.length;
        document.getElementById('totalSetlists').textContent = (setlists || []).length;
        document.getElementById('totalEvents').textContent = (events || []).length;
        document.getElementById('totalMusicians').textContent = (users || []).filter(function(u) { return u.role === 'musician'; }).length;
        
        // Próximos eventos
        var today = new Date().toISOString().split('T')[0];
        var upcoming = (events || [])
            .filter(function(e) { return e.event_date && getDateValue(e.event_date) >= today; })
            .sort(function(a, b) { return new Date(a.event_date) - new Date(b.event_date); })
            .slice(0, 5);
        
        var eventsContainer = document.getElementById('upcomingEvents');
        if (upcoming.length) {
            eventsContainer.innerHTML = upcoming.map(function(e) {
                return '<div class="song-item" onclick="window.location.href=\'events.html\'" style="cursor:pointer;">' +
                    '<div class="song-thumb">📅</div>' +
                    '<div class="song-info"><h4>' + e.name + '</h4><p>' + (e.venue || 'Sin lugar') + ' · ' + formatDate(e.event_date) + '</p></div>' +
                    '<span class="badge ' + (e.status === 'confirmed' ? 'badge-success' : 'badge-warning') + '">' +
                    (e.status === 'confirmed' ? 'Confirmado' : 'Tentativo') + '</span></div>';
            }).join('');
        } else {
            eventsContainer.innerHTML = '<div class="empty-state"><div class="icon">📅</div><h3>Sin eventos próximos</h3></div>';
        }
        
        // TODAS las favoritas
        var favorites = allSongs.filter(function(s) { return s.is_favorite; });
        var favContainer = document.getElementById('favoriteSongs');
        if (favorites.length) {
            favContainer.innerHTML = '<div class="favorites-grid">' + favorites.map(function(s) {
                return '<div class="song-card" onclick="viewSong(' + s.id + ')">' +
                    '<div class="song-card-body">' +
                        '<h4>' + s.name + '</h4>' +
                        '<p>' + (s.artist || 'Sin artista') + '</p>' +
                        '<div class="song-card-meta">' +
                            (s.musical_key ? '<span class="badge badge-neutral">' + s.musical_key + '</span>' : '') +
                            (s.bpm ? '<span class="badge badge-neutral">' + s.bpm + ' BPM</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="song-card-actions">' +
                        '<button class="btn btn-icon btn-ghost" onclick="event.stopPropagation();toggleFavorite(' + s.id + ')">⭐</button>' +
                        '<button class="btn btn-icon btn-ghost" onclick="event.stopPropagation();openSongResources(' + s.id + ',\'' + s.name.replace(/'/g, "\\'") + '\')">📎</button>' +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';
        } else {
            favContainer.innerHTML = '<div class="empty-state"><div class="icon">⭐</div><h3>Sin favoritas</h3></div>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
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

async function toggleFavorite(id) {
    var song = allSongs.find(function(s) { return s.id === id; });
    if (!song) return;
    
    try {
        await apiPatch('/songs/' + id + '/favorite', {
            is_favorite: song.is_favorite ? 0 : 1
        });
        await loadDashboard();
        showToast(song.is_favorite ? 'Quitado de favoritos' : 'Agregado a favoritos');
    } catch (e) {
        console.error('Error:', e);
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

loadDashboard();
