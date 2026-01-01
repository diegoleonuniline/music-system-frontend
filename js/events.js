checkAuth();
setupUserInfo();

let allEvents = [];
let allSetlists = [];
let currentView = 'list';
let currentEvent = null;

// Init month filter
const today = new Date();
document.getElementById('filterMonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

async function loadEvents() {
    try {
        const month = document.getElementById('filterMonth').value;
        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const endDate = `${year}-${monthNum}-31`;

        [allEvents, allSetlists] = await Promise.all([
            apiGet(`/events?start_date=${startDate}&end_date=${endDate}`),
            apiGet('/setlists')
        ]);
        
        // Populate setlist select
        const setlistSelect = document.getElementById('eventSetlist');
        setlistSelect.innerHTML = '<option value="">Sin set list</option>' + 
            (allSetlists || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        
        renderEvents();
    } catch (error) {
        console.error('Error:', error);
    }
}

function setView(view) {
    currentView = view;
    document.getElementById('viewList').classList.toggle('active', view === 'list');
    document.getElementById('viewTable').classList.toggle('active', view === 'table');
    document.getElementById('viewCalendar').classList.toggle('active', view === 'calendar');
    document.getElementById('viewWeek').classList.toggle('active', view === 'week');
    renderEvents();
}

function renderEvents() {
    const container = document.getElementById('eventsContainer');
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filtered = allEvents || [];
    if (statusFilter) {
        filtered = filtered.filter(e => e.status === statusFilter);
    }
    
    switch (currentView) {
        case 'list': renderListView(filtered, container); break;
        case 'table': renderTableView(filtered, container); break;
        case 'calendar': renderCalendarView(filtered, container); break;
        case 'week': renderWeekView(filtered, container); break;
    }
}

function renderListView(events, container) {
    if (!events.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-title">Sin eventos</div>
                <div class="empty-text">No hay eventos este mes</div>
            </div>
        `;
        return;
    }
    
    // Sort by date
    events.sort((a, b) => getDateValue(a.event_date).localeCompare(getDateValue(b.event_date)));
    
    container.innerHTML = events.map(e => {
        const d = formatDateShort(e.event_date);
        return `
            <div class="event-item" onclick="viewEvent(${e.id})" style="${e.status === 'cancelled' ? 'opacity: 0.5;' : ''}">
                <div class="event-date">
                    <div class="event-day">${d.day}</div>
                    <div class="event-month">${d.month}</div>
                </div>
                <div class="event-info">
                    <div class="event-title">${e.name}</div>
                    <div class="event-venue">${e.venue || 'Sin lugar'} · ${e.city || ''}</div>
                    <div class="event-tags">
                        <span class="badge ${e.status === 'confirmed' ? 'badge-green' : e.status === 'tentative' ? 'badge-orange' : 'badge-red'}">
                            ${e.status === 'confirmed' ? 'Confirmado' : e.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
                        </span>
                        ${e.start_time ? `<span class="badge badge-gray">${formatTime(e.start_time)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTableView(events, container) {
    if (!events.length) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Sin eventos</div></div>`;
        return;
    }
    
    events.sort((a, b) => getDateValue(a.event_date).localeCompare(getDateValue(b.event_date)));
    
    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Evento</th>
                        <th>Lugar</th>
                        <th>Horario</th>
                        <th>Estado</th>
                        <th>Pago</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(e => `
                        <tr onclick="viewEvent(${e.id})" style="cursor: pointer; ${e.status === 'cancelled' ? 'opacity: 0.5;' : ''}">
                            <td><strong>${formatDate(e.event_date)}</strong></td>
                            <td>${e.name}</td>
                            <td>${e.venue || '-'}<br><small class="text-muted">${e.city || ''}</small></td>
                            <td>${e.start_time ? formatTime(e.start_time) : '-'} ${e.end_time ? '- ' + formatTime(e.end_time) : ''}</td>
                            <td>
                                <span class="badge ${e.status === 'confirmed' ? 'badge-green' : e.status === 'tentative' ? 'badge-orange' : 'badge-red'}">
                                    ${e.status === 'confirmed' ? '✓' : e.status === 'tentative' ? '?' : '✕'}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${e.payment_status === 'paid' ? 'badge-green' : e.payment_status === 'partial' ? 'badge-orange' : 'badge-gray'}">
                                    $${e.payment || 0}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCalendarView(events, container) {
    const month = document.getElementById('filterMonth').value;
    const [year, monthNum] = month.split('-');
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    let html = `<div style="padding: var(--space-lg);">`;
    html += `<div class="calendar-header">${dayNames.map(d => `<div>${d}</div>`).join('')}</div>`;
    html += `<div class="calendar-grid">`;
    
    // Empty cells before month starts
    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day" style="opacity: 0.3;"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
        const dayEvents = events.filter(e => getDateValue(e.event_date) === dateStr);
        const isToday = dateStr === todayStr;
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="day-number">${day}</div>
                ${dayEvents.slice(0, 2).map(e => `
                    <div class="calendar-event ${e.status}" onclick="viewEvent(${e.id})">${e.name}</div>
                `).join('')}
                ${dayEvents.length > 2 ? `<small class="text-muted">+${dayEvents.length - 2} más</small>` : ''}
            </div>
        `;
    }
    
    html += '</div></div>';
    container.innerHTML = html;
}

function renderWeekView(events, container) {
    const todayDate = new Date();
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
    const todayStr = todayDate.toISOString().split('T')[0];
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    container.innerHTML = `
        <div style="padding: var(--space-lg);">
            <div class="week-grid">
                ${days.map((d, i) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const dayEvents = events.filter(e => getDateValue(e.event_date) === dateStr);
                    const isToday = dateStr === todayStr;
                    
                    return `
                        <div class="week-day ${isToday ? 'today' : ''}">
                            <div class="week-day-header">
                                <div class="day-name">${dayNames[i]}</div>
                                <div class="day-number">${d.getDate()}</div>
                            </div>
                            <div class="week-day-content">
                                ${dayEvents.length ? dayEvents.map(e => `
                                    <div class="calendar-event ${e.status}" onclick="viewEvent(${e.id})" style="margin-bottom: 8px;">
                                        <strong>${e.name}</strong><br>
                                        <small>${e.start_time ? formatTime(e.start_time) : ''}</small>
                                    </div>
                                `).join('') : '<small class="text-muted">Sin eventos</small>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ===== VIEW EVENT =====
function viewEvent(id) {
    currentEvent = allEvents.find(e => e.id === id);
    if (!currentEvent) return;
    
    document.getElementById('viewEventTitle').textContent = currentEvent.name;
    document.getElementById('viewEventContent').innerHTML = `
        <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-lg);">
            <span class="badge ${currentEvent.status === 'confirmed' ? 'badge-green' : currentEvent.status === 'tentative' ? 'badge-orange' : 'badge-red'}">
                ${currentEvent.status === 'confirmed' ? 'Confirmado' : currentEvent.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
            </span>
            <span class="badge ${currentEvent.payment_status === 'paid' ? 'badge-green' : currentEvent.payment_status === 'partial' ? 'badge-orange' : 'badge-gray'}">
                ${currentEvent.payment_status === 'paid' ? 'Pagado' : currentEvent.payment_status === 'partial' ? 'Pago parcial' : 'Pendiente'}
            </span>
        </div>
        
        <div style="display: grid; gap: var(--space-md);">
            <div><strong>📅 Fecha:</strong> ${formatDate(currentEvent.event_date)}</div>
            <div><strong>🕐 Horario:</strong> ${currentEvent.start_time ? formatTime(currentEvent.start_time) : '-'} ${currentEvent.end_time ? '- ' + formatTime(currentEvent.end_time) : ''}</div>
            <div><strong>📍 Lugar:</strong> ${currentEvent.venue || '-'}</div>
            <div><strong>🏙️ Ciudad:</strong> ${currentEvent.city || '-'}</div>
            ${currentEvent.address ? `<div><strong>📫 Dirección:</strong> ${currentEvent.address}</div>` : ''}
            ${currentEvent.google_maps_url ? `<div><a href="${currentEvent.google_maps_url}" target="_blank" class="btn btn-ghost btn-sm">🗺️ Ver en Google Maps</a></div>` : ''}
            <div><strong>👔 Uniforme:</strong> ${currentEvent.uniform || '-'}</div>
            <div><strong>📋 Set List:</strong> ${currentEvent.setlist_name || 'No asignado'}</div>
            <div><strong>💰 Pago:</strong> $${currentEvent.payment || 0}</div>
            ${currentEvent.notes ? `<div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--radius-sm);"><strong>📝 Notas:</strong><br>${currentEvent.notes}</div>` : ''}
        </div>
        
        <div style="margin-top: var(--space-xl); display: flex; gap: var(--space-sm);" class="admin-only">
            <button class="btn btn-secondary btn-sm" onclick="editEvent()">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent(${currentEvent.id})">🗑️ Eliminar</button>
        </div>
    `;
    
    openModal('viewEventModal');
}

// ===== CRUD =====
function openEventModal(event = null) {
    document.getElementById('eventModalTitle').textContent = event ? 'Editar Evento' : 'Nuevo Evento';
    document.getElementById('eventId').value = event?.id || '';
    document.getElementById('eventName').value = event?.name || '';
    document.getElementById('eventDate').value = getDateValue(event?.event_date) || '';
    document.getElementById('eventStatus').value = event?.status || 'confirmed';
    document.getElementById('eventVenue').value = event?.venue || '';
    document.getElementById('eventCity').value = event?.city || '';
    document.getElementById('eventAddress').value = event?.address || '';
    document.getElementById('eventStartTime').value = event?.start_time || '';
    document.getElementById('eventEndTime').value = event?.end_time || '';
    document.getElementById('eventMapsUrl').value = event?.google_maps_url || '';
    document.getElementById('eventSetlist').value = event?.setlist_id || '';
    document.getElementById('eventUniform').value = event?.uniform || '';
    document.getElementById('eventPayment').value = event?.payment || '';
    document.getElementById('eventPaymentStatus').value = event?.payment_status || 'pending';
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
        name: document.getElementById('eventName').value.trim(),
        event_date: document.getElementById('eventDate').value,
        status: document.getElementById('eventStatus').value,
        venue: document.getElementById('eventVenue').value.trim(),
        city: document.getElementById('eventCity').value.trim(),
        address: document.getElementById('eventAddress').value.trim(),
        start_time: document.getElementById('eventStartTime').value || null,
        end_time: document.getElementById('eventEndTime').value || null,
        google_maps_url: document.getElementById('eventMapsUrl').value.trim(),
        setlist_id: document.getElementById('eventSetlist').value || null,
        uniform: document.getElementById('eventUniform').value.trim(),
        payment: document.getElementById('eventPayment').value || null,
        payment_status: document.getElementById('eventPaymentStatus').value,
        notes: document.getElementById('eventNotes').value.trim()
    };
    
    if (!data.name || !data.event_date) {
        showToast('Nombre y fecha son requeridos');
        return;
    }
    
    try {
        if (id) {
            await apiPut(`/events/${id}`, data);
            showToast('Evento actualizado');
        } else {
            await apiPost('/events', data);
            showToast('Evento creado');
        }
        closeModal('eventModal');
        loadEvents();
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteEvent(id) {
    if (!confirm('¿Eliminar este evento?')) return;
    
    try {
        await apiDelete(`/events/${id}`);
        closeModal('viewEventModal');
        showToast('Evento eliminado');
        loadEvents();
    } catch (e) {
        showToast('Error al eliminar');
    }
}

loadEvents();
