checkAuth();
setupUserInfo();

var allSongs = [];
var allCategories = [];
var allGenres = [];
var allSetlists = [];
var allArtists = [];
var allProjects = [];
var currentSongResources = [];
var currentResourceSongId = null;
var viewMode = 'table';
var groupBy = 'none';

async function loadSongs() {
    try {
        var results = await Promise.all([
            apiGet('/songs'),
            apiGet('/categories'),
            apiGet('/genres'),
            apiGet('/setlists'),
            apiGet('/artists'),
            apiGet('/projects')
        ]);
        allSongs = Array.isArray(results[0]) ? results[0] : [];
        allCategories = Array.isArray(results[1]) ? results[1] : [];
        allGenres = Array.isArray(results[2]) ? results[2] : [];
        allSetlists = Array.isArray(results[3]) ? results[3] : [];
        allArtists = Array.isArray(results[4]) ? results[4] : [];
        allProjects = Array.isArray(results[5]) ? results[5] : [];
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

function setGroupBy(value) {
    groupBy = value;
    document.querySelectorAll('.group-chips .filter-chip').forEach(function(chip) {
        chip.classList.toggle('active', chip.dataset.group === value);
    });
    renderSongs();
}

function filterSongs() {
    renderSongs();
}

function getFiltered() {
    var search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    var catId = document.getElementById('filterCategory')?.value || '';
    var genId = document.getElementById('filterGenre')?.value || '';

    return allSongs.filter(function(s) {
        var artistName = s.artist || (allArtists.find(function(a) { return a.id === s.artist_id; }) || {}).name || '';
        var matchSearch = s.name.toLowerCase().indexOf(search) !== -1 || artistName.toLowerCase().indexOf(search) !== -1;
        var matchCat = !catId || s.category_id == catId;
        var matchGen = !genId || s.genre_id == genId;
        return matchSearch && matchCat && matchGen;
    });
}

function getArtistName(song) {
    if (song.artist) return song.artist;
    var artist = allArtists.find(function(a) { return a.id === song.artist_id; });
    return artist ? artist.name : '';
}

function groupSongs(songs) {
    if (groupBy === 'none') return { '': songs };
    
    var groups = {};
    songs.forEach(function(s) {
        var key = '';
        if (groupBy === 'artist') {
            key = getArtistName(s) || 'Sin artista';
        } else if (groupBy === 'category') {
            var cat = allCategories.find(function(c) { return c.id === s.category_id; });
            key = cat ? cat.name : 'Sin categoría';
        } else if (groupBy === 'genre') {
            var gen = allGenres.find(function(g) { return g.id === s.genre_id; });
            key = gen ? gen.name : 'Sin género';
        } else if (groupBy === 'key') {
            key = s.musical_key || 'Sin tono';
        } else if (groupBy === 'favorite') {
            key = s.is_favorite ? '⭐ Favoritas' : 'Otras';
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    
    var sortedKeys = Object.keys(groups).sort(function(a, b) {
        if (a.indexOf('⭐') === 0) return -1;
        if (b.indexOf('⭐') === 0) return 1;
        return a.localeCompare(b);
    });
    
    var sorted = {};
    sortedKeys.forEach(function(k) { sorted[k] = groups[k]; });
    return sorted;
}

function renderSongs() {
    var filtered = getFiltered();
    var container = document.getElementById('songsContainer');

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🎵</div><h3>Sin canciones</h3></div>';
        return;
    }

    var grouped = groupSongs(filtered);

    if (viewMode === 'table') {
        var html = '';
        Object.keys(grouped).forEach(function(groupName) {
            var songs = grouped[groupName];
            if (groupName && groupBy !== 'none') {
                html += '<div class="group-header"><span>' + groupName + '</span><span class="count">' + songs.length + '</span></div>';
            }
            html += '<div class="table-container"><table><thead><tr><th>Canción</th><th>Artista</th><th>Tono</th><th>BPM</th><th>Duración</th><th>Acciones</th></tr></thead><tbody>' +
                songs.map(function(s) {
                    var songName = s.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    var artistName = getArtistName(s);
                    return '<tr style="cursor:pointer;"><td onclick="viewSong(' + s.id + ')"><strong>' + s.name + '</strong>' + (s.is_favorite ? ' ⭐' : '') + '</td>' +
                    '<td onclick="viewSong(' + s.id + ')">' + (artistName || '-') + '</td><td onclick="viewSong(' + s.id + ')">' + (s.musical_key || '-') + '</td><td onclick="viewSong(' + s.id + ')">' + (s.bpm || '-') + '</td>' +
                    '<td onclick="viewSong(' + s.id + ')">' + formatDuration(s.duration_seconds) + '</td>' +
                    '<td class="actions-cell">' +
                        '<button class="btn-icon" onclick="event.stopPropagation();toggleFavorite(' + s.id + ')" title="Favorito">' + (s.is_favorite ? '⭐' : '☆') + '</button>' +
                        '<button class="btn-icon" onclick="event.stopPropagation();openSongResources(' + s.id + ',\'' + songName + '\')" title="Recursos">📎</button>' +
                        '<button class="btn-icon" onclick="event.stopPropagation();openProjectSettingsModal(' + s.id + ',\'' + songName + '\')" title="Proyectos">🎸</button>' +
                        '<button class="btn-icon" onclick="event.stopPropagation();openAddToSetlistModal(' + s.id + ',\'' + songName + '\')" title="Agregar a Set List">📋</button>' +
                        '<button class="btn-icon" onclick="event.stopPropagation();editSong(' + s.id + ')" title="Editar">✏️</button>' +
                        '<button class="btn-icon btn-danger" onclick="event.stopPropagation();deleteSong(' + s.id + ')" title="Eliminar">🗑️</button>' +
                    '</td></tr>';
                }).join('') + '</tbody></table></div>';
        });
        container.innerHTML = html;
    } else {
        var html = '';
        Object.keys(grouped).forEach(function(groupName) {
            var songs = grouped[groupName];
            if (groupName && groupBy !== 'none') {
                html += '<div class="group-header"><span>' + groupName + '</span><span class="count">' + songs.length + '</span></div>';
            }
            html += '<div class="songs-grid">' + songs.map(function(s) {
                var songName = s.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                var artistName = getArtistName(s);
                return '<div class="song-card">' +
                    '<div class="song-card-body" onclick="viewSong(' + s.id + ')">' +
                        '<h4>' + s.name + (s.is_favorite ? ' ⭐' : '') + '</h4>' +
                        '<p>' + (artistName || 'Sin artista') + '</p>' +
                        '<div class="song-card-meta">' +
                            (s.musical_key ? '<span class="badge badge-neutral">' + s.musical_key + '</span>' : '') +
                            (s.bpm ? '<span class="badge badge-neutral">' + s.bpm + ' BPM</span>' : '') +
                            '<span class="badge badge-neutral">' + formatDuration(s.duration_seconds) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="song-card-actions">' +
                        '<button class="btn-icon" onclick="toggleFavorite(' + s.id + ')" title="Favorito">' + (s.is_favorite ? '⭐' : '☆') + '</button>' +
                        '<button class="btn-icon" onclick="openSongResources(' + s.id + ',\'' + songName + '\')" title="Recursos">📎</button>' +
                        '<button class="btn-icon" onclick="openProjectSettingsModal(' + s.id + ',\'' + songName + '\')" title="Proyectos">🎸</button>' +
                        '<button class="btn-icon" onclick="openAddToSetlistModal(' + s.id + ',\'' + songName + '\')" title="Set List">📋</button>' +
                        '<button class="btn-icon" onclick="editSong(' + s.id + ')" title="Editar">✏️</button>' +
                        '<button class="btn-icon btn-danger" onclick="deleteSong(' + s.id + ')" title="Eliminar">🗑️</button>' +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';
        });
        container.innerHTML = html;
    }
}

function formatDuration(sec) {
    if (!sec) return '0:00';
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ========== ADD TO SETLIST ==========
function openAddToSetlistModal(songId, songName) {
    closeActionsMenu();
    var modal = document.getElementById('addToSetlistModal');
    if (!modal) return;
    
    document.getElementById('addToSetlistSongId').value = songId;
    document.getElementById('addToSetlistSongName').textContent = songName;
    
    var list = document.getElementById('setlistSelectList');
    if (!allSetlists.length) {
        list.innerHTML = '<div class="empty-state"><p>No hay set lists</p><a href="setlists.html" class="btn btn-primary btn-sm">Crear Set List</a></div>';
    } else {
        list.innerHTML = allSetlists.map(function(s) {
            return '<div class="setlist-select-item" onclick="addSongToSelectedSetlist(' + s.id + ')">' +
                '<div class="info"><h4>📋 ' + s.name + '</h4><p>' + (s.total_songs || 0) + ' canciones</p></div>' +
                '<button class="btn btn-primary btn-sm">Agregar</button>' +
            '</div>';
        }).join('');
    }
    
    modal.classList.add('active');
}

function closeAddToSetlistModal() {
    document.getElementById('addToSetlistModal').classList.remove('active');
}

async function addSongToSelectedSetlist(setlistId) {
    var songId = document.getElementById('addToSetlistSongId').value;
    try {
        await apiPost('/setlists/' + setlistId + '/songs', { song_id: parseInt(songId) });
        closeAddToSetlistModal();
        showToast('Canción agregada al set list');
        loadSongs();
    } catch (e) {
        console.error('Error:', e);
        showToast('Error al agregar', 'error');
    }
}

// ========== PROJECT SETTINGS (TONOS POR PROYECTO) ==========
var currentProjectSongId = null;
var currentProjectSettings = [];

async function openProjectSettingsModal(songId, songName) {
    closeActionsMenu();
    currentProjectSongId = songId;
    document.getElementById('projectSettingsSongName').textContent = songName;
    document.getElementById('projectSettingsModal').classList.add('active');
    await loadProjectSettings();
}

function closeProjectSettingsModal() {
    document.getElementById('projectSettingsModal').classList.remove('active');
    currentProjectSongId = null;
}

async function loadProjectSettings() {
    try {
        currentProjectSettings = await apiGet('/song-settings/song/' + currentProjectSongId) || [];
        renderProjectSettings();
    } catch (e) {
        currentProjectSettings = [];
        renderProjectSettings();
    }
}

function renderProjectSettings() {
    var container = document.getElementById('projectSettingsList');
    var song = allSongs.find(function(s) { return s.id === currentProjectSongId; });
    var defaultKey = song ? song.musical_key : '';
    
    // Mostrar tono default
    var html = '<div class="project-setting-item default-key">' +
        '<div class="project-info"><span class="project-badge" style="background:#6B7280;">🎵</span><strong>Tono Original</strong></div>' +
        '<span class="key-badge">' + (defaultKey || 'Sin definir') + '</span>' +
    '</div>';
    
    // Settings por proyecto
    if (currentProjectSettings.length) {
        html += currentProjectSettings.map(function(ps) {
            return '<div class="project-setting-item">' +
                '<div class="project-info"><span class="project-badge" style="background:' + (ps.color || '#4F46E5') + ';">🎸</span><strong>' + ps.project_name + '</strong></div>' +
                '<input type="text" class="key-input" value="' + (ps.musical_key || '') + '" onchange="updateProjectSetting(' + ps.id + ', this.value)" placeholder="Tono">' +
                '<button class="btn-icon btn-danger" onclick="deleteProjectSetting(' + ps.id + ')">🗑️</button>' +
            '</div>';
        }).join('');
    }
    
    // Proyectos sin asignar
    var assignedIds = currentProjectSettings.map(function(ps) { return ps.project_id; });
    var availableProjects = allProjects.filter(function(p) { return assignedIds.indexOf(p.id) === -1; });
    
    if (availableProjects.length) {
        html += '<div class="add-project-section">' +
            '<select id="newProjectSelect" class="form-control">' +
                '<option value="">+ Agregar proyecto...</option>' +
                availableProjects.map(function(p) {
                    return '<option value="' + p.id + '">' + p.name + '</option>';
                }).join('') +
            '</select>' +
            '<input type="text" id="newProjectKey" class="form-control key-input" placeholder="Tono" style="width:80px;">' +
            '<button class="btn btn-primary btn-sm" onclick="addProjectSetting()">Agregar</button>' +
        '</div>';
    }
    
    container.innerHTML = html;
}

async function addProjectSetting() {
    var projectId = document.getElementById('newProjectSelect').value;
    var key = document.getElementById('newProjectKey').value.trim();
    
    if (!projectId) {
        showToast('Selecciona un proyecto', 'warning');
        return;
    }
    
    try {
        await apiPost('/song-settings', {
            song_id: currentProjectSongId,
            project_id: parseInt(projectId),
            musical_key: key || null
        });
        await loadProjectSettings();
        showToast('Proyecto agregado');
    } catch (e) {
        showToast('Error al agregar', 'error');
    }
}

async function updateProjectSetting(settingId, newKey) {
    var setting = currentProjectSettings.find(function(s) { return s.id === settingId; });
    if (!setting) return;
    
    try {
        await apiPost('/song-settings', {
            song_id: currentProjectSongId,
            project_id: setting.project_id,
            musical_key: newKey || null
        });
        showToast('Tono actualizado');
    } catch (e) {
        showToast('Error al actualizar', 'error');
    }
}

async function deleteProjectSetting(settingId) {
    try {
        await apiDelete('/song-settings/' + settingId);
        await loadProjectSettings();
        showToast('Eliminado');
    } catch (e) {
        showToast('Error al eliminar', 'error');
    }
}

// ========== VIEW SONG ==========
function viewSong(id) {
    var song = allSongs.find(function(s) { return s.id === id; });
    if (!song) return;

    document.getElementById('viewSongTitle').textContent = song.name;
    document.getElementById('viewSongArtist').textContent = getArtistName(song) || 'Sin artista';
    
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
    var song = allSongs.find(function(s) { return s.id == id; });
    if (!song) return;
    closeViewSongModal();
    openSongResources(song.id, song.name);
}

function editCurrentSong() {
    var id = document.getElementById('viewSongModal').dataset.songId;
    closeViewSongModal();
    editSong(parseInt(id));
}

function editSong(id) {
    closeActionsMenu();
    var song = allSongs.find(function(s) { return s.id === id; });
    if (!song) return;
    openSongModal(song);
}

function openSongModal(song) {
    document.getElementById('songModalTitle').textContent = song ? 'Editar Canción' : 'Nueva Canción';
    document.getElementById('songId').value = song ? song.id : '';
    document.getElementById('songName').value = song ? song.name : '';
    document.getElementById('songKey').value = song ? (song.musical_key || '') : '';
    document.getElementById('songBpm').value = song ? (song.bpm || '') : '';
    document.getElementById('songTimeSignature').value = song ? (song.time_signature || '4/4') : '4/4';
    document.getElementById('songDuration').value = song ? (song.duration_seconds || '') : '';
    document.getElementById('songVideoUrl').value = song ? (song.video_url || '') : '';
    document.getElementById('songAudioUrl').value = song ? (song.audio_url || '') : '';
    document.getElementById('songLyrics').value = song ? (song.lyrics || '') : '';
    document.getElementById('songFavorite').checked = song ? song.is_favorite : false;

    // Artista select
    var artistSelect = document.getElementById('songArtist');
    artistSelect.innerHTML = '<option value="">Sin artista</option>' +
        allArtists.map(function(a) { 
            var selected = song && song.artist_id == a.id ? ' selected' : '';
            return '<option value="' + a.id + '"' + selected + '>' + a.name + '</option>'; 
        }).join('') +
        '<option value="__new__">+ Crear nuevo...</option>';
    
    // Categoría select
    var catSelect = document.getElementById('songCategory');
    catSelect.innerHTML = '<option value="">Sin categoría</option>' +
        allCategories.map(function(c) { return '<option value="' + c.id + '"' + (song && song.category_id == c.id ? ' selected' : '') + '>' + c.name + '</option>'; }).join('') +
        '<option value="__new__">+ Crear nueva...</option>';
    
    // Género select
    var genSelect = document.getElementById('songGenre');
    genSelect.innerHTML = '<option value="">Sin género</option>' +
        allGenres.map(function(g) { return '<option value="' + g.id + '"' + (song && song.genre_id == g.id ? ' selected' : '') + '>' + g.name + '</option>'; }).join('') +
        '<option value="__new__">+ Crear nuevo...</option>';

    document.getElementById('newArtistGroup').style.display = 'none';
    document.getElementById('newCategoryGroup').style.display = 'none';
    document.getElementById('newGenreGroup').style.display = 'none';

    document.getElementById('songModal').classList.add('active');
}

function closeSongModal() {
    document.getElementById('songModal').classList.remove('active');
}

function onArtistChange() {
    var val = document.getElementById('songArtist').value;
    document.getElementById('newArtistGroup').style.display = val === '__new__' ? 'block' : 'none';
}

function onCategoryChange() {
    var val = document.getElementById('songCategory').value;
    document.getElementById('newCategoryGroup').style.display = val === '__new__' ? 'block' : 'none';
}

function onGenreChange() {
    var val = document.getElementById('songGenre').value;
    document.getElementById('newGenreGroup').style.display = val === '__new__' ? 'block' : 'none';
}

async function createArtist() {
    var name = document.getElementById('newArtistName').value.trim();
    if (!name) { showToast('Ingresa nombre del artista', 'warning'); return; }
    try {
        var result = await apiPost('/artists', { name: name });
        var newArtist = { id: result.id, name: name };
        allArtists.push(newArtist);
        var select = document.getElementById('songArtist');
        var newOption = select.querySelector('option[value="__new__"]');
        var opt = document.createElement('option');
        opt.value = newArtist.id;
        opt.textContent = newArtist.name;
        opt.selected = true;
        select.insertBefore(opt, newOption);
        document.getElementById('newArtistName').value = '';
        document.getElementById('newArtistGroup').style.display = 'none';
        showToast('Artista creado');
    } catch (e) { showToast('Error al crear artista', 'error'); }
}

async function createCategory() {
    var name = document.getElementById('newCategoryName').value.trim();
    if (!name) { showToast('Ingresa nombre de categoría', 'warning'); return; }
    try {
        var result = await apiPost('/categories', { name: name });
        var newCat = { id: result.id, name: name };
        allCategories.push(newCat);
        var select = document.getElementById('songCategory');
        var newOption = select.querySelector('option[value="__new__"]');
        var opt = document.createElement('option');
        opt.value = newCat.id;
        opt.textContent = newCat.name;
        opt.selected = true;
        select.insertBefore(opt, newOption);
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryGroup').style.display = 'none';
        showToast('Categoría creada');
    } catch (e) { showToast('Error al crear categoría', 'error'); }
}

async function createGenre() {
    var name = document.getElementById('newGenreName').value.trim();
    if (!name) { showToast('Ingresa nombre de género', 'warning'); return; }
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
    } catch (e) { showToast('Error al crear género', 'error'); }
}

async function saveSong() {
    var id = document.getElementById('songId').value;
    var artistVal = document.getElementById('songArtist').value;
    var catVal = document.getElementById('songCategory').value;
    var genVal = document.getElementById('songGenre').value;

    if (artistVal === '__new__' || catVal === '__new__' || genVal === '__new__') {
        showToast('Primero crea el artista/categoría/género', 'warning');
        return;
    }

    var data = {
        name: document.getElementById('songName').value,
        artist_id: artistVal ? parseInt(artistVal) : null,
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
        if (id) await apiPut('/songs/' + id, data);
        else await apiPost('/songs', data);
        closeSongModal();
        loadSongs();
        showToast('Canción guardada');
    } catch (e) { showToast('Error al guardar', 'error'); }
}

async function deleteSong(id) {
    closeActionsMenu();
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
    
    var newValue = song.is_favorite ? 0 : 1;
    
    try {
        await apiPatch('/songs/' + id + '/favorite', { is_favorite: newValue });
        await loadSongs();
        showToast(song.is_favorite ? 'Quitado de favoritos' : 'Agregado a favoritos');
    } catch (e) {
        console.error('Error:', e);
        showToast('Error al actualizar', 'error');
    }
}

function copyCurrentSong() {
    var id = document.getElementById('viewSongModal').dataset.songId;
    var song = allSongs.find(function(s) { return s.id == id; });
    if (!song) return;
    
    closeViewSongModal();
    openSongModal(null);
    
    // Copiar datos excepto nombre
    document.getElementById('songArtist').value = song.artist_id || '';
    document.getElementById('songKey').value = song.musical_key || '';
    document.getElementById('songCategory').value = song.category_id || '';
    document.getElementById('songGenre').value = song.genre_id || '';
}

// ========== RESOURCES ==========
async function openSongResources(songId, songName) {
    closeActionsMenu();
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
    } catch (e) { showToast('Error', 'error'); }
}

function nl2br(str) {
    return str ? str.replace(/\n/g, '<br>') : '';
}

function closeActionsMenu() {}

loadSongs();
