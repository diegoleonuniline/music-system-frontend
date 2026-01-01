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

        document.getElementById('totalSongs').textContent = songs?.length || 0;
        document.getElementById('totalSetlists').textContent = setlists?.length || 0;
        document.getElementById('totalEvents').textContent = events?.length || 0;
        document.getElementById('totalMusicians').textContent = users?.filter(u => u.role === 'musician').length || 0;

        // Próximos eventos
        const today = new Date().toISOString().split('T')[0];
        const upcoming = events?.filter(e => e.event_date >= today).slice(0, 5) || [];
        
        const eventsHtml = upcoming.length ? upcoming.map(e => `
            <tr>
                <td>${e.name}</td>
                <td>${e.venue || '-'}</td>
                <td>${formatDate(e.event_date)}</td>
                <td>${e.start_time || '-'}</td>
            </tr>
        `).join('') : '<tr><td colspan="4">No hay eventos próximos</td></tr>';
        
        document.getElementById('upcomingEvents').innerHTML = eventsHtml;

        // Favoritas
        const favorites = songs?.filter(s => s.is_favorite).slice(0, 5) || [];
        const favHtml = favorites.length ? favorites.map(s => `
            <div class="song-item">
                <div class="song-info">
                    <h4>${s.name}</h4>
                    <p>${s.artist || 'Sin artista'}</p>
                </div>
            </div>
        `).join('') : '<p>No hay canciones favoritas</p>';
        
        document.getElementById('favoriteSongs').innerHTML = favHtml;

    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

loadDashboard();
