checkAuth();
setupUserInfo();

const user = getUser();
let musicians = [];
let categories = [];
let genres = [];
let groups = [];
let plans = [];
let allUsers = []; // todos los usuarios para asignar como admin

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

// Show admin sections
if (isAdmin()) {
    document.getElementById('musiciansSection').style.display = 'block';
    document.getElementById('categoriesSection').style.display = 'block';
    document.getElementById('genresSection').style.display = 'block';
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
        [musicians, categories, genres] = await Promise.all([
            apiGet('/users'),
            apiGet('/categories'),
            apiGet('/genres')
        ]);
        
        renderMusicians();
        renderCategories();
        renderGenres();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadSuperAdminData() {
    try {
        [groups, plans, allUsers] = await Promise.all([
            apiGet('/groups'),
            apiGet('/plans'),
            apiGet('/users/all').catch(() => apiGet('/users'))
        ]);
        
        renderGroups();
        renderPlans();
        populateGroupSelects();
    } catch (error) {
        console.error('Error super admin:', error);
    }
}

// Musicians
function renderMusicians() {
    const container = document.getElementById('musiciansList');
    
    if (!musicians?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin músicos</p></div>';
        return;
    }
    
    container.innerHTML = musicians.map(m => `
        <div class="song-item">
            <div class="user-avatar" style="width: 36px; height: 36px; font-size: 14px;">
                ${(m.first_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="song-info">
                <h4>${m.first_name || ''} ${m.last_name || ''}</h4>
                <p>${m.email}</p>
            </div>
            <span class="badge ${m.role === 'group_admin' ? 'badge-warning' : 'badge-primary'}">
                ${m.role === 'super_admin' ? 'Super Admin' : m.role === 'group_admin' ? 'Admin' : 'Músico'}
            </span>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editMusician(${m.id})">✏️</button>
            </div>
        </div>
    `).join('');
}

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

function closeMusicianModal() {
    document.getElementById('musicianModal').classList.remove('active');
}

function editMusician(id) {
    const musician = musicians.find(m => m.id === id);
    openMusicianModal(musician);
}

async function saveMusician() {
    const id = document.getElementById('musicianId').value;
    const data = {
        first_name: document.getElementById('musicianFirstName').value,
        last_name: document.getElementById('musicianLastName').value,
        email: document.getElementById('musicianEmail').value,
        phone: document.getElementById('musicianPhone').value,
        role: document.getElementById('musicianRole').value
    };
    
    if (!id) {
        data.password = document.getElementById('musicianPassword').value;
    }
    
    if (id) {
        await apiPut(`/users/${id}`, data);
    } else {
        await apiPost('/users', data);
    }
    
    closeMusicianModal();
    loadData();
    showToast('Músico guardado');
}

// Categories
function renderCategories() {
    const container = document.getElementById('categoriesList');
    
    if (!categories?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin categorías</p></div>';
        return;
    }
    
    container.innerHTML = categories.map(c => `
        <div class="song-item">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${c.color || '#4F46E5'};"></div>
            <div class="song-info">
                <h4>${c.name}</h4>
            </div>
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

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

function editCategory(id) {
    const category = categories.find(c => c.id === id);
    openCategoryModal(category);
}

async function saveCategory() {
    const id = document.getElementById('categoryId').value;
    const data = {
        name: document.getElementById('categoryName').value,
        color: document.getElementById('categoryColor').value
    };
    
    if (id) {
        await apiPut(`/categories/${id}`, data);
    } else {
        await apiPost('/categories', data);
    }
    
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

// Genres
function renderGenres() {
    const container = document.getElementById('genresList');
    
    if (!genres?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin géneros</p></div>';
        return;
    }
    
    container.innerHTML = genres.map(g => `
        <div class="song-item">
            <div class="song-thumb">🎸</div>
            <div class="song-info">
                <h4>${g.name}</h4>
            </div>
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

function closeGenreModal() {
    document.getElementById('genreModal').classList.remove('active');
}

function editGenre(id) {
    const genre = genres.find(g => g.id === id);
    openGenreModal(genre);
}

async function saveGenre() {
    const id = document.getElementById('genreId').value;
    const data = {
        name: document.getElementById('genreName').value
    };
    
    if (id) {
        await apiPut(`/genres/${id}`, data);
    } else {
        await apiPost('/genres', data);
    }
    
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

// ========== SUPER ADMIN: GROUPS ==========
function populateGroupSelects() {
    // Plans dropdown
    const planSelect = document.getElementById('groupPlan');
    planSelect.innerHTML = '<option value="">Sin plan</option>' + 
        plans.map(p => `<option value="${p.id}">${p.name} - $${p.price || 0}</option>`).join('');
    
    // Admin dropdown
    const adminSelect = document.getElementById('groupAdmin');
    adminSelect.innerHTML = '<option value="">Seleccionar administrador...</option>' + 
        allUsers.map(u => `<option value="${u.id}">${u.first_name || ''} ${u.last_name || ''} (${u.email})</option>`).join('');
}

function renderGroups() {
    const container = document.getElementById('groupsList');
    
    if (!groups?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin grupos musicales</p></div>';
        return;
    }
    
    container.innerHTML = groups.map(g => {
        const plan = plans.find(p => p.id === g.plan_id);
        const admin = allUsers.find(u => u.id === g.admin_user_id);
        return `
        <div class="song-item">
            <div class="song-thumb">🏢</div>
            <div class="song-info">
                <h4>${g.name}</h4>
                <p>${plan ? plan.name : 'Sin plan'} · ${admin ? `Admin: ${admin.first_name}` : 'Sin admin'}</p>
            </div>
            <span class="badge ${g.is_active ? 'badge-success' : 'badge-danger'}">${g.is_active ? 'Activo' : 'Inactivo'}</span>
            <div class="song-actions">
                <button class="btn btn-ghost btn-sm" onclick="editGroup(${g.id})">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteGroup(${g.id})">🗑️</button>
            </div>
        </div>
    `}).join('');
}

function openGroupModal(group = null) {
    document.getElementById('groupModalTitle').textContent = group ? 'Editar Grupo' : 'Nuevo Grupo Musical';
    document.getElementById('groupId').value = group?.id || '';
    document.getElementById('groupName').value = group?.name || '';
    document.getElementById('groupPlan').value = group?.plan_id || '';
    document.getElementById('groupStartDate').value = group?.subscription_start?.split('T')[0] || '';
    document.getElementById('groupEndDate').value = group?.subscription_end?.split('T')[0] || '';
    document.getElementById('groupAdmin').value = group?.admin_user_id || '';
    document.getElementById('groupActive').checked = group?.is_active !== false;
    document.getElementById('groupModal').classList.add('active');
}

function closeGroupModal() {
    document.getElementById('groupModal').classList.remove('active');
}

function editGroup(id) {
    const group = groups.find(g => g.id === id);
    openGroupModal(group);
}

async function saveGroup() {
    const id = document.getElementById('groupId').value;
    const data = {
        name: document.getElementById('groupName').value.trim(),
        plan_id: document.getElementById('groupPlan').value || null,
        subscription_start: document.getElementById('groupStartDate').value || null,
        subscription_end: document.getElementById('groupEndDate').value || null,
        admin_user_id: document.getElementById('groupAdmin').value || null,
        is_active: document.getElementById('groupActive').checked
    };
    
    if (!data.name) {
        showToast('Ingresa el nombre del grupo');
        return;
    }
    
    try {
        if (id) {
            await apiPut(`/groups/${id}`, data);
        } else {
            await apiPost('/groups', data);
        }
        
        closeGroupModal();
        loadSuperAdminData();
        showToast('Grupo guardado');
    } catch (e) {
        showToast('Error al guardar grupo');
    }
}

async function deleteGroup(id) {
    if (confirm('¿Eliminar este grupo musical? Esta acción no se puede deshacer.')) {
        try {
            await apiDelete(`/groups/${id}`);
            loadSuperAdminData();
            showToast('Grupo eliminado');
        } catch (e) {
            showToast('Error al eliminar');
        }
    }
}

// ========== SUPER ADMIN: PLANS ==========
function renderPlans() {
    const container = document.getElementById('plansList');
    
    if (!plans?.length) {
        container.innerHTML = '<div class="empty-state"><p>Sin planes</p></div>';
        return;
    }
    
    container.innerHTML = plans.map(p => `
        <div class="song-item">
            <div class="song-thumb">💳</div>
            <div class="song-info">
                <h4>${p.name}</h4>
                <p>$${p.price || 0} · ${p.max_users || '∞'} usuarios · ${p.max_songs || '∞'} canciones</p>
            </div>
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
    document.getElementById('planMaxUsers').value = plan?.max_users || '';
    document.getElementById('planMaxSongs').value = plan?.max_songs || '';
    document.getElementById('planMaxEvents').value = plan?.max_events || '';
    document.getElementById('planDescription').value = plan?.description || '';
    document.getElementById('planModal').classList.add('active');
}

function closePlanModal() {
    document.getElementById('planModal').classList.remove('active');
}

function editPlan(id) {
    const plan = plans.find(p => p.id === id);
    openPlanModal(plan);
}

async function savePlan() {
    const id = document.getElementById('planId').value;
    const data = {
        name: document.getElementById('planName').value.trim(),
        price: parseFloat(document.getElementById('planPrice').value) || 0,
        max_users: parseInt(document.getElementById('planMaxUsers').value) || null,
        max_songs: parseInt(document.getElementById('planMaxSongs').value) || null,
        max_events: parseInt(document.getElementById('planMaxEvents').value) || null,
        description: document.getElementById('planDescription').value.trim()
    };
    
    if (!data.name) {
        showToast('Ingresa el nombre del plan');
        return;
    }
    
    try {
        if (id) {
            await apiPut(`/plans/${id}`, data);
        } else {
            await apiPost('/plans', data);
        }
        
        closePlanModal();
        loadSuperAdminData();
        showToast('Plan guardado');
    } catch (e) {
        showToast('Error al guardar plan');
    }
}

async function deletePlan(id) {
    if (confirm('¿Eliminar este plan?')) {
        try {
            await apiDelete(`/plans/${id}`);
            loadSuperAdminData();
            showToast('Plan eliminado');
        } catch (e) {
            showToast('Error al eliminar');
        }
    }
}
