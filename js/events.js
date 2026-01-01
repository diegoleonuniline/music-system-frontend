checkAuth();
const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';
if (!isAdmin) document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

let allEvents = [], allSetlists = [], currentEvent = null;

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
        allSetlists.forEach(s => setlistSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`);

        renderEvents();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderEvents() {
    const sorted = [...allEvents].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    // Lista para móvil
    const listContainer = document.getElementById('eventsList');
    if (!sorted.length) {
        listContainer.innerHTML = `<div class="empty-state"><div class="icon">📅</div><h3>Sin eventos este mes</h3></div>`;
    } else {
        listContainer.innerHTML = sorted.map(e => {
            const date = new Date(e.event_date + 'T00:00:00');
            return `
                <div class="event-card" onclick="viewEvent(${e.id})" style="${e.status === 'cancelled' ? 'opacity:0.5' : ''}">
                    <div class="event-date">
                        <div class="day">${date.getDate()}</div>
                        <div class="month">${getMonthName(date.getMonth())}</div>
                    </div>
                    <div class="event-info">
                        <h4>${e.name}</h4>
                        <p>${e.venue || 'Sin lugar'} ${e.start_time ? '· ' + e.start_time : ''}</p>
                    </div>
                    <span class="badge ${e.status === 'confirmed' ? 'badge-success' : e.status === 'tentative' ? 'badge-warning' : 'badge-danger'}">
                        ${e.status === 'confirmed' ? '✓' : e.status === 'tentative' ? '?' : '✗'}
                    </span>
                </div>
            `;
        }).join('');
    }

    // Calendario para desktop
    renderCalendar();
}

function renderCalendar() {
    const month = document.getElementById('filterMonth').value;
    const [year, monthNum] = month.split('-');
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    document.getElementById('calendarHeader').innerHTML = dayNames.map(d => `<div>${d}</div>`).join('');

    let gridHtml = '';
    for (let i = 0; i < startDay; i++) {
        gridHtml += '<div class="calendar-day" style="opacity:0.3"></div>';
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
        const dayEvents = allEvents.filter(e => getDateValue(e.event_date) === dateStr);
        const isToday = dateStr === todayStr;

        gridHtml += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="day-number">${day}</div>
                ${dayEvents.slice(0, 2).map(e => `
                    <div class="calendar-event ${e.status}" onclick="viewEvent(${e.id})">${e.name}</div>
                `).join('')}
                ${dayEvents.length > 2 ? `<small style="color:var(--text-muted);font-size:10px">+${dayEvents.length - 2} más</small>` : ''}
            </div>
        `;
    }

    document.getElementById('calendarGrid').innerHTML = gridHtml;
}

function viewEvent(id) {
    currentEvent = allEvents.find(e => e.id === id);
    if (!currentEvent) return;

    document.getElementById('viewTitle').textContent = currentEvent.name;
    document.getElementById('viewContent').innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
            <span class="badge ${currentEvent.status === 'confirmed' ? 'badge-success' : currentEvent.status === 'tentative' ? 'badge-warning' : 'badge-danger'}">
                ${currentEvent.status === 'confirmed' ? 'Confirmado' : currentEvent.status === 'tentative' ? 'Tentativo' : 'Cancelado'}
            </span>
            <span class="badge ${currentEvent.payment_status === 'paid' ? 'badge-success' : currentEvent.payment_status === 'partial' ? 'badge-warning' : 'badge-neutral'}">
                ${currentEvent.payment_status === 'paid' ? 'Pagado' : currentEvent.payment_status === 'partial' ? 'Pago parcial' : 'Pago pendiente'}
            </span>
        </div>
        <div style="display:grid;gap:14px;font-size:14px">
            <div><strong style="color:var(--text-muted)">📅 Fecha:</strong> ${formatDate(currentEvent.event_date)}</div>
            <div><strong style="color:var(--text-muted)">🕐 Horario:</strong> ${currentEvent.start_time || '-'} ${currentEvent.end_time ? '- ' + currentEvent.end_time : ''}</div>
            <div><strong style="color:var(--text-muted)">📍 Lugar:</strong> ${currentEvent.venue || '-'}</div>
            <div><strong style="color:var(--text-muted)">🏙️ Ciudad:</strong> ${currentEvent.city || '-'}</div>
            ${currentEvent.address ? `<div><strong style="color:var(--text-muted)">📫 Dirección:</strong> ${currentEvent.address}</div>` : ''}
            ${currentEvent.google_maps_url ? `<div><a href="${currentEvent.google_maps_url}" target="_blank" class="btn btn-outline btn-sm">🗺️ Ver en Maps</a></div>` : ''}
            <div><strong style="color:var(--text-muted)">👔 Uniforme:</strong> ${currentEvent.uniform || '-'}</div>
            <div><strong style="color:var(--text-muted)">📋 Set List:</strong> ${currentEvent.setlist_name || 'No asignado'}</div>
            <div><strong style="color:var(--text-muted)">💰 Pago:</strong> $${currentEvent.payment || 0}</div>
            ${currentEvent.notes ? `<div><strong style="color:var(--text-muted)">📝 Notas:</strong> ${currentEvent.notes}</div>` : ''}
        </div>
    `;
    document.getElementById('viewModal').classList.add('active');
}

function closeViewModal() { document.getElementById('viewModal').classList.remove('active'); }
function editFromView() { closeViewModal(); editEvent(currentEvent.id); }

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

function closeModal() { document.getElementById('eventModal').classList.remove('active'); }
function editEvent(id) { openModal(allEvents.find(e => e.id === id)); }

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
    if (id) await apiPut(`/events/${id}`, data);
    else await apiPost('/events', data);
    closeModal();
    loadEvents();
}

loadEvents();
