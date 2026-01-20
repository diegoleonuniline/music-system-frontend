var API_URL = 'https://caiman-api.herokuapp.com/api';

function checkAuth() {
    var token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    var user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function isAdmin() {
    var user = getUser();
    return user && user.role === 'admin';
}

function setupUserInfo() {
    var user = getUser();
    if (user) {
        var el = document.getElementById('userName');
        if (el) el.textContent = user.name || user.email;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

function showToast(msg, type) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

async function apiGet(endpoint) {
    var res = await fetch(API_URL + endpoint, {
        headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (res.status === 401) { logout(); return; }
    return res.json();
}

async function apiPost(endpoint, data) {
    var res = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(data)
    });
    if (res.status === 401) { logout(); return; }
    return res.json();
}

async function apiPut(endpoint, data) {
    var res = await fetch(API_URL + endpoint, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(data)
    });
    if (res.status === 401) { logout(); return; }
    return res.json();
}

async function apiDelete(endpoint) {
    var res = await fetch(API_URL + endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (res.status === 401) { logout(); return; }
    return res.json();
}
