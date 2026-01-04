checkAuth();
setupUserInfo();

const user = getUser();
let musicians = [];
let categories = [];
let genres = [];
let artists = [];
let projects = [];
let groups = [];
let plans = [];
let allUsers = [];

// Profile info
document.getElementById('profileName').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
document.getElementById('profileRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Administrador' : 'Músico';
document.getElementById('profileEmail').textContent = user.email || '';
document.getElementById('profileAvatar').textContent = (user.first_name || 'U').charAt(0).toUpperCase();

// Theme button
function updateThemeBtn() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.getElementById('themeBtn').textContent = isDark ? '☀️ Claro' : '🌙 Oscuro';
}
updateThemeBtn();

// OneSignal Init
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "9c406d11-293e-4344-bbbc-5f7ae8c997be",
        allowLocalhostAsSecureOrigin: true
    });
    updateNotifButton();
});

async function updateNotifButton() {
    const btn = document.getElementById('notifBtn');
    if (!btn) return;
    try {
        if (typeof OneSignal !== 'undefined' && OneSignal.Notifications) {
            const permission = await OneSignal.Notifications.permission;
            btn.textContent = permission ? '✓ Activadas' : 'Activar';
            btn.disabled = false;
        }
    } catch (e) {
        console.log('OneSignal check error:', e);
    }
}

async function requestNotificationPermission() {
    const btn = document.getElementById('notifBtn');
    btn.textContent = 'Activando...';
    btn.disabled = true;
    try {
        if (typeof OneSignal === 'undefined') {
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const check = setInterval(() => {
                    attempts++;
                    if (typeof OneSignal !== 'undefined') { clearInterval(check); resolve(); }
                    else if (attempts > 50) { clearInterval(check); reject(new Error('OneSignal no cargó')); }
                }, 100);
            });
        }
        await OneSignal.Notifications.requestPermission();
        const permission = await OneSignal.Notifications.permission;
        if (permission) {
            const user = getUser();
            if (user.id) {
                await OneSignal.login(user.id.toString());
                await OneSignal.User.addTags({
                    user_id: user.id.toString(),
                    group_id: user.group_id?.toString() || '',
                    role: user.role || 'musician'
                });
            }
            btn.textContent = '✓ Activadas';
            showToast('Notificaciones activadas');
        } else {
            btn.textContent = 'Denegado';
            showToast('Permiso de notificaciones denegado', 'warning');
        }
    } catch (e) {
        console.error('Notif error:', e);
        btn.textContent = 'Error';
        showToast('Error al activar notificaciones: ' + e.message, 'error');
    }
    btn.disabled = false;
}

// Collapsible sections
function toggleSection(section) {
    const card = document.getElementById(`${section}Section`);
    card.classList.toggle('expanded');
}

// Show admin sections
if (isAdmin()) {
    document.getElementById('musiciansSection').style.display = 'block';
    document.getElementById('categoriesSection').style.display = 'block';
    document.getElementById('genresSection').style.display = 'block';
    document.getElementById('artistsSection').style.display = 'block';
    document.getElementById('projectsSection').style.display = 'block';
    loadData();
}

// Show super admin sections
if (isSuperAdmin()) {
    document.getElementById('groupsSection').style.display = 'block';
    document.getElementById('plansSection').style.display = 'block';
    loadSuperAdminData();
}

