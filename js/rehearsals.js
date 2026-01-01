checkAuth();
setupUserInfo();

let allSongs = [];
let rehearsals = JSON.parse(localStorage.getItem('rehearsals') || '[]');
let repertoire = JSON.parse(localStorage.getItem('repertoire') || '[]');

async function loadData() {
    try {
        allSongs = await apiGet('/songs') || [];
        renderAll();
    } catch (error) {
        console.error('Error:', error);
    }
}

function saveToStorage() {
    localStorage.setItem('rehearsals', JSON.stringify(rehearsals));
    localStorage.setItem('repertoire', JSON.stringify(repertoire));
}

function renderAll() {
    renderNextRehearsal();
    renderRepertoire();
    renderRehearsals();
}

// Próximo Ensayo
function renderNextRehearsal() {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = rehearsals
        .filter(r => r.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

    const card = document.getElementById('nextRehearsalCard');
    const content = document.getElementById('nextRehearsalContent');

    if (upcoming) {
        card.style.display = 'block';
        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h2 style="margin-bottom: 8px;">${upcoming.title || 'Ensayo'}</h2>
                    <p style="color: var(--text-secondary);">
                        📅 ${formatDate(upcoming.date)} ${upcoming.time ? '· 🕐 ' + upcoming.time : ''}
                    </p>
                    ${upcoming.location ? `<p style="color: var(--text-secondary);">📍 ${upcoming.location}</p>` : ''}
                </div>
                <span class="badge badge-primary">Próximo</span>
            </div>
            ${upcoming.notes ? `<p style="margin-top: 16px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">${upcoming.notes}</p>` : ''}
        `;
    } else {
        card.style.display = 'none';
    }
}

// Canciones para Repertorio
function renderRepertoire() {
    const container = document.getElementById('repertoireList');

    if (!repertoire.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📝</div>
                <h3>Sin canciones pendientes</h3>
                <p>Agrega canciones que quieras aprender</p>
            </div>
        `;
        return;
    }

    container.innerHTML = repertoire.map(r => {
        const song = allSongs.find(s => s.id === r.songId);
        if (!song) return '';
        
        return `
            <div class="song-item">
                <div class="song-thumb" style="background: ${getPriorityColor(r.priority)};">
                    ${r.priority === 'high' ? '🔥' : r.priority === 'medium' ? '⚡' : '📌'}
                </div>
                <div class="song-info">
                    <h4>${song.name}</h4>
                    <p>${song.artist || 'Sin artista'}</p>
                </div>
                <span class="badge ${r.status === 'learning' ? 'badge-warning' : r.status === 'ready' ? 'badge-success' : 'badge-neutral'}">
                    ${r.status === 'learning' ? 'Aprendiendo' : r.status === 'ready' ? 'Lista' : 'Pendiente'}
                </span>
                <div class="song-actions">
                    <select onchange="updateRepertoireStatus(${r.songId}, this.value)" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border);">
                        <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                        <option value="learning" ${r.status === 'learning' ? 'selected' : ''}>Aprendiendo</option>
                        <option value="ready" ${r.status === 'ready' ? 'selected' : ''}>Lista</option>
                    </select>
                    <button class="btn btn-ghost btn-sm" onclick="removeFromRepertoire(${r.songId})">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function getPriorityColor(priority) {
    if (priority === 'high') return 'linear-gradient(135deg, #EF4444, #DC2626)';
    if (priority === 'medium') return 'linear-gradient(135deg, #F59E0B, #D97706)';
    return 'linear-gradient(135deg, #6B7280, #4B5563)';
}

function updateRepertoireStatus(songId, status) {
    const item = repertoire.find(r => r.songId === songId);
    if (item) {
        item.status = status;
        saveToStorage();
        renderRepertoire();
        showToast('Estado actualizado');
    }
}

function removeFromRepertoire(songId) {
    repertoire = repertoire.filter(r => r.songId !== songId);
    saveToStorage();
    renderRepertoire();
    showToast('Canción quitada del repertorio');
}

function openAddRepertoireModal() {
    document.getElementById('searchRepertoireSong').value = '';
    filterRepertoireSongs();
    document.getElementById('addRepertoireModal').classList.add('active');
}

function closeAddRepertoireModal() {
    document.getElementById('addRepertoireModal').classList.remove('active');
}

function filterRepertoireSongs() {
    const search = document.getElementById('searchRepertoireSong').value.toLowerCase();
    const repertoireIds = repertoire.map(r => r.songId);
    
    const available = allSongs.filter(s =>
        !repertoireIds.includes(s.id) &&
        (s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search))
    );

    const container = document.getElementById('availableRepertoireSongs');
    container.innerHTML = available.length ? available.map(s => `
        <div class="song-item">
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}</p>
            </div>
            <select id="priority-${s.id}" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); margin-right: 8px;">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="addToRepertoire(${s.id})">Agregar</button>
        </div>
    `).join('') : '<div class="empty-state"><p>No hay canciones disponibles</p></div>';
}

function addToRepertoire(songId) {
    const priority = document.getElementById(`priority-${songId}`).value;
    repertoire.push({
        songId: songId,
        priority: priority,
        status: 'pending',
        addedAt: new Date().toISOString()
    });
    saveToStorage();
    renderRepertoire();
    filterRepertoireSongs();
    showToast('Canción agregada al repertorio');
}

// Ensayos
function renderRehearsals() {
    const container = document.getElementById('rehearsalsList');

    if (!rehearsals.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎸</div>
                <h3>Sin ensayos</h3>
                <p>Programa tu primer ensayo</p>
            </div>
        `;
        return;
    }

    const sorted = [...rehearsals].sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = sorted.map(r => `
        <div class="song-item" onclick="viewRehearsal('${r.id}')" style="cursor: pointer;">
            <div class="song-thumb">${r.date >= today ? '📅' : '✅'}</div>
            <div class="song-info">
                <h4>${r.title || 'Ensayo'}</h4>
                <p>${formatDate(r.date)} ${r.time ? '· ' + r.time : ''}</p>
            </div>
            <span class="badge ${r.date >= today ? 'badge-primary' : 'badge-neutral'}">
                ${r.date >= today ? 'Programado' : 'Completado'}
            </span>
            ${isAdmin() ? `
                <div class="song-actions" onclick="event.stopPropagation();">
                    <button class="btn btn-ghost btn-sm" onclick="editRehearsal('${r.id}')">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteRehearsal('${r.id}')">🗑️</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function openRehearsalModal(rehearsal = null) {
    document.getElementById('rehearsalModalTitle').textContent = rehearsal ? 'Editar Ensayo' : 'Nuevo Ensayo';
    document.getElementById('rehearsalId').value = rehearsal?.id || '';
    document.getElementById('rehearsalTitle').value = rehearsal?.title || '';
    document.getElementById('rehearsalDate').value = rehearsal?.date || '';
    document.getElementById('rehearsalTime').value = rehearsal?.time || '';
    document.getElementById('rehearsalLocation').value = rehearsal?.location || '';
    document.getElementById('rehearsalNotes').value = rehearsal?.notes || '';
    document.getElementById('rehearsalModal').classList.add('active');
}

function closeRehearsalModal() {
    document.getElementById('rehearsalModal').classList.remove('active');
}

function editRehearsal(id) {
    const rehearsal = rehearsals.find(r => r.id === id);
    openRehearsalModal(rehearsal);
}

function saveRehearsal() {
    const id = document.getElementById('rehearsalId').value;
    const data = {
        id: id || Date.now().toString(),
        title: document.getElementById('rehearsalTitle').value || 'Ensayo',
        date: document.getElementById('rehearsalDate').value,
        time: document.getElementById('rehearsalTime').value,
        location: document.getElementById('rehearsalLocation').value,
        notes: document.getElementById('rehearsalNotes').value
    };

    if (id) {
        const index = rehearsals.findIndex(r => r.id === id);
        if (index !== -1) rehearsals[index] = data;
    } else {
        rehearsals.push(data);
    }

    saveToStorage();
    closeRehearsalModal();
    renderAll();
    showToast('Ensayo guardado');
}

function deleteRehearsal(id) {
    if (confirm('¿Eliminar este ensayo?')) {
        rehearsals = rehearsals.filter(r => r.id !== id);
        saveToStorage();
        renderAll();
        showToast('Ensayo eliminado');
    }
}

function viewRehearsal(id) {
    const rehearsal = rehearsals.find(r => r.id === id);
    if (!rehearsal) return;

    document.getElementById('viewRehearsalTitle').textContent = rehearsal.title || 'Ensayo';
    document.getElementById('viewRehearsalContent').innerHTML = `
        <div style="display: grid; gap: 12px;">
            <div><strong>📅 Fecha:</strong> ${formatDate(rehearsal.date)}</div>
            ${rehearsal.time ? `<div><strong>🕐 Hora:</strong> ${rehearsal.time}</div>` : ''}
            ${rehearsal.location ? `<div><strong>📍 Lugar:</strong> ${rehearsal.location}</div>` : ''}
            ${rehearsal.notes ? `
                <div style="margin-top: 12px;">
                    <strong>📝 Notas:</strong>
                    <p style="margin-top: 8px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">${rehearsal.notes}</p>
                </div>
            ` : ''}
        </div>
    `;
    document.getElementById('viewRehearsalModal').classList.add('active');
}

function closeViewRehearsalModal() {
    document.getElementById('viewRehearsalModal').classList.remove('active');
}

loadData();
