checkAuth();
setupUserInfo();

const user = getUser();
let musicians = [];
let categories = [];
let genres = [];

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
