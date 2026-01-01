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

        // Animación de números
        animateNumber('totalSongs', songs?.length || 0);
        animateNumber('totalSetlists', setlists?.length || 0);
        animateNumber('totalEvents', events?.length || 0);
        animateNumber('totalMusicians', users?.filter(u => u.role === 'musician').length || 0);

        // Próximos eventos
        const today = new Date().toISOString().split('T')[0];
        const upcoming = events?.filter(e => e.event_date >= today).slice(0, 5) || [];
        
        const eventsContainer = document.getElementById('upcomingEvents');
        if (upcoming.length) {
            eventsContainer.innerHTML = upcoming.map(e => `
                <div class="song-item">
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
                    <p>Agenda tu primer evento</p>
                </div>
            `;
        }

        // Favoritas
        const favorites = songs?.filter(s => s.is_favorite).slice(0, 5) || [];
        const favContainer = document.getElementById('favoriteSongs');
        
        if (favorites.length) {
            favContainer.innerHTML = favorites.map(s => `
                <div class="song-item">
                    <span style="color: var(--warning);">⭐</span>
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
                    <p>Marca canciones como favoritas</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 500;
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(progress * target);
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

loadDashboard();
