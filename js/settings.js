checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

const isSuperAdmin = user.role === 'super_admin';
const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

let categories = [];
let genres = [];
let groups = [];
let plans = [];

async function loadData() {
    try {
        [categories, genres] = await Promise.all([
            apiGet('/categories'),
            apiGet('/genres')
        ]);

        renderCategories();
        renderGenres();

        // Solo Super Admin ve grupos y planes
        if (isSuperAdmin) {
            document.getElementById('groupsSection').style.display = 'block';
            document.getElementById('plansSection').style.display = 'block';
            
            [groups, plans] = await Promise.all([
                apiGet('/groups'),
                apiGet('/plans')
            ]);
            
            renderGroups();
            renderPlans();
            
            // Llenar select de planes
            const planSelect = document.getElementById('groupPlan');
            planSelect.innerHTML = '<option value="">Sin plan</option>';
            plans.forEach(p => {
                planSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.max_musicians} músicos)</option>`;
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============ CATEGORÍAS ============

function renderCategories() {
    const container = document.getElementById('categoriesList');
    
    if (!categories.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay categorías. Crea la primera.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${categories.map(c => `
                <div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-secondary); border-radius: var(--radius); border-left: 4px solid ${c.color || '#3498db'};">
                    <span>${c.name}</span>
                    ${isAdmin ? `
                        <button class="btn btn-ghost btn-sm" onclick="editCategory(${c.id})" style="padding: 2px 6px;">✎</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteCategory(${c.id})" style="padding: 2px 6px; color: var(--danger);">×</button>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function openCategoryModal(category = null) {
    document.getElementById('categoryModalTitle').textContent = category ? 'Editar Categoría' : 'Nueva Categoría';
    document.getElementById('categoryId').value = category?.id || '';
    document.getElementById('categoryName').value = category?.name || '';
    document.getElementById('categoryColor').value = category?.color || '#3498db';
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
}

async function deleteCategory(id) {
    if (confirm('¿Eliminar esta categoría?')) {
        await apiDelete(`/categories/${id}`);
        loadData();
    }
}

// ============ GÉNEROS ============

function renderGenres() {
    const container = document.getElementById('genresList');
    
    if (!genres.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay géneros. Crea el primero.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${genres.map(g => `
                <div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-secondary); border-radius: var(--radius);">
                    <span>${g.name}</span>
                    ${isAdmin ? `
                        <button class="btn btn-ghost btn-sm" onclick="editGenre(${g.id})" style="padding: 2px 6px;">✎</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteGenre(${g.id})" style="padding: 2px 6px; color: var(--danger);">×</button>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
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
}

async function deleteGenre(id) {
    if (confirm('¿Eliminar este género?')) {
        await apiDelete(`/genres/${id}`);
        loadData();
    }
}

// ============ GRUPOS (Super Admin) ============

function renderGroups() {
    const container = document.getElementById('groupsList');
    
    if (!groups.length) {
        container.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>No hay grupos</p></div></td></tr>';
        return;
    }

    container.innerHTML = groups.map(g => `
        <tr>
            <td><strong>${g.name}</strong></td>
            <td>${g.plan_name || '-'}</td>
            <td>${g.current_musicians || 0} / ${g.max_musicians || '∞'}</td>
            <td>
                ${g.plan_start_date ? formatDateLocal(g.plan_start_date) : '-'} 
                ${g.plan_end_date ? ' - ' + formatDateLocal(g.plan_end_date) : ''}
            </td>
            <td>
                <span class="badge ${g.is_active ? 'badge-success' : 'badge-danger'}">
                    ${g.is_active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editGroup(${g.id})">Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="openAssignAdminModal(${g.id}, '${g.name}')">+ Admin</button>
            </td>
        </tr>
    `).join('');
}

function openGroupModal(group = null) {
    document.getElementById('groupModalTitle').textContent = group ? 'Editar Grupo' : 'Nuevo Grupo';
    document.getElementById('groupId').value = group?.id || '';
    document.getElementById('groupName').value = group?.name || '';
    document.getElementById('groupPlan').value = group?.plan_id || '';
    document.getElementById('groupStartDate').value = group?.plan_start_date?.split('T')[0] || '';
    document.getElementById('groupEndDate').value = group?.plan_end_date?.split('T')[0] || '';
    document.getElementById('groupLogo').value = group?.logo_url || '';
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
        name: document.getElementById('groupName').value,
        plan_id: document.getElementById('groupPlan').value || null,
        plan_start_date: document.getElementById('groupStartDate').value || null,
        plan_end_date: document.getElementById('groupEndDate').value || null,
        logo_url: document.getElementById('groupLogo').value || null
    };

    if (id) {
        await apiPut(`/groups/${id}`, data);
    } else {
        await apiPost('/groups', data);
    }

    closeGroupModal();
    loadData();
}

// ============ ASIGNAR ADMIN A GRUPO ============

function openAssignAdminModal(groupId, groupName) {
    document.getElementById('assignGroupId').value = groupId;
    document.getElementById('assignGroupName').textContent = groupName;
    document.getElementById('adminFirstName').value = '';
    document.getElementById('adminLastName').value = '';
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('assignAdminModal').classList.add('active');
}

function closeAssignAdminModal() {
    document.getElementById('assignAdminModal').classList.remove('active');
}

async function saveGroupAdmin() {
    const groupId = document.getElementById('assignGroupId').value;
    const password = document.getElementById('adminPassword').value;
    
    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    const data = {
        first_name: document.getElementById('adminFirstName').value,
        last_name: document.getElementById('adminLastName').value,
        email: document.getElementById('adminEmail').value,
        password: password,
        role: 'group_admin',
        group_id: parseInt(groupId)
    };

    try {
        const result = await apiPost('/users', data);
        if (result.error) {
            alert(result.error);
            return;
        }
        alert('Administrador creado exitosamente');
        closeAssignAdminModal();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ============ PLANES ============

function renderPlans() {
    const container = document.getElementById('plansList');
    
    container.innerHTML = plans.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.max_musicians}</td>
            <td>$${p.price}</td>
            <td>${p.description || '-'}</td>
        </tr>
    `).join('');
}

// Función para formatear fechas correctamente (sin problema de timezone)
function formatDateLocal(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

loadData();
