checkAuth();

const user = getUser();
document.getElementById('userName').textContent = user.first_name + ' ' + (user.last_name || '');
document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Admin' : 'Músico';
document.getElementById('userAvatar').textContent = user.first_name?.charAt(0) || 'U';

const isAdmin = user.role === 'super_admin' || user.role === 'group_admin';

if (!isAdmin) {
    document.getElementById('btnAddMusician').style.display = 'none';
}

let allUsers = [];
let groupInfo = null;

async function loadData() {
    try {
        [allUsers, groupInfo] = await Promise.all([
            apiGet('/users'),
            apiGet('/groups/my-group')
        ]);

        renderPlanInfo();
        renderMusicians();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderPlanInfo() {
    if (!groupInfo) {
        document.getElementById('planInfo').style.display = 'none';
        return;
    }

    const musicians = allUsers.filter(u => u.role === 'musician' && u.is_active);
    const current = musicians.length;
    const max = groupInfo.max_musicians || 999;
    const percentage = Math.min((current / max) * 100, 100);

    document.getElementById('planName').textContent = groupInfo.plan_name || 'Sin plan';
    document.getElementById('planDescription').textContent = groupInfo.name;
    document.getElementById('currentMusicians').textContent = current;
    document.getElementById('maxMusicians').textContent = max;
    
    const progressBar = document.getElementById('planProgress');
    progressBar.style.width = `${percentage}%`;

    if (current >= max) {
        progressBar.classList.add('danger');
        const btn = document.getElementById('btnAddMusician');
        btn.disabled = true;
        btn.textContent = 'Límite alcanzado';
    }
}

function renderMusicians() {
    const container = document.getElementById('musiciansList');

    if (!allUsers.length) {
        container.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>Sin músicos</p></div></td></tr>';
        return;
    }

    container.innerHTML = allUsers.map(u => `
        <tr style="${!u.is_active ? 'opacity: 0.5;' : ''}">
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width: 32px; height: 32px; font-size: 13px;">
                        ${u.first_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <strong>${u.first_name} ${u.last_name || ''}</strong>
                        ${u.id === user.id ? '<span class="badge badge-primary" style="margin-left: 6px;">Tú</span>' : ''}
                    </div>
                </div>
            </td>
            <td>${u.email}</td>
            <td>${u.phone || '-'}</td>
            <td>
                <span class="badge ${u.role === 'super_admin' ? 'badge-danger' : u.role === 'group_admin' ? 'badge-warning' : 'badge-neutral'}">
                    ${u.role === 'super_admin' ? 'Super Admin' : u.role === 'group_admin' ? 'Admin' : 'Músico'}
                </span>
            </td>
            <td>
                <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                    ${u.is_active ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                ${isAdmin || u.id === user.id ? `
                    <button class="btn btn-ghost btn-sm" onclick="editMusician(${u.id})">Editar</button>
                    <button class="btn btn-ghost btn-sm" onclick="openPasswordModal(${u.id})">🔑</button>
                    ${isAdmin && u.id !== user.id ? `
                        ${u.is_active ? `
                            <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="toggleActive(${u.id}, false)">Desactivar</button>
                        ` : `
                            <button class="btn btn-ghost btn-sm" style="color: var(--success);" onclick="toggleActive(${u.id}, true)">Activar</button>
                        `}
                    ` : ''}
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function openModal(musician = null) {
    const isEditing = !!musician;
    document.getElementById('modalTitle').textContent = isEditing ? 'Editar Músico' : 'Nuevo Músico';
    document.getElementById('musicianId').value = musician?.id || '';
    document.getElementById('musicianFirstName').value = musician?.first_name || '';
    document.getElementById('musicianLastName').value = musician?.last_name || '';
    document.getElementById('musicianEmail').value = musician?.email || '';
    document.getElementById('musicianPassword').value = '';
    document.getElementById('musicianPhone').value = musician?.phone || '';
    document.getElementById('musicianRole').value = musician?.role || 'musician';

    document.getElementById('passwordGroup').style.display = isEditing ? 'none' : 'block';
    document.getElementById('musicianPassword').required = !isEditing;

    if (user.role !== 'super_admin') {
        document.getElementById('musicianRole').disabled = true;
    }

    document.getElementById('musicianModal').classList.add('active');
}

function closeModal() {
    document.getElementById('musicianModal').classList.remove('active');
}

function editMusician(id) {
    const musician = allUsers.find(u => u.id === id);
    openModal(musician);
}

async function saveMusician() {
    const id = document.getElementById('musicianId').value;
    const isEditing = !!id;

    const data = {
        first_name: document.getElementById('musicianFirstName').value,
        last_name: document.getElementById('musicianLastName').value,
        email: document.getElementById('musicianEmail').value,
        phone: document.getElementById('musicianPhone').value,
        role: document.getElementById('musicianRole').value
    };

    if (!isEditing) {
        const password = document.getElementById('musicianPassword').value;
        if (password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        data.password = password;
    }

    try {
        if (isEditing) {
            await apiPut(`/users/${id}`, data);
        } else {
            const result = await apiPost('/users', data);
            if (result.error) {
                alert(result.error);
                return;
            }
        }

        closeModal();
        loadData();
    } catch (error) {
        alert('Error al guardar: ' + error.message);
    }
}

async function toggleActive(id, isActive) {
    await apiPut(`/users/${id}`, { is_active: isActive });
    loadData();
}

function openPasswordModal(id) {
    document.getElementById('passwordUserId').value = id;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

async function changePassword() {
    const id = document.getElementById('passwordUserId').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword.length < 6) {
        alert('Mínimo 6 caracteres');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    await apiPut(`/users/${id}/password`, { password: newPassword });
    alert('Contraseña actualizada');
    closePasswordModal();
}

loadData();
