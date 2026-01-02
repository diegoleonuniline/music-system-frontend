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

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
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
        return '<div class="song-item rehearsal-item">' +
            '<div class="song-thumb">🎸</div>' +
            '<div class="song-info">' +
                '<h4>' + r.song_name + '</h4>' +
                '<p>' + (r.artist || 'Sin artista') + (r.target_date ? ' · Meta: ' + formatDate(r.target_date) : '') + '</p>' +
            '</div>' +
            '<span class="badge ' + statusColors[r.status] + '">' + statuses[r.status] + '</span>' +
            '<div class="rehearsal-actions">' +
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
    
    document.getElementById('viewRehearsalSong').textContent = r.song_name;
    document.getElementById('viewRehearsalArtist').textContent = r.artist || 'Sin artista';
    document.getElementById('viewRehearsalStatus').textContent = statuses[r.status];
    document.getElementById('viewRehearsalDate').textContent = r.target_date ? formatDate(r.target_date) : 'Sin fecha meta';
    document.getElementById('viewRehearsalNotes').innerHTML = r.notes ? nl2br(r.notes) : '<em>Sin notas</em>';
    
    // Buscar info adicional de la canción
    var song = allSongs.find(function(s) { return s.id === r.song_id; });
    var details = [];
    if (song) {
        if (song.musical_key) details.push('Tono: ' + song.musical_key);
        if (song.bpm) details.push(song.bpm + ' BPM');
        if (song.time_signature) details.push('Compás: ' + song.time_signature);
    }
    document.getElementById('viewRehearsalDetails').textContent = details.join(' · ') || '';
    
    document.getElementById('viewRehearsalModal').classList.add('active');
    document.getElementById('viewRehearsalModal').dataset.rehearsalId = id;
    document.getElementById('viewRehearsalModal').dataset.songId = r.song_id;
}

function closeViewRehearsalModal() {
    document.getElementById('viewRehearsalModal').classList.remove('active');
}

function openAddRehearsalModal() {
    document.getElementById('addRehearsalSong').innerHTML = '<option value="">Selecciona una canción</option>' +
        allSongs.filter(function(s) {
            return !allRehearsals.some(function(r) { return r.song_id === s.id; });
        }).map(function(s) {
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
    var notes = document.getElementById('addRehearsalNotes').value;
    
    if (!songId) {
        showToast('Selecciona una canción', 'warning');
        return;
    }
    
    try {
        await apiPost('/rehearsals', {
            song_id: parseInt(songId),
            target_date: targetDate || null,
            notes: notes || null,
            status: 'pending'
        });
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
    
    document.getElementById('editRehearsalId').value = r.id;
    document.getElementById('editRehearsalSongName').textContent = r.song_name;
    document.getElementById('editRehearsalStatus').value = r.status;
    document.getElementById('editRehearsalDate').value = r.target_date ? getDateValue(r.target_date) : '';
    document.getElementById('editRehearsalNotes').value = r.notes || '';
    
    document.getElementById('editRehearsalModal').classList.add('active');
}

function closeEditRehearsalModal() {
    document.getElementById('editRehearsalModal').classList.remove('active');
}

async function saveRehearsal() {
    var id = document.getElementById('editRehearsalId').value;
    var data = {
        status: document.getElementById('editRehearsalStatus').value,
        target_date: document.getElementById('editRehearsalDate').value || null,
        notes: document.getElementById('editRehearsalNotes').value || null
    };
    
    try {
        await apiPut('/rehearsals/' + id, data);
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