async function loadData() {
    try {
        [musicians, categories, genres, artists, projects] = await Promise.all([
            apiGet('/users'),
            apiGet('/categories'),
            apiGet('/genres'),
            apiGet('/artists'),
            apiGet('/projects')
        ]);
        
        musicians = Array.isArray(musicians) ? musicians : [];
        categories = Array.isArray(categories) ? categories : [];
        genres = Array.isArray(genres) ? genres : [];
        artists = Array.isArray(artists) ? artists : [];
        projects = Array.isArray(projects) ? projects : [];
        
        renderMusicians();
        renderCategories();
        renderGenres();
        renderArtists();
        renderProjects();
        
        document.getElementById('musiciansCount').textContent = musicians.length;
        document.getElementById('categoriesCount').textContent = categories.length;
        document.getElementById('genresCount').textContent = genres.length;
        document.getElementById('artistsCount').textContent = artists.length;
        document.getElementById('projectsCount').textContent = projects.length;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadSuperAdminData() {
    try {
        [groups, plans, allUsers] = await Promise.all([
            apiGet('/groups'),
            apiGet('/plans'),
            apiGet('/users')
        ]);
        groups = Array.isArray(groups) ? groups : [];
        plans = Array.isArray(plans) ? plans : [];
        allUsers = Array.isArray(allUsers) ? allUsers : [];
        renderGroups();
        renderPlans();
        populateGroupSelects();
        document.getElementById('groupsCount').textContent = groups.length;
        document.getElementById('plansCount').textContent = plans.length;
    } catch (error) {
        console.error('Error super admin:', error);
    }
}

// ========== MÚSICOS ==========
function renderMusicians() {
    const container = document.getElementById('musiciansList');
    const search = document.getElementById('searchMusicians')?.value?.toLowerCase() || '';
    const filtered = musicians.filter(m => 
        (m.first_name || '').toLowerCase().includes(search) ||
        (m.last_name || '').toLowerCase().includes(search) ||
        (m.email || '').toLowerCase().includes(search)
    );
    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin músicos</p></div>';
        return;
    }
    container.innerHTML = filtered.map(m => `
        <div class="song-item">
            <div class="user-avatar" style="width: 36px; height: 36px; font-size: 14px;">${(m.first_name || 'U').charAt(0).toUpperCase()}</div>
            <div class="song-info"><h4>${m.first_name || ''} ${m.last_name || ''}</h4><p>${m.email}</p></div>
            <span class="badge ${m.role === 'group_admin' ? 'badge-warning' : m.role === 'super_admin' ? 'badge-danger' : 'badge-primary'}">${m.role === 'super_admin' ? 'Super' : m.role === 'group_admin' ? 'Admin' : 'Músico'}</span>
            <div class="song-actions"><button class="btn btn-ghost btn-sm" onclick="editMusician(${m.id})">✏️</button></div>
        </div>
    `).join('');
}

function filterMusicians() { renderMusicians(); }

function openMusicianModal(musician = null) {
    document.getElementById('musicianModalTitle').textContent = musician ? 'Editar Músico' : 'Nuevo Músico';
    document.getElementById('musicianId').value = musician?.id || '';
    document.getElementById('musicianFirstName').value = musician?.first_name || '';
    document.getElementById('musicianLastName').value = musician?.last_name || '';
    document.getElementById('musicianEmail').value = musician?.email || '';
    document.getElementById('musicianPassword').value = '';
    document.getElementById('musicianPhone').value = musician?.phone || '';
    document.getElementById('musicianRole').value = musician?.role || 'musician';
    document.getElementById('passwordGroup').style.display = musician ? 'none' : 'block';
    document.getElementById('musicianModal').classList.add('active');
}

function closeMusicianModal() { document.getElementById('musicianModal').classList.remove('active'); }
function editMusician(id) { openMusicianModal(musicians.find(m => m.id === id)); }

async function saveMusician() {
    const id = document.getElementById('musicianId').value;
    const data = {
        first_name: document.getElementById('musicianFirstName').value,
        last_name: document.getElementById('musicianLastName').value,
        email: document.getElementById('musicianEmail').value,
        phone: document.getElementById('musicianPhone').value,
        role: document.getElementById('musicianRole').value
    };
    if (!id) data.password = document.getElementById('musicianPassword').value;
    try {
        if (id) await apiPut(`/users/${id}`, data); else await apiPost('/users', data);
        closeMusicianModal();
        loadData();
        if (isSuperAdmin()) loadSuperAdminData();
        showToast('Músico guardado');
    } catch (e) { showToast('Error al guardar', 'error'); }
}

// ========== CATEGORÍAS ==========
function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!categories?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin categorías</p></div>';
        return;
    }
    container.innerHTML = categories.map(c => `
        <div class="song-item">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${c.color || '#4F46E5'};"></div>
            <div class="song-info"><h4>${c.name}</h4></div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editCategory(${c.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteCategory(${c.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openCategoryModal(category = null) {
    document.getElementById('categoryModalTitle').textContent = category ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('categoryId').value = category?.id || '';
    document.getElementById('categoryName').value = category?.name || '';
    document.getElementById('categoryColor').value = category?.color || '#4F46E5';
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() { document.getElementById('categoryModal').classList.remove('active'); }
function editCategory(id) { openCategoryModal(categories.find(c => c.id === id)); }

async function saveCategory() {
    const id = document.getElementById('categoryId').value;
    const data = { name: document.getElementById('categoryName').value, color: document.getElementById('categoryColor').value };
    if (id) await apiPut(`/categories/${id}`, data); else await apiPost('/categories', data);
    closeCategoryModal();
    loadData();
    showToast('Categoría guardada');
}

async function deleteCategory(id) {
    if (confirm('¿Eliminar esta categoría?')) {
        await apiDelete(`/categories/${id}`);
        loadData();
        showToast('Categoría eliminada');
    }
}

// ========== GÉNEROS ==========
function renderGenres() {
    const container = document.getElementById('genresList');
    if (!genres?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin géneros</p></div>';
        return;
    }
    container.innerHTML = genres.map(g => `
        <div class="song-item">
            <div class="song-thumb">🎸</div>
            <div class="song-info"><h4>${g.name}</h4></div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editGenre(${g.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteGenre(${g.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openGenreModal(genre = null) {
    document.getElementById('genreModalTitle').textContent = genre ? 'Editar Género' : 'Nuevo Género';
    document.getElementById('genreId').value = genre?.id || '';
    document.getElementById('genreName').value = genre?.name || '';
    document.getElementById('genreModal').classList.add('active');
}

function closeGenreModal() { document.getElementById('genreModal').classList.remove('active'); }
function editGenre(id) { openGenreModal(genres.find(g => g.id === id)); }

async function saveGenre() {
    const id = document.getElementById('genreId').value;
    const data = { name: document.getElementById('genreName').value };
    if (id) await apiPut(`/genres/${id}`, data); else await apiPost('/genres', data);
    closeGenreModal();
    loadData();
    showToast('Género guardado');
}

async function deleteGenre(id) {
    if (confirm('¿Eliminar este género?')) {
        await apiDelete(`/genres/${id}`);
        loadData();
        showToast('Género eliminado');
    }
}

// ========== ARTISTAS ==========
function renderArtists() {
    const container = document.getElementById('artistsList');
    const search = document.getElementById('searchArtists')?.value?.toLowerCase() || '';
    const filtered = artists.filter(a => (a.name || '').toLowerCase().includes(search));
    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin artistas</p></div>';
        return;
    }
    container.innerHTML = filtered.map(a => `
        <div class="song-item">
            <div class="song-thumb">🎤</div>
            <div class="song-info"><h4>${a.name}</h4></div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editArtist(${a.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteArtist(${a.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function filterArtists() { renderArtists(); }

function openArtistModal(artist = null) {
    document.getElementById('artistModalTitle').textContent = artist ? 'Editar Artista' : 'Nuevo Artista';
    document.getElementById('artistId').value = artist?.id || '';
    document.getElementById('artistName').value = artist?.name || '';
    document.getElementById('artistImage').value = artist?.image_url || '';
    document.getElementById('artistModal').classList.add('active');
}

function closeArtistModal() { document.getElementById('artistModal').classList.remove('active'); }
function editArtist(id) { openArtistModal(artists.find(a => a.id === id)); }

async function saveArtist() {
    const id = document.getElementById('artistId').value;
    const data = { 
        name: document.getElementById('artistName').value.trim(),
        image_url: document.getElementById('artistImage').value.trim() || null
    };
    if (!data.name) { showToast('Ingresa el nombre del artista', 'warning'); return; }
    try {
        if (id) await apiPut(`/artists/${id}`, data); else await apiPost('/artists', data);
        closeArtistModal();
        loadData();
        showToast('Artista guardado');
    } catch (e) { showToast('Error al guardar', 'error'); }
}

async function deleteArtist(id) {
    if (confirm('¿Eliminar este artista?')) {
        try {
            await apiDelete(`/artists/${id}`);
            loadData();
            showToast('Artista eliminado');
        } catch (e) { showToast('Error al eliminar', 'error'); }
    }
}

// ========== PROYECTOS ==========
function renderProjects() {
    const container = document.getElementById('projectsList');
    if (!projects?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin proyectos</p></div>';
        return;
    }
    container.innerHTML = projects.map(p => `
        <div class="song-item">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${p.color || '#4F46E5'};"></div>
            <div class="song-info"><h4>${p.name}</h4><p>${p.description || ''}</p></div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editProject(${p.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteProject(${p.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openProjectModal(project = null) {
    document.getElementById('projectModalTitle').textContent = project ? 'Editar Proyecto' : 'Nuevo Proyecto';
    document.getElementById('projectId').value = project?.id || '';
    document.getElementById('projectName').value = project?.name || '';
    document.getElementById('projectDescription').value = project?.description || '';
    document.getElementById('projectColor').value = project?.color || '#4F46E5';
    document.getElementById('projectModal').classList.add('active');
}

function closeProjectModal() { document.getElementById('projectModal').classList.remove('active'); }
function editProject(id) { openProjectModal(projects.find(p => p.id === id)); }

async function saveProject() {
    const id = document.getElementById('projectId').value;
    const data = { 
        name: document.getElementById('projectName').value.trim(),
        description: document.getElementById('projectDescription').value.trim() || null,
        color: document.getElementById('projectColor').value
    };
    if (!data.name) { showToast('Ingresa el nombre del proyecto', 'warning'); return; }
    try {
        if (id) await apiPut(`/projects/${id}`, data); else await apiPost('/projects', data);
        closeProjectModal();
        loadData();
        showToast('Proyecto guardado');
    } catch (e) { showToast('Error al guardar', 'error'); }
}

async function deleteProject(id) {
    if (confirm('¿Eliminar este proyecto?')) {
        try {
            await apiDelete(`/projects/${id}`);
            loadData();
            showToast('Proyecto eliminado');
        } catch (e) { showToast('Error al eliminar', 'error'); }
    }
}

// ========== SUPER ADMIN: GRUPOS ==========
function populateGroupSelects() {
    const planSelect = document.getElementById('groupPlan');
    planSelect.innerHTML = '<option value="">Sin plan</option>' + plans.map(p => `<option value="${p.id}">${p.name} - $${p.price || 0}</option>`).join('');
    const adminSelect = document.getElementById('groupAdmin');
    adminSelect.innerHTML = '<option value="">Seleccionar administrador...</option>' + allUsers.map(u => `<option value="${u.id}">${u.first_name || ''} ${u.last_name || ''} (${u.email})</option>`).join('');
}

function renderGroups() {
    const container = document.getElementById('groupsList');
    const search = document.getElementById('searchGroups')?.value?.toLowerCase() || '';
    const filtered = groups.filter(g => (g.name || '').toLowerCase().includes(search));
    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin grupos musicales</p></div>';
        return;
    }
    container.innerHTML = filtered.map(g => {
        const adminName = g.admin_first_name ? `${g.admin_first_name} ${g.admin_last_name || ''}` : 'Sin admin';
        return `
        <div class="song-item">
            <div class="song-thumb">🏢</div>
            <div class="song-info"><h4>${g.name}</h4><p>${g.plan_name || 'Sin plan'} · Admin: ${adminName} · ${g.current_musicians || 0} músicos</p></div>
            <span class="badge ${g.is_active ? 'badge-success' : 'badge-danger'}">${g.is_active ? 'Activo' : 'Inactivo'}</span>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editGroup(${g.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteGroup(${g.id})">🗑️</button>
            </div>
        </div>
    `}).join('');
}

function filterGroups() { renderGroups(); }

function toggleNewAdminSection() {
    const section = document.getElementById('newAdminSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    if (section.style.display === 'block') document.getElementById('groupAdmin').value = '';
}

function openGroupModal(group = null) {
    document.getElementById('groupModalTitle').textContent = group ? 'Editar Grupo' : 'Nuevo Grupo Musical';
    document.getElementById('groupId').value = group?.id || '';
    document.getElementById('groupName').value = group?.name || '';
    document.getElementById('groupPlan').value = group?.plan_id || '';
    document.getElementById('groupStartDate').value = group?.plan_start_date?.split('T')[0] || '';
    document.getElementById('groupEndDate').value = group?.plan_end_date?.split('T')[0] || '';
    document.getElementById('groupAdmin').value = group?.admin_user_id || '';
    document.getElementById('groupActive').checked = group?.is_active !== false;
    document.getElementById('newAdminSection').style.display = 'none';
    document.getElementById('newAdminFirstName').value = '';
    document.getElementById('newAdminLastName').value = '';
    document.getElementById('newAdminEmail').value = '';
    document.getElementById('newAdminPassword').value = '';
    document.getElementById('groupModal').classList.add('active');
}

function closeGroupModal() { document.getElementById('groupModal').classList.remove('active'); }
function editGroup(id) { openGroupModal(groups.find(g => g.id === id)); }

async function saveGroup() {
    const id = document.getElementById('groupId').value;
    let adminUserId = document.getElementById('groupAdmin').value || null;
    const newAdminSection = document.getElementById('newAdminSection');
    if (newAdminSection.style.display === 'block') {
        const newAdminEmail = document.getElementById('newAdminEmail').value.trim();
        const newAdminPassword = document.getElementById('newAdminPassword').value;
        const newAdminFirstName = document.getElementById('newAdminFirstName').value.trim();
        if (newAdminEmail && newAdminPassword && newAdminFirstName) {
            try {
                const newUser = await apiPost('/users', {
                    first_name: newAdminFirstName,
                    last_name: document.getElementById('newAdminLastName').value.trim(),
                    email: newAdminEmail,
                    password: newAdminPassword,
                    role: 'group_admin'
                });
                if (newUser?.id) adminUserId = newUser.id;
            } catch (e) { showToast('Error al crear administrador', 'error'); return; }
        }
    }
    const data = {
        name: document.getElementById('groupName').value.trim(),
        plan_id: document.getElementById('groupPlan').value || null,
        plan_start_date: document.getElementById('groupStartDate').value || null,
        plan_end_date: document.getElementById('groupEndDate').value || null,
        admin_user_id: adminUserId,
        is_active: document.getElementById('groupActive').checked ? 1 : 0
    };
    if (!data.name) { showToast('Ingresa el nombre del grupo'); return; }
    try {
        if (id) await apiPut(`/groups/${id}`, data); else await apiPost('/groups', data);
        closeGroupModal();
        loadSuperAdminData();
        showToast('Grupo guardado');
    } catch (e) { showToast('Error al guardar grupo', 'error'); }
}

async function deleteGroup(id) {
    if (confirm('¿Eliminar este grupo musical?')) {
        try {
            await apiDelete(`/groups/${id}`);
            loadSuperAdminData();
            showToast('Grupo eliminado');
        } catch (e) { showToast('Error al eliminar', 'error'); }
    }
}

// ========== SUPER ADMIN: PLANES ==========
function renderPlans() {
    const container = document.getElementById('plansList');
    if (!plans?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin planes</p></div>';
        return;
    }
    container.innerHTML = plans.map(p => `
        <div class="song-item">
            <div class="song-thumb">💳</div>
            <div class="song-info"><h4>${p.name}</h4><p>$${p.price || 0} · ${p.max_musicians || '∞'} músicos · ${p.max_songs || '∞'} canciones</p></div>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editPlan(${p.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deletePlan(${p.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openPlanModal(plan = null) {
    document.getElementById('planModalTitle').textContent = plan ? 'Editar Plan' : 'Nuevo Plan';
    document.getElementById('planId').value = plan?.id || '';
    document.getElementById('planName').value = plan?.name || '';
    document.getElementById('planPrice').value = plan?.price || '';
    document.getElementById('planMaxMusicians').value = plan?.max_musicians || '';
    document.getElementById('planMaxSongs').value = plan?.max_songs || '';
    document.getElementById('planMaxEvents').value = plan?.max_events || '';
    document.getElementById('planDescription').value = plan?.description || '';
    document.getElementById('planModal').classList.add('active');
}

function closePlanModal() { document.getElementById('planModal').classList.remove('active'); }
function editPlan(id) { openPlanModal(plans.find(p => p.id === id)); }

async function savePlan() {
    const id = document.getElementById('planId').value;
    const data = {
        name: document.getElementById('planName').value.trim(),
        price: parseFloat(document.getElementById('planPrice').value) || 0,
        max_musicians: parseInt(document.getElementById('planMaxMusicians').value) || null,
        max_songs: parseInt(document.getElementById('planMaxSongs').value) || null,
        max_events: parseInt(document.getElementById('planMaxEvents').value) || null,
        description: document.getElementById('planDescription').value.trim()
    };
    if (!data.name) { showToast('Ingresa el nombre del plan'); return; }
    try {
        if (id) await apiPut(`/plans/${id}`, data); else await apiPost('/plans', data);
        closePlanModal();
        loadSuperAdminData();
        showToast('Plan guardado');
    } catch (e) { showToast('Error al guardar plan', 'error'); }
}

async function deletePlan(id) {
    if (confirm('¿Eliminar este plan?')) {
        try {
            await apiDelete(`/plans/${id}`);
            loadSuperAdminData();
            showToast('Plan eliminado');
        } catch (e) { showToast('Error al eliminar', 'error'); }
    }
}
