checkAuth();
setupUserInfo();

let allRehearsals = [];
let allSongs = [];

async function loadRehearsals() {
    try {
        [allRehearsals, allSongs] = await Promise.all([
            apiGet('/rehearsals'),
            apiGet('/songs')
        ]);
        allRehearsals = Array.isArray(allRehearsals) ? allRehearsals : [];
        allSongs = Array.isArray(allSongs) ? allSongs : [];
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

function renderRehearsals() {
    var container = document.getElementById('rehearsalsContainer');
    
    if (!allRehearsals.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🎸</div><h3>Sin canciones en ensayo</h3><p>Agrega canciones para practicar</p></div>';
        return;
    }

    var statuses = { pending: 'Pendiente', in_progress: 'En progreso', ready: 'Lista' };
    var statusColors = { pending: 'badge-warning', in_progress: 'badge-primary', ready: 'badge-success' };

    container.innerHTML = '<div class="rehearsals-list">' + allRehearsals.map(function(r) {
        var song = allSongs.find(function(s) { return s.id === r.song_id; });
        return '<div class="song-item rehearsal-item">' +
            '<div class="song-thumb">🎸</div>' +
            '<div class="song-info">' +
                '<h4>' + (r.song_name || (song ? song.name : 'Canción')) + '</h4>' +
                '<p>' + (r.artist || (song ? song.artist : '') || 'Sin artista') + (r.target_date ? ' · Meta: ' + formatDate(r.target_date) : '') + '</p>' +
                (r.notes ? '<p style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">📝 ' + r.notes.substring(0, 50) + (r.notes.length > 50 ? '...' : '') + '</p>' : '') +
            '</div>' +
            '<span class="badge ' + statusColors[r.status || 'pending'] + '">' + statuses[r.status || 'pending'] + '</span>' +
            '<div class="rehearsal-actions">' +
                (song && song.video_url ? '<button class="btn btn-ghost btn-sm" onclick="window.open(\'' + song.video_url + '\', \'_blank\')">🎬</button>' : '') +
                '<button class="btn btn-ghost btn-sm" onclick="viewRehearsal(' + r.id + ')">Ver</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="editRehearsal(' + r.id + ')">✏️</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="removeFromRehearsals(' + r.id + ')" style="color:var(--danger);">✕</button>' +
            '</div>' +
        '</div>';
    }).join('') + '</div>';
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
    
    // Botones de video/recursos
    var actionsHtml = '';
    if (song) {
        if (song.video_url) {
            actionsHtml += '<button class="btn btn-ghost" onclick="window.open(\'' + song.video_url + '\', \'_blank\')">🎬 Video</button>';
        }
        if (song.lyrics) {
            actionsHtml += '<button class="btn btn-ghost" onclick="showLyrics(' + song.id + ')">📄 Letra</button>';
        }
    }
    
    var footerEl = document.querySelector('#viewRehearsalModal .modal-footer');
    footerEl.innerHTML = actionsHtml +
        '<button class="btn btn-ghost" onclick="editCurrentRehearsal()">✏️ Editar</button>' +
        '<button class="btn btn-primary" onclick="markCurrentAsReady()">✓ Marcar lista</button>';
    
    document.getElementById('viewRehearsalModal').classList.add('active');
    document.getElementById('viewRehearsalModal').dataset.rehearsalId = id;
    document.getElementById('viewRehearsalModal').dataset.songId = r.song_id;
}

function showLyrics(songId) {
    var song = allSongs.find(function(s) { return s.id === songId; });
    if (song && song.lyrics) {
        alert(song.lyrics);
    }
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
    
    console.log('Enviando rehearsal:', payload);
    
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
        status: document.getElementById('editRehearsalStatus').value
    };
    
    // Enviar null explícito si está vacío para limpiar el campo
    payload.target_date = targetDate || null;
    payload.notes = notes || null;
    
    console.log('Guardando rehearsal:', id, payload);
    
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

function nl2br(str) {
    return str ? str.replace(/\n/g, '<br>') : '';
}

loadRehearsals();
