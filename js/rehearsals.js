checkAuth();
setupUserInfo();

let allSongs = [];
let repertoire = JSON.parse(localStorage.getItem('repertoire') || '[]');

async function loadData() {
    try {
        allSongs = await apiGet('/songs') || [];
        renderRepertoire();
    } catch (error) {
        console.error('Error:', error);
    }
}

function saveToStorage() {
    localStorage.setItem('repertoire', JSON.stringify(repertoire));
}

function renderRepertoire() {
    const container = document.getElementById('repertoireList');

    if (!repertoire.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🎸</div>
                <h3>Sin canciones para ensayar</h3>
                <p>Agrega canciones que quieras practicar</p>
            </div>
        `;
        return;
    }

    const sorted = [...repertoire].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
    });

    container.innerHTML = sorted.map(r => {
        const song = allSongs.find(s => s.id === r.songId);
        if (!song) return '';
        
        return `
            <div class="song-item">
                <div class="song-thumb" style="background: ${getPriorityColor(r.priority)};">
                    ${r.priority === 'high' ? '🔥' : r.priority === 'medium' ? '⚡' : '📌'}
                </div>
                <div class="song-info">
                    <h4>${song.name}</h4>
                    <p>${song.artist || 'Sin artista'}${song.musical_key ? ' · ' + song.musical_key : ''}</p>
                </div>
                <select onchange="updateStatus(${r.songId}, this.value)" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); font-size: 13px;">
                    <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="learning" ${r.status === 'learning' ? 'selected' : ''}>Aprendiendo</option>
                    <option value="ready" ${r.status === 'ready' ? 'selected' : ''}>Lista ✓</option>
                </select>
                <button class="btn btn-ghost btn-sm" onclick="removeFromRepertoire(${r.songId})">✕</button>
            </div>
        `;
    }).join('');
}

function getPriorityColor(priority) {
    if (priority === 'high') return 'linear-gradient(135deg, #EF4444, #DC2626)';
    if (priority === 'medium') return 'linear-gradient(135deg, #F59E0B, #D97706)';
    return 'linear-gradient(135deg, #6B7280, #4B5563)';
}

function updateStatus(songId, status) {
    const item = repertoire.find(r => r.songId === songId);
    if (item) {
        item.status = status;
        saveToStorage();
        renderRepertoire();
        showToast(status === 'ready' ? '¡Canción lista!' : 'Estado actualizado');
    }
}

function removeFromRepertoire(songId) {
    if (confirm('¿Quitar del repertorio?')) {
        repertoire = repertoire.filter(r => r.songId !== songId);
        saveToStorage();
        renderRepertoire();
        showToast('Canción quitada');
    }
}

function openAddModal() {
    document.getElementById('searchSongInput').value = '';
    filterSongs();
    document.getElementById('addModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
}

function filterSongs() {
    const search = document.getElementById('searchSongInput').value.toLowerCase();
    const repertoireIds = repertoire.map(r => r.songId);

    const available = allSongs.filter(s =>
        !repertoireIds.includes(s.id) &&
        (s.name.toLowerCase().includes(search) || (s.artist || '').toLowerCase().includes(search))
    );

    const container = document.getElementById('availableSongs');
    container.innerHTML = available.length ? available.map(s => `
        <div class="song-item">
            <div class="song-info">
                <h4>${s.name}</h4>
                <p>${s.artist || 'Sin artista'}</p>
            </div>
            <select id="priority-${s.id}" style="padding: 6px; border-radius: 6px; border: 1px solid var(--border); font-size: 13px;">
                <option value="high">🔥 Alta</option>
                <option value="medium" selected>⚡ Media</option>
                <option value="low">📌 Baja</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="addToRepertoire(${s.id})">+</button>
        </div>
    `).join('') : '<div class="empty-state"><p>No hay más canciones</p></div>';
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
    filterSongs();
    showToast('Canción agregada');
}

loadData();
