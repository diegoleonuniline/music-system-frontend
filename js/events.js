checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

let allEvents = [];
let allSetlists = [];

// Inicializar mes actual
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

        // Llenar select de setlists
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
        container.innerHTML = '<p>No hay eventos este mes</p>';
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
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(e => `
                        <tr style="${e.status === 'cancelled' ? 'opacity: 0.5;' : ''}">
                            <td><strong>${formatDate(e.event_date)}</strong></td>
                            <td>${e.name}</td>
                            <td>${e.venue || '-'}<br><small>${e.city || ''}</small></td>
                            <td>${e.start_time || '-'} - ${e.end_time || '-'}</td>
                            <td>
                                <span class="badge ${e.status === 'confirmed' ? 'badge-success' : e.status === 'tentative' ? 'badge-warning' : 'badge-danger'}">
                                    ${e.status === 'confirmed' ? 'Confirmado' : e.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm" onclick="viewEvent(${e.id})">👁️</button>
                                ${isAdmin ? `
                                    <button class="btn btn-sm" onclick="editEvent(${e.id})">✏️</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteEvent(${e.id})">🗑️</button>
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

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    let html = `
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
            ${dayNames.map(d => `<div style="text-align: center; font-weight: bold; padding: 10px; background: var(--light);">${d}</div>`).join('')}
    `;

    // Días vacíos al inicio
    for (let i = 0; i < startDay; i++) {
        html += '<div style="padding: 10px;"></div>';
    }

    // Días del mes
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.event_date.startsWith(dateStr));
        const isToday = dateStr === new Date().toISOString().split('T')[0];

        html += `
            <div style="min-height: 80px; padding: 8px; border: 1px solid var(--light); ${isToday ? 'background: rgba(99, 102, 241, 0.1);' : ''}">
                <div style="font-weight: bold; ${isToday ? 'color: var(--primary);' : ''}">${day}</div>
                ${dayEvents.map(e => `
                    <div onclick="viewEvent(${e.id})" style="cursor: pointer; font-size: 11px; padding: 2px 4px; margin-top: 4px; border-radius: 4px; background: ${e.status === 'confirmed' ? 'var(--secondary)' : e.status === 'tentative' ? 'var(--warning)' : 'var(--danger)'}; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${e.name}
                    </div>
                `).join('')}
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

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
            ${days.map((d, i) => {
                const dateStr = d.toISOString().split('T')[0];
                const dayEvents = events.filter(e => e.event_date.startsWith(dateStr));
                const isToday = dateStr === today.toISOString().split('T')[0];

                return `
                    <div style="border: 1px solid var(--light); border-radius: 8px; overflow: hidden; ${isToday ? 'border-color: var(--primary);' : ''}">
                        <div style="padding: 10px; background: ${isToday ? 'var(--primary)' : 'var(--light)'}; color: ${isToday ? '#fff' : 'var(--dark)'}; text-align: center;">
                            <div style="font-size: 12px;">${dayNames[i]}</div>
                            <div style="font-size: 20px; font-weight: bold;">${d.getDate()}</div>
                        </div>
                        <div style="padding: 8px; min-height: 100px;">
                            ${dayEvents.length ? dayEvents.map(e => `
                                <div onclick="viewEvent(${e.id})" style="cursor: pointer; padding: 8px; margin-bottom: 4px; background: rgba(99, 102, 241, 0.1); border-radius: 4px;">
                                    <div style="font-weight: bold; font-size: 12px;">${e.name}</div>
                                    <div style="font-size: 11px; color: var(--gray);">${e.start_time || ''}</div>
                                </div>
                            `).join('') : '<div style="color: var(--gray); font-size: 12px;">Sin eventos</div>'}
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
        <div style="margin-bottom: 16px;">
            <span class="badge ${event.status === 'confirmed' ? 'badge-success' : event.status === 'tentative' ? 'badge-warning' : 'badge-danger'}">
                ${event.status === 'confirmed' ? 'Confirmado' : event.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
            </span>
            <span class="badge ${event.payment_status === 'paid' ? 'badge-success' : event.payment_status === 'partial' ? 'badge-warning' : 'badge-danger'}">
                ${event.payment_status === 'paid' ? 'Pagado' : event.payment_status === 'partial' ? 'Pago parcial' : 'Pago pendiente'}
            </span>
        </div>
        <p><strong>📅 Fecha:</strong> ${formatDate(event.event_date)}</p>
        <p><strong>🕐 Horario:</strong> ${event.start_time || '-'} - ${event.end_time || '-'}</p>
        <p><strong>📍 Lugar:</strong> ${event.venue || '-'}</p>
        <p><strong>🏙️ Ciudad:</strong> ${event.city || '-'}</p>
        <p><strong>📫 Dirección:</strong> ${event.address || '-'}</p>
        ${event.google_maps_url ? `<p><a href="${event.google_maps_url}" target="_blank" class="btn btn-sm btn-primary">🗺️ Ver en Google Maps</a></p>` : ''}
        <p><strong>👔 Uniforme:</strong> ${event.uniform || '-'}</p>
        <p><strong>📋 Set List:</strong> ${event.setlist_name || 'No asignado'}</p>
        <p><strong>💰 Pago:</strong> $${event.payment || 0}</p>
        ${event.notes ? `<p><strong>📝 Notas:</strong> ${event.notes}</p>` : ''}
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
    document.getElementById('eventDate').value = event?.event_date?.split('T')[0] || '';
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
