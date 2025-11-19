const API_URL = 'http://localhost:3000';

// Helper to get JWT
const getJwt = () => localStorage.getItem('token');

// Helper to get headers
const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getJwt();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

// Login Page Logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                } else {
                    localStorage.removeItem('token'); // Clear if switching modes
                }

                if (data.csrfToken) {
                    localStorage.setItem('csrfToken', data.csrfToken);
                } else {
                    localStorage.removeItem('csrfToken');
                }

                window.location.href = 'dashboard.html';
            } else {
                showMessage(data.error, 'error');
            }
        } catch (err) {
            showMessage('Connection error', 'error');
        }
    });
}

// Dashboard Logic
const balanceDisplay = document.getElementById('balanceDisplay');
if (balanceDisplay) {
    // Load User Data
    const loadData = async () => {
        try {
            const res = await fetch(`${API_URL}/me`, {
                headers: getHeaders()
            });
            if (res.status === 401 || res.status === 403) {
                window.location.href = 'index.html';
                return;
            }
            const data = await res.json();
            document.getElementById('usernameDisplay').textContent = `Logged in as: ${data.username}`;
            balanceDisplay.textContent = `$${data.balance}`;

            // Update Security Mode Dropdown
            const modeSelect = document.getElementById('securityMode');
            if (modeSelect) {
                modeSelect.value = data.securityMode;
            }

            // Set CSRF Token in hidden field if available
            const csrfToken = localStorage.getItem('csrfToken');
            const csrfInput = document.getElementById('csrfToken');
            if (csrfToken && csrfInput) {
                csrfInput.value = csrfToken;
            }

        } catch (err) {
            console.error(err);
        }
    };
    loadData();

    // Handle Transfer
    document.getElementById('transferForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const to = document.getElementById('toUser').value;
        const amount = document.getElementById('amount').value;
        const csrfToken = document.getElementById('csrfToken').value;

        try {
            const body = { to, amount };
            if (csrfToken) body.csrfToken = csrfToken;

            const res = await fetch(`${API_URL}/transfer`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (res.ok) {
                showMessage(`Success! New Balance: $${data.newBalance}`, 'success');
                loadData();
            } else {
                showMessage(data.error || 'Transfer failed', 'error');
            }
        } catch (err) {
            showMessage('Connection error', 'error');
        }
    });

    // Handle Security Mode Change
    document.getElementById('securityMode').addEventListener('change', async (e) => {
        const mode = e.target.value;
        await fetch(`${API_URL}/set-security`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        // Re-login might be needed for some modes to take effect properly (like JWT vs Cookie)
        // But for simplicity we just reload or let the user know.
        // Actually, if we switch to JWT, we need to login again to get the token.
        // If we switch to Cookie, we need to login to set the cookie.
        alert(`Security Mode changed to ${mode}. Please logout and login again to ensure proper session setup.`);

        // Clear local storage to be safe
        localStorage.removeItem('token');
        localStorage.removeItem('csrfToken');
        window.location.href = 'index.html';
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch(`${API_URL}/logout`, { method: 'POST' });
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Reset
    document.getElementById('resetBtn').addEventListener('click', async () => {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
        loadData();
        showMessage('Balances reset to default', 'success');
    });
}

function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = `status ${type}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}
