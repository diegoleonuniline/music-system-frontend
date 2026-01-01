checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

async function loadDashboard() {
    try {
        const [songs, setlists, events, users] = await Promise.all([
            apiGet('/songs'),
            apiGet('/setlists'),
            apiGet('/events'),
            apiGet('/users')
        ]);

        animateNumber('totalSongs', songs?.length || 0);
        animateNumber('totalSetlists', setlists?.length || 0);
        animateNumber('totalEvents', events?.length || 0);
        animateNumber('totalMusicians', users?.filter(u => u.role === 'musician').length || 0);

        // Próximos eventos
        const today = new Date().toISOString().split('T')[0];
        const upcoming = events?.filter(e => getDateValue(e.event_date) >= today)
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
            .slice(0, 4) || [];
        
        const eventsContainer = document.getElementById('upcomingEvents');
        if (upcoming.length) {
            eventsContainer.innerHTML = `
                <div class="events-list">
                    ${upcoming.map(e => {
                        const date = new Date(e.event_date + 'T00:00:00');
                        return `
                            <div class="event-card" onclick="location.href='events.html'">
                                <div class="event-date">
                                    <div class="day">${date.getDate()}</div>
                                    <div class="month">${getMonthName(date.getMonth())}</div>
                                </div>
                                <div class="event-info">
                                    <h4>${e.name}</h4>
                                    <p>${e.venue || 'Sin lugar'}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📅</div>
                    <h3>Sin eventos próximos</h3>
                </div>
            `;
        }

        // Favoritas
        const favorites = songs?.filter(s => s.is_favorite).slice(0, 5) || [];
        const favContainer = document.getElementById('favoriteSongs');
        
        if (favorites.length) {
            favContainer.innerHTML = favorites.map(s => `
                <div class="song-item" onclick="location.href='songs.html'">
                    <span style="color: var(--warning); font-size: 18px;">⭐</span>
                    <div class="song-info">
                        <h4>${s.name}</h4>
                        <p>${s.artist || 'Sin artista'}</p>
                    </div>
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

function animateNumber(id, target) {
    const el = document.getElementById(id);
    const duration = 600;
    const start = performance.now();
    
    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }
    
    requestAnimationFrame(update);
}

loadDashboard();
