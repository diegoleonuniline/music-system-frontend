checkAuth();
setupUserInfo();

let allEvents = [];
let allSetlists = [];
let viewMode = 'cards';

async function loadEvents() {
    try {
        [allEvents, allSetlists] = await Promise.all([
            apiGet('/events'),
            apiGet('/setlists')
        ]);
        allEvents = Array.isArray(allEvents) ? allEvents : [];
        allSetlists = Array.isArray(allSetlists) ? allSetlists : [];
        renderEvents();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('eventsContainer').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-toggle button').forEach(function(btn) {
        btn.classList.toggle('active', btn.textContent.toLowerCase().indexOf(mode === 'cards' ? 'tarjeta' : 'tabla') !== -1);
    });
    renderEvents();
}

function getDateValue(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
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

function renderEvents() {
    var container = document.getElementById('eventsContainer');
    
    if (!allEvents.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><h3>Sin eventos</h3><p>Crea tu primer evento</p></div>';
        return;
    }

    var today = new Date().toISOString().split('T')[0];
    var sorted = allEvents.slice().sort(function(a, b) {
        return new Date(b.event_date) - new Date(a.event_date);
    });

    if (viewMode === 'table') {
        container.innerHTML = '<div class="table-container"><table><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Estado</th><th></th></tr></thead><tbody>' +
            sorted.map(function(e) {
                var isPast = getDateValue(e.event_date) < today;
                return '<tr style="' + (isPast ? 'opacity: 0.6;' : '') + '">' +
                    '<td><strong>' + e.name + '</strong></td>' +
                    '<td>' + formatDate(e.event_date) + (e.event_time ? ' ' + formatTime(e.event_time) : '') + '</td>' +
                    '<td>' + (e.venue || '-') + '</td>' +
                    '<td><span class="badge ' + (e.status === 'confirmed' ? 'badge-success' : 'badge-warning') + '">' +
                        (e.status === 'confirmed' ? 'Confirmado' : 'Tentativo') + '</span></td>' +
                    '<td>' +
                        '<button class="btn btn-ghost btn-sm" onclick="viewEvent(' + e.id + ')">Ver</button>' +
                        (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="editEvent(' + e.id + ')">✏️</button>' +
                        '<button class="btn btn-ghost btn-sm" onclick="deleteEvent(' + e.id + ')">🗑️</button>' : '') +
                    '</td></tr>';
            }).join('') + '</tbody></table></div>';
    } else {
        container.innerHTML = '<div class="events-grid">' + sorted.map(function(e) {
            var isPast = getDateValue(e.event_date) < today;
            return '<div class="event-card" onclick="viewEvent(' + e.id + ')" style="' + (isPast ? 'opacity: 0.6;' : '') + '">' +
                '<div class="event-date-badge"><span class="day">' + new Date(e.event_date).getDate() + '</span>' +
                '<span class="month">' + new Date(e.event_date).toLocaleDateString('es-MX', {month: 'short'}).toUpperCase() + '</span></div>' +
                '<div class="event-info"><h4>' + e.name + '</h4><p>📍 ' + (e.venue || 'Sin lugar') + '</p>' +
                (e.event_time ? '<p>🕐 ' + formatTime(e.event_time) + '</p>' : '') + '</div>' +
                '<span class="badge ' + (e.status === 'confirmed' ? 'badge-success' : 'badge-warning') + '">' +
                    (e.status === 'confirmed' ? 'Confirmado' : 'Tentativo') + '</span>' +
                (isAdmin() ? '<div class="actions" onclick="event.stopPropagation();">' +
                    '<button class="btn btn-ghost btn-sm" onclick="editEvent(' + e.id + ')">Editar</button>' +
                    '<button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="deleteEvent(' + e.id + ')">Eliminar</button></div>' : '') +
            '</div>';
        }).join('') + '</div>';
    }
}

async function viewEvent(id) {
    var e = allEvents.find(function(ev) { return ev.id === id; });
    if (!e) return;

    document.getElementById('viewEventName').textContent = e.name;
    document.getElementById('viewEventDate').textContent = formatDate(e.event_date) + (e.event_time ? ' a las ' + formatTime(e.event_time) : '');
    document.getElementById('viewEventVenue').textContent = e.venue || 'Sin lugar';
    document.getElementById('viewEventStatus').textContent = e.status === 'confirmed' ? 'Confirmado' : 'Tentativo';
    document.getElementById('viewEventStatus').className = 'badge ' + (e.status === 'confirmed' ? 'badge-success' : 'badge-warning');
    document.getElementById('viewEventNotes').textContent = e.notes || 'Sin notas';
    
    // Setlist
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
    document.getElementById('eventTime').value = eventData ? (eventData.event_time || '') : '';
    document.getElementById('eventVenue').value = eventData ? (eventData.venue || '') : '';
    document.getElementById('eventStatus').value = eventData ? eventData.status : 'tentative';
    document.getElementById('eventNotes').value = eventData ? (eventData.notes || '') : '';
    
    // Setlists
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
        event_time: document.getElementById('eventTime').value || null,
        venue: document.getElementById('eventVenue').value || null,
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

loadEvents();
