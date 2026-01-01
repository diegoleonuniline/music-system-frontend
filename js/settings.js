checkAuth();
initApp();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

const isSuperAdmin = user.role === 'super_admin';
if (!isAdmin()) document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

// Update theme button
function updateThemeBtn() {
    const theme = localStorage.getItem('theme') || 'light';
    document.getElementById('themeBtnText').textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro';
}
updateThemeBtn();

// Override toggleTheme to update button
const originalToggle = toggleTheme;
window.toggleTheme = function() {
    originalToggle();
    updateThemeBtn();
};

let categories = [], genres = [], groups = [], plans = [];

async function loadData() {
    try {
        [categories, genres] = await Promise.all([
            apiGet('/categories'),
            apiGet('/genres')
        ]);

        renderCategories();
        renderGenres();

        if (isSuperAdmin) {
            document.getElementById('groupsSection').classList.remove('hidden');
            [groups, plans] = await Promise.all([
                apiGet('/groups'),
                apiGet('/plans')
            ]);
            renderGroups();
            
            const planSel = document.getElementById('groupPlan');
            planSel.innerHTML = '<option value="">Sin plan</option>' + 
                plans.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== CATEGORÍAS =====
function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!categories.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin categorías</p></div>';
        return;
    }
    
    container.innerHTML = categories.map(c => `
        <div class="list-item">
            <div style="width:8px;height:32px;border-radius:4px;background:${c.color || 'var(--accent)'}"></div>
            <div class="list-item-content">
                <div class="list-item-title">${c.name}</div>
            </div>
            ${isAdmin() ? `
                <button class="btn btn-ghost btn-sm" onclick="editCat(${c.id})">✎</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteCat(${c.id})">×</button>
            ` : ''}
        </div>
    `).join('');
}

function openCatModal(cat = null) {
    document.getElementById('catModalTitle').textContent = cat ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('catId').value = cat?.id || '';
    document.getElementById('catName').value = cat?.name || '';
    openModal('catModal');
}

function editCat(id) {
    openCatModal(categories.find(c => c.id === id));
}

async function saveCat() {
    const id = document.getElementById('catId').value;
    const data = { name: document.getElementById('catName').value };
    
    if (!data.name) { showToast('Nombre requerido'); return; }
    
    try {
        if (id) await apiPut(`/categories/${id}`, data);
        else await apiPost('/categories', data);
        closeModal('catModal');
        loadData();
        showToast('Categoría guardada');
    } catch (e) { showToast('Error'); }
}

async function deleteCat(id) {
    if (confirm('¿Eliminar categoría?')) {
        await apiDelete(`/categories/${id}`);
        loadData();
        showToast('Categoría eliminada');
    }
}

// ===== GÉNEROS =====
function renderGenres() {
    const container = document.getElementById('genresList');
    if (!genres.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin géneros</p></div>';
        return;
    }
    
    container.innerHTML = genres.map(g => `
        <div class="list-item">
            <span style="font-size:20px">🎸</span>
            <div class="list-item-content">
                <div class="list-item-title">${g.name}</div>
            </div>
            ${isAdmin() ? `
                <button class="btn btn-ghost btn-sm" onclick="editGen(${g.id})">✎</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteGen(${g.id})">×</button>
            ` : ''}
        </div>
    `).join('');
}

function openGenModal(gen = null) {
    document.getElementById('genModalTitle').textContent = gen ? 'Editar Género' : 'Nuevo Género';
    document.getElementById('genId').value = gen?.id || '';
    document.getElementById('genName').value = gen?.name || '';
    openModal('genModal');
}

function editGen(id) {
    openGenModal(genres.find(g => g.id === id));
}

async function saveGen() {
    const id = document.getElementById('genId').value;
    const data = { name: document.getElementById('genName').value };
    
    if (!data.name) { showToast('Nombre requerido'); return; }
    
    try {
        if (id) await apiPut(`/genres/${id}`, data);
        else await apiPost('/genres', data);
        closeModal('genModal');
        loadData();
        showToast('Género guardado');
    } catch (e) { showToast('Error'); }
}

async function deleteGen(id) {
    if (confirm('¿Eliminar género?')) {
        await apiDelete(`/genres/${id}`);
        loadData();
        showToast('Género eliminado');
    }
}

// ===== GRUPOS =====
function renderGroups() {
    const container = document.getElementById('groupsList');
    if (!groups.length) {
        container.innerHTML = '<div class="empty-state"><p class="text-muted">Sin grupos</p></div>';
        return;
    }
    
    container.innerHTML = groups.map(g => `
        <div class="list-item">
            <span style="font-size:20px">🏢</span>
            <div class="list-item-content">
                <div class="list-item-title">${g.name}</div>
                <div class="list-item-subtitle">${g.plan_name || 'Sin plan'} · ${g.current_musicians || 0} músicos</div>
            </div>
            <span class="badge badge-${g.is_active ? 'green' : 'red'}">${g.is_active ? 'Activo' : 'Inactivo'}</span>
            <button class="btn btn-ghost btn-sm" onclick="editGroup(${g.id})">✎</button>
        </div>
    `).join('');
}

function openGroupModal(group = null) {
    document.getElementById('groupModalTitle').textContent = group ? 'Editar Grupo' : 'Nuevo Grupo';
    document.getElementById('groupId').value = group?.id || '';
    document.getElementById('groupName').value = group?.name || '';
    document.getElementById('groupPlan').value = group?.plan_id || '';
    openModal('groupModal');
}

function editGroup(id) {
    openGroupModal(groups.find(g => g.id === id));
}

async function saveGroup() {
    const id = document.getElementById('groupId').value;
    const data = {
        name: document.getElementById('groupName').value,
        plan_id: document.getElementById('groupPlan').value || null
    };
    
    if (!data.name) { showToast('Nombre requerido'); return; }
    
    try {
        if (id) await apiPut(`/groups/${id}`, data);
        else await apiPost('/groups', data);
        closeModal('groupModal');
        loadData();
        showToast('Grupo guardado');
    } catch (e) { showToast('Error'); }
}

loadData();
