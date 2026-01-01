checkAuth();
setupUserInfo();

async function loadDashboard() {
    try {
        const [songs, setlists, events, users] = await Promise.all([
            apiGet('/songs'),
            apiGet('/setlists'),
            apiGet('/events'),
            apiGet('/users').catch(() => [])
        ]);

        // Stats
        animateNumber('totalSongs', songs?.length || 0);
        animateNumber('totalSetlists', setlists?.length || 0);
        animateNumber('totalEvents', events?.length || 0);
        animateNumber('totalMusicians', users?.filter(u => u.role === 'musician').length || 0);

        // Upcoming Events
        const today = new Date().toISOString().split('T')[0];
        const upcoming = (events || [])
            .filter(e => getDateValue(e.event_date) >= today && e.status !== 'cancelled')
            .sort((a, b) => getDateValue(a.event_date).localeCompare(getDateValue(b.event_date)))
            .slice(0, 4);
        
        const eventsContainer = document.getElementById('upcomingEvents');
        if (upcoming.length) {
            eventsContainer.innerHTML = upcoming.map(e => {
                const d = formatDateShort(e.event_date);
                return `
                    <div class="event-item" onclick="location.href='events.html'">
                        <div class="event-date">
                            <div class="event-day">${d.day}</div>
                            <div class="event-month">${d.month}</div>
                        </div>
                        <div class="event-info">
                            <div class="event-title">${e.name}</div>
                            <div class="event-venue">${e.venue || 'Sin lugar'} · ${e.city || ''}</div>
                            <div class="event-tags">
                                <span class="badge ${e.status === 'confirmed' ? 'badge-green' : 'badge-orange'}">
                                    ${e.status === 'confirmed' ? 'Confirmado' : 'Tentativo'}
                                </span>
                                ${e.start_time ? `<span class="badge badge-gray">${formatTime(e.start_time)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <div class="empty-title">Sin eventos próximos</div>
                    <div class="empty-text">Agenda tu primer evento</div>
                </div>
            `;
        }

        // Favorite Songs
        const favorites = (songs || []).filter(s => s.is_favorite).slice(0, 5);
        const favContainer = document.getElementById('favoriteSongs');
        
        if (favorites.length) {
            favContainer.innerHTML = favorites.map(s => `
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
            favContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⭐</div>
                    <div class="empty-title">Sin favoritas</div>
                    <div class="empty-text">Marca canciones como favoritas</div>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

loadDashboard();
