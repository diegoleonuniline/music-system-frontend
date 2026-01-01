checkAuth();
initApp();

let allEvents = [], allSetlists = [], currentEvent = null;

// Set mes actual
const today = new Date();
document.getElementById('filterMonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

async function loadData() {
    try {
        const month = document.getElementById('filterMonth').value;
        const [year, m] = month.split('-');
        
        [allEvents, allSetlists] = await Promise.all([
            apiGet(`/events?start_date=${year}-${m}-01&end_date=${year}-${m}-31`),
            apiGet('/setlists')
        ]);

        // Populate setlist select
        const sel = document.getElementById('eventSetlist');
        sel.innerHTML = '<option value="">Sin set list</option>' + 
            allSetlists.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        renderEvents();
    } catch (error) {
        document.getElementById('eventsList').innerHTML = '<div class="empty-state"><p>Error al cargar</p></div>';
    }
}

function renderEvents() {
    const sorted = [...allEvents].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    const container = document.getElementById('eventsList');

    if (!sorted.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-title">Sin eventos este mes</div>
            </div>
        `;
        return;
    }

    container.innerHTML = sorted.map(e => {
        const d = new Date(e.event_date + 'T00:00:00');
        const isCancelled = e.status === 'cancelled';
        
        return `
            <div class="event-item ${isCancelled ? 'opacity-50' : ''}" onclick="viewEvent(${e.id})">
                <div class="event-date">
                    <div class="event-day">${d.getDate()}</div>
                    <div class="event-month">${getMonthName(d.getMonth())}</div>
                </div>
                <div class="event-info">
                    <div class="event-title">${e.name}</div>
                    <div class="event-venue">${e.venue || 'Sin lugar'} ${e.start_time ? '· ' + e.start_time : ''}</div>
                    <div class="event-tags">
                        <span class="badge badge-${e.status === 'confirmed' ? 'green' : e.status === 'tentative' ? 'orange' : 'red'}">
                            ${e.status === 'confirmed' ? 'Confirmado' : e.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
                        </span>
                        ${e.setlist_name ? `<span class="badge badge-purple">📋 ${e.setlist_name}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function viewEvent(id) {
    currentEvent = allEvents.find(e => e.id === id);
    if (!currentEvent) return;

    document.getElementById('viewEventTitle').textContent = currentEvent.name;
    document.getElementById('viewEventContent').innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
            <span class="badge badge-${currentEvent.status === 'confirmed' ? 'green' : currentEvent.status === 'tentative' ? 'orange' : 'red'}">
                ${currentEvent.status === 'confirmed' ? 'Confirmado' : currentEvent.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
            </span>
            <span class="badge badge-${currentEvent.payment_status === 'paid' ? 'green' : currentEvent.payment_status === 'partial' ? 'orange' : 'gray'}">
                ${currentEvent.payment_status === 'paid' ? '💰 Pagado' : currentEvent.payment_status === 'partial' ? '💰 Parcial' : '💰 Pendiente'}
            </span>
        </div>
        
        <div style="display:grid;gap:16px">
            <div><strong class="text-muted">📅 Fecha:</strong> ${formatDate(currentEvent.event_date)}</div>
            <div><strong class="text-muted">🕐 Horario:</strong> ${currentEvent.start_time || '-'} ${currentEvent.end_time ? '- ' + currentEvent.end_time : ''}</div>
            <div><strong class="text-muted">📍 Lugar:</strong> ${currentEvent.venue || '-'}</div>
            <div><strong class="text-muted">🏙️ Ciudad:</strong> ${currentEvent.city || '-'}</div>
            <div><strong class="text-muted">👔 Uniforme:</strong> ${currentEvent.uniform || '-'}</div>
            <div><strong class="text-muted">📋 Set List:</strong> ${currentEvent.setlist_name || 'No asignado'}</div>
            <div><strong class="text-muted">💰 Pago:</strong> $${currentEvent.payment || 0}</div>
            ${currentEvent.notes ? `<div><strong class="text-muted">📝 Notas:</strong> ${currentEvent.notes}</div>` : ''}
        </div>
        
        ${isAdmin() ? `
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-default);display:flex;gap:8px">
                <button class="btn btn-secondary btn-sm" onclick="editEvent()">✎ Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEvent(${currentEvent.id})">Eliminar</button>
            </div>
        ` : ''}
    `;
    
    openModal('viewEventModal');
}

function openEventModal(event = null) {
    document.getElementById('eventModalTitle').textContent = event ? 'Editar Evento' : 'Nuevo Evento';
    document.getElementById('eventId').value = event?.id || '';
    document.getElementById('eventName').value = event?.name || '';
    document.getElementById('eventDate').value = getDateValue(event?.event_date) || '';
    document.getElementById('eventCity').value = event?.city || '';
    document.getElementById('eventVenue').value = event?.venue || '';
    document.getElementById('eventStart').value = event?.start_time || '';
    document.getElementById('eventEnd').value = event?.end_time || '';
    document.getElementById('eventSetlist').value = event?.setlist_id || '';
    document.getElementById('eventUniform').value = event?.uniform || '';
    document.getElementById('eventPayment').value = event?.payment || '';
    document.getElementById('eventStatus').value = event?.status || 'confirmed';
    document.getElementById('eventPayStatus').value = event?.payment_status || 'pending';
    document.getElementById('eventNotes').value = event?.notes || '';
    openModal('eventModal');
}

function editEvent() {
    closeModal('viewEventModal');
    openEventModal(currentEvent);
}

async function saveEvent() {
    const id = document.getElementById('eventId').value;
    const data = {
        name: document.getElementById('eventName').value,
        event_date: document.getElementById('eventDate').value,
        city: document.getElementById('eventCity').value,
        venue: document.getElementById('eventVenue').value,
        start_time: document.getElementById('eventStart').value || null,
        end_time: document.getElementById('eventEnd').value || null,
        setlist_id: document.getElementById('eventSetlist').value || null,
        uniform: document.getElementById('eventUniform').value,
        payment: document.getElementById('eventPayment').value || null,
        status: document.getElementById('eventStatus').value,
        payment_status: document.getElementById('eventPayStatus').value,
        notes: document.getElementById('eventNotes').value
    };

    if (!data.name || !data.event_date) {
        showToast('Nombre y fecha son obligatorios');
        return;
    }

    try {
        if (id) await apiPut(`/events/${id}`, data);
        else await apiPost('/events', data);
        closeModal('eventModal');
        loadData();
        showToast(id ? 'Evento actualizado' : 'Evento creado');
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteEvent(id) {
    if (confirm('¿Eliminar este evento?')) {
        await apiDelete(`/events/${id}`);
        closeModal('viewEventModal');
        loadData();
        showToast('Evento eliminado');
    }
}

loadData();
