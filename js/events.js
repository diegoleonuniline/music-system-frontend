checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

let allEvents = [];
let allSetlists = [];

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

        const setlistSelect = document.getElementById('eventSetlist');
        setlistSelect.innerHTML = '<option value="">Sin set list</option>';
        allSetlists.forEach(s => {
            setlistSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });

        renderEvents();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderEvents() {
    const viewMode = document.getElementById('viewMode').value;
    const statusFilter = document.getElementById('filterStatus').value;

    let filtered = allEvents;
    if (statusFilter) {
        filtered = allEvents.filter(e => e.status === statusFilter);
    }

    const container = document.getElementById('eventsContainer');

    if (viewMode === 'list') {
        renderListView(filtered, container);
    } else if (viewMode === 'month') {
        renderMonthView(filtered, container);
    } else if (viewMode === 'week') {
        renderWeekView(filtered, container);
    }
}

function renderListView(events, container) {
    const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

    if (!events.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📅</div>
                <h3>Sin eventos</h3>
                <p>No hay eventos este mes</p>
            </div>
        `;
        return;
    }

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
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(e => `
                        <tr style="${e.status === 'cancelled' ? 'opacity: 0.5;' : ''}">
                            <td><strong>${formatDate(e.event_date)}</strong></td>
                            <td>${e.name}</td>
                            <td>${e.venue || '-'}<br><small style="color: var(--text-tertiary);">${e.city || ''}</small></td>
                            <td>${e.start_time || '-'} ${e.end_time ? '- ' + e.end_time : ''}</td>
                            <td>
                                <span class="badge ${e.status === 'confirmed' ? 'badge-success' : e.status === 'tentative' ? 'badge-warning' : 'badge-danger'}">
                                    ${e.status === 'confirmed' ? 'Confirmado' : e.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-ghost btn-sm" onclick="viewEvent(${e.id})">Ver</button>
                                ${isAdmin ? `
                                    <button class="btn btn-ghost btn-sm" onclick="editEvent(${e.id})">Editar</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderMonthView(events, container) {
    const month = document.getElementById('filterMonth').value;
    const [year, monthNum] = month.split('-');
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    let html = `<div class="calendar-header">${dayNames.map(d => `<div>${d}</div>`).join('')}</div><div class="calendar-grid">`;

    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day" style="opacity: 0.3;"></div>';
    }

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
                ${dayEvents.length > 2 ? `<small style="color: var(--text-tertiary);">+${dayEvents.length - 2} más</small>` : ''}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function renderWeekView(events, container) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const todayStr = today.toISOString().split('T')[0];

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    container.innerHTML = `
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
                                    <small>${e.start_time || ''}</small>
                                </div>
                            `).join('') : '<small style="color: var(--text-tertiary);">Sin eventos</small>'}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function viewEvent(id) {
    const event = allEvents.find(e => e.id === id);
    if (!event) return;

    document.getElementById('viewEventTitle').textContent = event.name;
    document.getElementById('viewEventContent').innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
            <span class="badge ${event.status === 'confirmed' ? 'badge-success' : event.status === 'tentative' ? 'badge-warning' : 'badge-danger'}">
                ${event.status === 'confirmed' ? 'Confirmado' : event.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
            </span>
            <span class="badge ${event.payment_status === 'paid' ? 'badge-success' : event.payment_status === 'partial' ? 'badge-warning' : 'badge-neutral'}">
                ${event.payment_status === 'paid' ? 'Pagado' : event.payment_status === 'partial' ? 'Pago parcial' : 'Pago pendiente'}
            </span>
        </div>
        
        <div style="display: grid; gap: 12px;">
            <div><strong>📅 Fecha:</strong> ${formatDate(event.event_date)}</div>
            <div><strong>🕐 Horario:</strong> ${event.start_time || '-'} ${event.end_time ? '- ' + event.end_time : ''}</div>
            <div><strong>📍 Lugar:</strong> ${event.venue || '-'}</div>
            <div><strong>🏙️ Ciudad:</strong> ${event.city || '-'}</div>
            ${event.address ? `<div><strong>📫 Dirección:</strong> ${event.address}</div>` : ''}
            ${event.google_maps_url ? `<div><a href="${event.google_maps_url}" target="_blank" class="btn btn-ghost btn-sm">🗺️ Ver en Google Maps</a></div>` : ''}
            <div><strong>👔 Uniforme:</strong> ${event.uniform || '-'}</div>
            <div><strong>📋 Set List:</strong> ${event.setlist_name || 'No asignado'}</div>
            <div><strong>💰 Pago:</strong> $${event.payment || 0}</div>
            ${event.notes ? `<div><strong>📝 Notas:</strong> ${event.notes}</div>` : ''}
        </div>
    `;
    document.getElementById('viewEventModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewEventModal').classList.remove('active');
}

function openModal(event = null) {
    document.getElementById('modalTitle').textContent = event ? 'Editar Evento' : 'Nuevo Evento';
    document.getElementById('eventId').value = event?.id || '';
    document.getElementById('eventName').value = event?.name || '';
    document.getElementById('eventDate').value = getDateValue(event?.event_date) || '';
    document.getElementById('eventCity').value = event?.city || '';
    document.getElementById('eventVenue').value = event?.venue || '';
    document.getElementById('eventAddress').value = event?.address || '';
    document.getElementById('eventStartTime').value = event?.start_time || '';
    document.getElementById('eventEndTime').value = event?.end_time || '';
    document.getElementById('eventMapsUrl').value = event?.google_maps_url || '';
    document.getElementById('eventUniform').value = event?.uniform || '';
    document.getElementById('eventSetlist').value = event?.setlist_id || '';
    document.getElementById('eventPayment').value = event?.payment || '';
    document.getElementById('eventPaymentStatus').value = event?.payment_status || 'pending';
    document.getElementById('eventStatus').value = event?.status || 'confirmed';
    document.getElementById('eventNotes').value = event?.notes || '';
    document.getElementById('eventModal').classList.add('active');
}

function closeModal() {
    document.getElementById('eventModal').classList.remove('active');
}

function editEvent(id) {
    const event = allEvents.find(e => e.id === id);
    openModal(event);
}

async function saveEvent() {
    const id = document.getElementById('eventId').value;
    const data = {
        name: document.getElementById('eventName').value,
        event_date: document.getElementById('eventDate').value,
        city: document.getElementById('eventCity').value,
        venue: document.getElementById('eventVenue').value,
        address: document.getElementById('eventAddress').value,
        start_time: document.getElementById('eventStartTime').value || null,
        end_time: document.getElementById('eventEndTime').value || null,
        google_maps_url: document.getElementById('eventMapsUrl').value,
        uniform: document.getElementById('eventUniform').value,
        setlist_id: document.getElementById('eventSetlist').value || null,
        payment: document.getElementById('eventPayment').value || null,
        payment_status: document.getElementById('eventPaymentStatus').value,
        status: document.getElementById('eventStatus').value,
        notes: document.getElementById('eventNotes').value
    };

    if (id) {
        await apiPut(`/events/${id}`, data);
    } else {
        await apiPost('/events', data);
    }

    closeModal();
    loadEvents();
}

async function deleteEvent(id) {
    if (confirm('¿Eliminar este evento?')) {
        await apiDelete(`/events/${id}`);
        loadEvents();
    }
}

loadEvents();
