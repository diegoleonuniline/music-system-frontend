checkAuth();
initApp();

async function loadData() {
    try {
        const [songs, setlists, events, users] = await Promise.all([
            apiGet('/songs'),
            apiGet('/setlists'),
            apiGet('/events'),
            apiGet('/users')
        ]);

        // Stats animados
        animateNumber(document.getElementById('totalSongs'), songs?.length || 0);
        animateNumber(document.getElementById('totalSetlists'), setlists?.length || 0);
        animateNumber(document.getElementById('totalEvents'), events?.length || 0);
        animateNumber(document.getElementById('totalMusicians'), users?.filter(u => u.role === 'musician').length || 0);

        // Próximos eventos
        const today = new Date().toISOString().split('T')[0];
        const upcoming = (events || [])
            .filter(e => getDateValue(e.event_date) >= today && e.status !== 'cancelled')
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
            .slice(0, 3);
        
        const eventsEl = document.getElementById('upcomingEvents');
        if (upcoming.length) {
            eventsEl.innerHTML = upcoming.map(e => {
                const d = new Date(e.event_date + 'T00:00:00');
                return `
                    <div class="event-item" onclick="location.href='events.html'">
                        <div class="event-date">
                            <div class="event-day">${d.getDate()}</div>
                            <div class="event-month">${getMonthName(d.getMonth())}</div>
                        </div>
                        <div class="event-info">
                            <div class="event-title">${e.name}</div>
                            <div class="event-venue">${e.venue || 'Sin lugar'} ${e.start_time ? '· ' + e.start_time : ''}</div>
                            <div class="event-tags">
                                <span class="badge badge-${e.status === 'confirmed' ? 'green' : 'orange'}">${e.status === 'confirmed' ? 'Confirmado' : 'Tentativo'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            eventsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p class="text-muted">Sin eventos próximos</p></div>';
        }

        // Favoritas
        const favorites = (songs || []).filter(s => s.is_favorite).slice(0, 4);
        const favsEl = document.getElementById('favoriteSongs');
        
        if (favorites.length) {
            favsEl.innerHTML = favorites.map(s => `
                <div class="song-item" onclick="location.href='songs.html'">
                    <div class="song-thumb">🎵</div>
                    <div class="song-info">
                        <div class="song-title">${s.name}</div>
                        <div class="song-artist">${s.artist || 'Sin artista'}</div>
                    </div>
                    <span style="color: var(--orange); font-size: 18px;">⭐</span>
                </div>
            `).join('');
        } else {
            favsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><p class="text-muted">Sin favoritas</p></div>';
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

loadData();
