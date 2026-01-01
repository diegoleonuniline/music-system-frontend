checkAuth();
setupUserInfo();

let allCategories = [];
let allGenres = [];
let allMusicians = [];
let allGroups = [];
let allPlans = [];

// Setup profile
const user = getUser();
document.getElementById('profileAvatar').textContent = (user.first_name || 'U').charAt(0).toUpperCase();
document.getElementById('profileName').textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario';
document.getElementById('profileRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Administrador' : 'Músico';
document.getElementById('profileEmail').textContent = user.email || '';

// Update theme button text
function updateThemeButton() {
    const theme = localStorage.getItem('theme') || 'light';
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}
updateThemeButton();

// Override toggleTheme to also update button
const originalToggle = window.toggleTheme;
window.toggleTheme = function() {
    originalToggle();
    updateThemeButton();
};

async function loadSettings() {
    try {
        if (isAdmin()) {
            [allCategories, allGenres, allMusicians] = await Promise.all([
                apiGet('/categories'),
                apiGet('/genres'),
                apiGet('/users').catch(() => [])
            ]);
            renderCategories();
            renderGenres();
            renderMusicians();
        }
        
        if (isSuperAdmin()) {
            [allGroups, allPlans] = await Promise.all([
                apiGet('/groups'),
                apiGet('/plans')
            ]);
            renderGroups();
            populatePlans();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== CATEGORIES =====
function renderCategories() {
    const container = document.getElementById('categoriesList');
    
    if (!allCategories?.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin categorías</p></div>';
        return;
    }
    
    container.innerHTML = allCategories.map(c => `
        <div class="list-item">
            <div style="width: 12px; height: 12px; border-radius: var(--radius-full); background: ${c.color || 'var(--accent)'}; flex-shrink: 0;"></div>
            <div class="list-item-content">
                <div class="list-item-title">${c.name}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="editCategory(${c.id})">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteCategory(${c.id})" style="color: var(--red);">🗑️</button>
        </div>
    `).join('');
}

function openCategoryModal(category = null) {
    document.getElementById('categoryModalTitle').textContent = category ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('categoryId').value = category?.id || '';
    document.getElementById('categoryName').value = category?.name || '';
    document.getElementById('categoryColor').value = category?.color || '#007aff';
    openModal('categoryModal');
}

function editCategory(id) {
    const cat = allCategories.find(c => c.id === id);
    openCategoryModal(cat);
}

async function saveCategory() {
    const id = document.getElementById('categoryId').value;
    const data = {
        name: document.getElementById('categoryName').value.trim(),
        color: document.getElementById('categoryColor').value
    };
    
    if (!data.name) { showToast('Ingresa el nombre'); return; }
    
    try {
        if (id) {
            await apiPut(`/categories/${id}`, data);
        } else {
            await apiPost('/categories', data);
        }
        closeModal('categoryModal');
        showToast('Categoría guardada');
        allCategories = await apiGet('/categories');
        renderCategories();
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteCategory(id) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
        await apiDelete(`/categories/${id}`);
        showToast('Categoría eliminada');
        allCategories = await apiGet('/categories');
        renderCategories();
    } catch (e) {
        showToast('Error al eliminar');
    }
}

// ===== GENRES =====
function renderGenres() {
    const container = document.getElementById('genresList');
    
    if (!allGenres?.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin géneros</p></div>';
        return;
    }
    
    container.innerHTML = allGenres.map(g => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${g.name}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="editGenre(${g.id})">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteGenre(${g.id})" style="color: var(--red);">🗑️</button>
        </div>
    `).join('');
}

function openGenreModal(genre = null) {
    document.getElementById('genreModalTitle').textContent = genre ? 'Editar Género' : 'Nuevo Género';
    document.getElementById('genreId').value = genre?.id || '';
    document.getElementById('genreName').value = genre?.name || '';
    openModal('genreModal');
}

function editGenre(id) {
    const genre = allGenres.find(g => g.id === id);
    openGenreModal(genre);
}

async function saveGenre() {
    const id = document.getElementById('genreId').value;
    const data = { name: document.getElementById('genreName').value.trim() };
    
    if (!data.name) { showToast('Ingresa el nombre'); return; }
    
    try {
        if (id) {
            await apiPut(`/genres/${id}`, data);
        } else {
            await apiPost('/genres', data);
        }
        closeModal('genreModal');
        showToast('Género guardado');
        allGenres = await apiGet('/genres');
        renderGenres();
    } catch (e) {
        showToast('Error al guardar');
    }
}

async function deleteGenre(id) {
    if (!confirm('¿Eliminar este género?')) return;
    try {
        await apiDelete(`/genres/${id}`);
        showToast('Género eliminado');
        allGenres = await apiGet('/genres');
        renderGenres();
    } catch (e) {
        showToast('Error al eliminar');
    }
}

// ===== MUSICIANS =====
function renderMusicians() {
    const container = document.getElementById('musiciansList');
    
    if (!allMusicians?.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin músicos</p></div>';
        return;
    }
    
    container.innerHTML = allMusicians.map(m => `
        <div class="list-item">
            <div class="nav-profile-avatar" style="width: 36px; height: 36px; font-size: 14px; flex-shrink: 0;">${(m.first_name || 'U').charAt(0)}</div>
            <div class="list-item-content">
                <div class="list-item-title">${m.first_name || ''} ${m.last_name || ''}</div>
                <div class="list-item-subtitle">${m.email} · ${m.role === 'group_admin' ? 'Admin' : 'Músico'}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="editMusician(${m.id})">✏️</button>
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
    openModal('musicianModal');
}

function editMusician(id) {
    const musician = allMusicians.find(m => m.id === id);
    openMusicianModal(musician);
}

async function saveMusician() {
    const id = document.getElementById('musicianId').value;
    const data = {
        first_name: document.getElementById('musicianFirstName').value.trim(),
        last_name: document.getElementById('musicianLastName').value.trim(),
        email: document.getElementById('musicianEmail').value.trim(),
        phone: document.getElementById('musicianPhone').value.trim(),
        role: document.getElementById('musicianRole').value
    };
    
    if (!id) {
        data.password = document.getElementById('musicianPassword').value;
        if (!data.password || data.password.length < 6) {
            showToast('Contraseña debe tener mínimo 6 caracteres');
            return;
        }
    }
    
    if (!data.first_name || !data.email) {
        showToast('Nombre y email son requeridos');
        return;
    }
    
    try {
        if (id) {
            await apiPut(`/users/${id}`, data);
        } else {
            await apiPost('/users', data);
        }
        closeModal('musicianModal');
        showToast('Músico guardado');
        allMusicians = await apiGet('/users');
        renderMusicians();
    } catch (e) {
        showToast('Error al guardar');
    }
}

// ===== GROUPS (Super Admin) =====
function populatePlans() {
    const select = document.getElementById('groupPlan');
    select.innerHTML = '<option value="">Sin plan</option>' + 
        (allPlans || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function renderGroups() {
    const container = document.getElementById('groupsList');
    
    if (!allGroups?.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin grupos</p></div>';
        return;
    }
    
    container.innerHTML = allGroups.map(g => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${g.name}</div>
                <div class="list-item-subtitle">${g.plan_name || 'Sin plan'} · ${g.user_count || 0} usuarios</div>
            </div>
            <span class="badge ${g.is_active ? 'badge-green' : 'badge-red'}">${g.is_active ? 'Activo' : 'Inactivo'}</span>
            <button class="btn btn-ghost btn-sm" onclick="editGroup(${g.id})">✏️</button>
        </div>
    `).join('');
}

function openGroupModal(group = null) {
    document.getElementById('groupModalTitle').textContent = group ? 'Editar Grupo' : 'Nuevo Grupo';
    document.getElementById('groupId').value = group?.id || '';
    document.getElementById('groupName').value = group?.name || '';
    document.getElementById('groupPlan').value = group?.plan_id || '';
    document.getElementById('groupStartDate').value = getDateValue(group?.subscription_start) || '';
    document.getElementById('groupEndDate').value = getDateValue(group?.subscription_end) || '';
    openModal('groupModal');
}

function editGroup(id) {
    const group = allGroups.find(g => g.id === id);
    openGroupModal(group);
}

async function saveGroup() {
    const id = document.getElementById('groupId').value;
    const data = {
        name: document.getElementById('groupName').value.trim(),
        plan_id: document.getElementById('groupPlan').value || null,
        subscription_start: document.getElementById('groupStartDate').value || null,
        subscription_end: document.getElementById('groupEndDate').value || null
    };
    
    if (!data.name) { showToast('Ingresa el nombre'); return; }
    
    try {
        if (id) {
            await apiPut(`/groups/${id}`, data);
        } else {
            await apiPost('/groups', data);
        }
        closeModal('groupModal');
        showToast('Grupo guardado');
        allGroups = await apiGet('/groups');
        renderGroups();
    } catch (e) {
        showToast('Error al guardar');
    }
}

loadSettings();
