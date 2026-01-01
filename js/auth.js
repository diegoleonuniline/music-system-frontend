initTheme();

// Check if already logged in
if (getToken()) {
    window.location.href = 'pages/dashboard.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');
    
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    errorEl.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        window.location.href = 'pages/dashboard.html';
        
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Iniciar Sesión';
    }
});
