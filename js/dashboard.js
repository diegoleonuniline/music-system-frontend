checkAuth();
setupUserInfo();

async function loadDashboard() {
    try {
        const [songs, setlists, events, users] = await Promise.all([
            apiGet('/songs'),
            apiGet('/setlists'),
            apiGet('/events'),
            apiGet('/users')
        ]);

        document.getElementById('totalSongs').textContent = songs?.length || 0;
        document.getElementById('totalSetlists').textContent = setlists?.length || 0;
        document.getElementById('totalEvents').textContent = events?.length || 0;
        document.getElementById('totalMusicians').textContent = users?.filter(u => u.role === 'musician').length || 0;

        // Próximos eventos
        const today = new Date().toISOString().split('T')[0];
        const upcoming = (events || [])
            .filter(e => e.event_date && getDateValue(e.event_date) >= today)
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
            .slice(0, 5);

        const eventsContainer = document.getElementById('upcomingEvents');
        if (upcoming.length) {
            eventsContainer.innerHTML = upcoming.map(e => `
                <div class="song-item">
                    <div class="song-thumb">📅</div>
                    <div class="song-info">
                        <h4>${e.name}</h4>
                        <p>${e.venue || 'Sin lugar'} · ${formatDate(e.event_date)}</p>
                    </div>
                    <span class="badge ${e.status === 'confirmed' ? 'badge-success' : 'badge-warning'}">
                        ${e.status === 'confirmed' ? 'Confirmado' : 'Tentativo'}
                    </span>
                </div>
            `).join('');
        } else {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📅</div>
                    <h3>Sin eventos próximos</h3>
                </div>
            `;
        }

        // Favoritas
        const favorites = (songs || []).filter(s => s.is_favorite).slice(0, 5);
        const favContainer = document.getElementById('favoriteSongs');

        if (favorites.length) {
            favContainer.innerHTML = favorites.map(s => `
                <div class="song-item">
                    <div class="song-thumb">🎵</div>
                    <div class="song-info">
                        <h4>${s.name}</h4>
                        <p>${s.artist || 'Sin artista'}</p>
                    </div>
                    <span style="color: var(--warning);">⭐</span>
                </div>
            `).join('');
        } else {
            favContainer.innerHTML = `
                <div class="empty-state">
                    <div class="icon">⭐</div>
                    <h3>Sin favoritas</h3>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

loadDashboard();
