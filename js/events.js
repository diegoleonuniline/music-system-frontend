checkAuth();
setupUserInfo();

var allEvents = [];
var allSetlists = [];
var viewMode = 'cards'; // Siempre inicia en cards

async function loadEvents() {
    try {
        var results = await Promise.all([
            apiGet('/events'),
            apiGet('/setlists')
        ]);
        allEvents = Array.isArray(results[0]) ? results[0] : [];
        allSetlists = Array.isArray(results[1]) ? results[1] : [];
        renderEvents();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('eventsContainer').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    renderEvents();
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
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    var parts = timeStr.split(':');
    var h = parseInt(parts[0]);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
}

function getStatusBadge(status) {
    var labels = { confirmed: 'Confirmado', tentative: 'Tentativo', cancelled: 'Cancelado' };
    var classes = { confirmed: 'badge-success', tentative: 'badge-warning', cancelled: 'badge-danger' };
    return '<span class="badge ' + (classes[status] || 'badge-neutral') + '">' + (labels[status] || status) + '</span>';
}

function renderEvents() {
    var container = document.getElementById('eventsContainer');
    
    if (!allEvents.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><h3>Sin eventos</h3><p>Crea tu primer evento</p></div>';
        return;
    }

    var today = new Date();
    today.setHours(0,0,0,0);
    var todayStr = today.toISOString().split('T')[0];
    
    var sorted = allEvents.slice().sort(function(a, b) {
        return new Date(a.event_date) - new Date(b.event_date);
    });

    // Separar próximos y pasados
    var upcoming = sorted.filter(function(e) { return getDateValue(e.event_date) >= todayStr; });
    var past = sorted.filter(function(e) { return getDateValue(e.event_date) < todayStr; }).reverse();

    if (viewMode === 'table') {
        var html = '';
        if (upcoming.length) {
            html += '<h4 style="padding: 16px 16px 8px; color: var(--text-secondary);">📅 Próximos</h4>';
            html += renderEventsTable(upcoming, todayStr);
        }
        if (past.length) {
            html += '<h4 style="padding: 16px 16px 8px; color: var(--text-secondary);">📆 Pasados</h4>';
            html += renderEventsTable(past, todayStr);
        }
        container.innerHTML = html;
    } else {
        var html = '';
        if (upcoming.length) {
            html += '<h4 style="padding: 16px 16px 8px; color: var(--text-secondary);">📅 Próximos</h4>';
            html += '<div class="events-grid">' + upcoming.map(function(e) { return renderEventCard(e, todayStr); }).join('') + '</div>';
        }
        if (past.length) {
            html += '<h4 style="padding: 16px 16px 8px; color: var(--text-secondary);">📆 Pasados</h4>';
            html += '<div class="events-grid">' + past.map(function(e) { return renderEventCard(e, todayStr); }).join('') + '</div>';
        }
        container.innerHTML = html;
    }
}

function renderEventCard(e, todayStr) {
    var eventDate = parseLocalDate(e.event_date);
    var isPast = getDateValue(e.event_date) < todayStr;
    var isCancelled = e.status === 'cancelled';
    
    return '<div class="event-card" style="' + (isPast || isCancelled ? 'opacity: 0.6;' : '') + '">' +
        '<div class="event-card-header" onclick="viewEvent(' + e.id + ')">' +
            '<div class="event-date-badge">' +
                '<span class="day">' + eventDate.getDate() + '</span>' +
                '<span class="month">' + eventDate.toLocaleDateString('es-MX', {month: 'short'}).toUpperCase() + '</span>' +
            '</div>' +
            '<div class="event-info">' +
                '<h4>' + e.name + '</h4>' +
                '<p>📍 ' + (e.venue || 'Sin lugar') + (e.city ? ', ' + e.city : '') + '</p>' +
                (e.start_time ? '<p>🕐 ' + formatTime(e.start_time) + (e.end_time ? ' - ' + formatTime(e.end_time) : '') + '</p>' : '') +
                (e.uniform ? '<p>👔 ' + e.uniform + '</p>' : '') +
            '</div>' +
            getStatusBadge(e.status) +
        '</div>' +
        '<div class="event-card-actions">' +
            '<button class="btn btn-ghost btn-sm" onclick="viewEvent(' + e.id + ')">👁️ Ver</button>' +
            (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="editEvent(' + e.id + ')">✏️ Editar</button>' +
            '<button class="btn btn-ghost btn-sm btn-danger-text" onclick="deleteEvent(' + e.id + ')">🗑️ Eliminar</button>' : '') +
        '</div>' +
    '</div>';
}

function renderEventsTable(events, todayStr) {
    return '<div class="table-container"><table><thead><tr>' +
        '<th>Evento</th><th>Fecha</th><th>Lugar</th><th>Uniforme</th><th>Estado</th><th>Acciones</th>' +
        '</tr></thead><tbody>' +
        events.map(function(e) {
            var isPast = getDateValue(e.event_date) < todayStr;
            var isCancelled = e.status === 'cancelled';
            return '<tr style="' + (isPast || isCancelled ? 'opacity: 0.6;' : '') + '">' +
                '<td><strong>' + e.name + '</strong></td>' +
                '<td>' + formatDate(e.event_date) + (e.start_time ? '<br><small>' + formatTime(e.start_time) + '</small>' : '') + '</td>' +
                '<td>' + (e.venue || '-') + (e.city ? '<br><small>' + e.city + '</small>' : '') + '</td>' +
                '<td>' + (e.uniform || '-') + '</td>' +
                '<td>' + getStatusBadge(e.status) + '</td>' +
                '<td class="table-actions">' +
                    '<button class="btn btn-ghost btn-sm" onclick="viewEvent(' + e.id + ')">👁️</button>' +
                    (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="editEvent(' + e.id + ')">✏️</button>' +
                    '<button class="btn btn-ghost btn-sm btn-danger-text" onclick="deleteEvent(' + e.id + ')">🗑️</button>' : '') +
                '</td></tr>';
        }).join('') + '</tbody></table></div>';
}

function viewEvent(id) {
    var e = allEvents.find(function(ev) { return ev.id === id; });
    if (!e) return;

    document.getElementById('viewEventName').textContent = e.name;
    
    var dateTimeStr = formatDate(e.event_date);
    if (e.start_time) {
        dateTimeStr += ' a las ' + formatTime(e.start_time);
        if (e.end_time) dateTimeStr += ' - ' + formatTime(e.end_time);
    }
    document.getElementById('viewEventDate').textContent = dateTimeStr;
    
    var venueStr = e.venue || 'Sin lugar';
    if (e.city) venueStr += ', ' + e.city;
    if (e.address) venueStr += '<br><small style="color:var(--text-tertiary);">' + e.address + '</small>';
    document.getElementById('viewEventVenue').innerHTML = venueStr;
    
    var mapsEl = document.getElementById('viewEventMaps');
    if (e.google_maps_url) {
        mapsEl.innerHTML = '<a href="' + e.google_maps_url + '" target="_blank" class="btn btn-ghost btn-sm">🗺️ Ver en Google Maps</a>';
        mapsEl.style.display = 'block';
    } else {
        mapsEl.style.display = 'none';
    }
    
    document.getElementById('viewEventUniform').textContent = e.uniform || 'No especificado';
    document.getElementById('viewEventStatus').innerHTML = getStatusBadge(e.status);
    document.getElementById('viewEventNotes').innerHTML = e.notes ? nl2br(e.notes) : '<em>Sin notas</em>';
    
    var setlistHtml = 'Sin set list asignado';
    if (e.setlist_id) {
        var setlist = allSetlists.find(function(s) { return s.id === e.setlist_id; });
        if (setlist) {
            setlistHtml = '<strong>' + setlist.name + '</strong> (' + (setlist.total_songs || 0) + ' canciones)';
        }
    }
    document.getElementById('viewEventSetlist').innerHTML = setlistHtml;

    document.getElementById('viewEventModal').classList.add('active');
    document.getElementById('viewEventModal').dataset.eventId = id;
}

function closeViewEventModal() {
    document.getElementById('viewEventModal').classList.remove('active');
}

function openEventModal(eventData) {
    document.getElementById('eventModalTitle').textContent = eventData ? 'Editar Evento' : 'Nuevo Evento';
    document.getElementById('eventId').value = eventData ? eventData.id : '';
    document.getElementById('eventName').value = eventData ? eventData.name : '';
    document.getElementById('eventDate').value = eventData ? getDateValue(eventData.event_date) : '';
    document.getElementById('eventStartTime').value = eventData ? (eventData.start_time || '') : '';
    document.getElementById('eventEndTime').value = eventData ? (eventData.end_time || '') : '';
    document.getElementById('eventVenue').value = eventData ? (eventData.venue || '') : '';
    document.getElementById('eventAddress').value = eventData ? (eventData.address || '') : '';
    document.getElementById('eventCity').value = eventData ? (eventData.city || '') : '';
    document.getElementById('eventGoogleMaps').value = eventData ? (eventData.google_maps_url || '') : '';
    document.getElementById('eventUniform').value = eventData ? (eventData.uniform || '') : '';
    document.getElementById('eventStatus').value = eventData ? eventData.status : 'tentative';
    document.getElementById('eventNotes').value = eventData ? (eventData.notes || '') : '';
    
    var setlistSelect = document.getElementById('eventSetlist');
    setlistSelect.innerHTML = '<option value="">Sin set list</option>' +
        allSetlists.map(function(s) {
            return '<option value="' + s.id + '"' + (eventData && eventData.setlist_id === s.id ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('');

    document.getElementById('eventModal').classList.add('active');
}

function closeEventModal() {
    document.getElementById('eventModal').classList.remove('active');
}

function editEvent(id) {
    event.stopPropagation();
    var e = allEvents.find(function(ev) { return ev.id === id; });
    if (e) openEventModal(e);
}

function editCurrentEvent() {
    var id = document.getElementById('viewEventModal').dataset.eventId;
    closeViewEventModal();
    editEvent(parseInt(id));
}

async function saveEvent() {
    var id = document.getElementById('eventId').value;
    var data = {
        name: document.getElementById('eventName').value,
        event_date: document.getElementById('eventDate').value,
        start_time: document.getElementById('eventStartTime').value || null,
        end_time: document.getElementById('eventEndTime').value || null,
        venue: document.getElementById('eventVenue').value || null,
        address: document.getElementById('eventAddress').value || null,
        city: document.getElementById('eventCity').value || null,
        google_maps_url: document.getElementById('eventGoogleMaps').value || null,
        uniform: document.getElementById('eventUniform').value || null,
        status: document.getElementById('eventStatus').value,
        notes: document.getElementById('eventNotes').value || null,
        setlist_id: document.getElementById('eventSetlist').value ? parseInt(document.getElementById('eventSetlist').value) : null
    };

    if (!data.name || !data.event_date) {
        showToast('Nombre y fecha son requeridos', 'warning');
        return;
    }

    try {
        if (id) {
            await apiPut('/events/' + id, data);
        } else {
            await apiPost('/events', data);
        }
        closeEventModal();
        loadEvents();
        showToast('Evento guardado');
    } catch (e) {
        console.error('Error:', e);
        showToast('Error al guardar', 'error');
    }
}

async function deleteEvent(id) {
    event.stopPropagation();
    if (confirm('¿Eliminar este evento?')) {
        try {
            await apiDelete('/events/' + id);
            closeViewEventModal();
            loadEvents();
            showToast('Evento eliminado');
        } catch (e) {
            showToast('Error al eliminar', 'error');
        }
    }
}

function deleteCurrentEvent() {
    var id = document.getElementById('viewEventModal').dataset.eventId;
    deleteEvent(parseInt(id));
}

function nl2br(str) {
    return str ? str.replace(/\n/g, '<br>') : '';
}

loadEvents();
