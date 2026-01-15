const API_BASE = '/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user'));
let myApps = [];
let currentApp = null;
let currentAppUsers = {};
let selectedUser = null;

// Tab Logic
// Tab Logic
let currentTab = 'users';

window.switchSubTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.sub-nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().replace(' ', '').includes(tab.replace('login', '').trim())) btn.classList.add('active');
    });

    if (tab === 'users' || tab === 'public') {
        const el = document.getElementById('users-tab-content');
        document.getElementById('hwid-access-tab-content').classList.add('hidden');

        // Update Add User Button Text/Context
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) addUserBtn.innerHTML = tab === 'public' ? '<i class="ph ph-globe"></i> ADD PUBLIC USER' : '<i class="ph ph-plus-circle"></i> ADD USER';

        filterUsers();
        animateEntry(el);
    } else {
        document.getElementById('users-tab-content').classList.add('hidden');
        const el = document.getElementById('hwid-access-tab-content');
        loadHwidAccess();
        animateEntry(el);
    }
};

// HWID Access Management
let currentHwidAccess = {};

async function loadHwidAccess() {
    try {
        const res = await axios.get(`${API_BASE}/admin/app/${currentApp.appId}/hwid-access`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        currentHwidAccess = res.data || {};
        // Remove null entries to prevent crashes
        Object.keys(currentHwidAccess).forEach(key => {
            if (currentHwidAccess[key] === null) delete currentHwidAccess[key];
        });

        // Update Total HWID counter in header
        const totalHwid = Object.keys(currentHwidAccess).length;
        const totalHwidEl = document.getElementById('display-total-hwid');
        if (totalHwidEl) totalHwidEl.innerText = totalHwid;

        updateStats(); // Synchronize the stats grid
        filterHwidAccess();
    } catch (err) {
        console.error('Failed to load HWID access', err);
    }
}

function filterHwidAccess() {
    const searchTerm = document.getElementById('hwid-search').value.toLowerCase();
    const tableBody = document.getElementById('hwid-access-table-body');
    tableBody.innerHTML = '';

    Object.keys(currentHwidAccess).forEach(hwid => {
        const h = currentHwidAccess[hwid];
        if (hwid.toLowerCase().includes(searchTerm) || (h.name && h.name.toLowerCase().includes(searchTerm))) {
            const tr = document.createElement('tr');
            const createdDate = h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'N/A';
            tr.innerHTML = `
                <td>${h.name}</td>
                <td><span class="status-tag status-${h.status || 'active'}">${h.status || 'active'}</span></td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">${createdDate}</td>
                <td><button class="action-btn-small" onclick="selectHwidAccess('${hwid}')">Edit</button></td>
            `;
            tableBody.appendChild(tr);
        }
    });
}

window.selectHwidAccess = (hwid) => {
    const h = currentHwidAccess[hwid];
    if (!h) return;

    document.getElementById('edit-hwid-name').value = h.name || '';
    document.getElementById('edit-hwid-value').value = hwid;
    document.getElementById('edit-hwid-value').setAttribute('readonly', 'true'); // Enforce readonly for edit
    document.getElementById('edit-hwid-status').value = h.status || 'active';
    document.getElementById('edit-hwid-reason').value = h.reason || '';
    document.getElementById('edit-hwid-expiry').value = h.expires ? h.expires.split('T')[0] : '';
    document.getElementById('edit-hwid-created').value = h.createdAt ? new Date(h.createdAt).toLocaleString() : 'N/A';

    // Open Modal
    const modal = document.getElementById('edit-hwid-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

document.getElementById('add-hwid-btn').onclick = () => {
    // Pre-fill fields for NEW entry
    document.getElementById('edit-hwid-name').value = '';
    document.getElementById('edit-hwid-value').value = '';
    document.getElementById('edit-hwid-value').removeAttribute('readonly'); // Allow editing for new
    document.getElementById('edit-hwid-status').value = 'active';
    document.getElementById('edit-hwid-reason').value = '';
    document.getElementById('edit-hwid-expiry').value = '';
    document.getElementById('edit-hwid-created').value = 'Now (Once saved)';

    // Open Modal
    document.getElementById('edit-hwid-modal').classList.remove('hidden');
    document.getElementById('edit-hwid-modal').style.display = 'flex';
};

document.getElementById('save-hwid-access-btn').onclick = async () => {
    const data = {
        hwid: document.getElementById('edit-hwid-value').value,
        name: document.getElementById('edit-hwid-name').value,
        status: document.getElementById('edit-hwid-status').value,
        reason: document.getElementById('edit-hwid-reason').value,
        expires: document.getElementById('edit-hwid-expiry').value ? document.getElementById('edit-hwid-expiry').value + 'T00:00:00' : null
    };

    try {
        await axios.post(`${API_BASE}/admin/app/${currentApp.appId}/save-hwid-access`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        showToast('HWID Access saved', 'success');
        document.getElementById('edit-hwid-value').value = ''; // Clear input
        closeModal('edit-hwid-modal');
        loadHwidAccess();
    } catch (err) {
        showToast('Failed to save HWID access', 'error');
    }
};

document.getElementById('delete-hwid-access-btn').onclick = async () => {
    const hwid = document.getElementById('edit-hwid-value').value;
    if (!confirm(`Delete access for ${hwid}?`)) return;

    try {
        await axios.delete(`${API_BASE}/admin/app/${currentApp.appId}/hwid-access/${hwid}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Access removed', 'success');
        closeModal('edit-hwid-modal');
        loadHwidAccess();
    } catch (err) {
        showToast('Delete failed', 'error');
    }
};

document.getElementById('hwid-search').oninput = filterHwidAccess;

// Animations helper
const animateEntry = (el) => {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.opacity = '0';
    el.style.transform = 'translateY(15px)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.7s ease-out, transform 0.7s cubic-bezier(0.165, 0.84, 0.44, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
};

const generateHwid = () => {
    const s = window.screen;
    const n = window.navigator;
    const str = `${n.userAgent}-${s.width}x${s.height}-${n.language}-${s.colorDepth}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return 'ADM-' + Math.abs(hash).toString(16).toUpperCase();
};

function showDashboard() {
    if (typeof axios === 'undefined') return console.error('Axios missing - Dashboard cannot load content.');
    document.getElementById('auth-container').classList.add('hidden');
    const db = document.getElementById('dashboard-section');
    db.classList.remove('hidden'); // Show instantly to avoid black screen bugs

    if (user && user.username) {
        document.getElementById('user-greeting').innerText = user.username.toUpperCase();
    }

    // Set Admin Management HWID in header
    const hwidSig = document.getElementById('display-hwid-sig');
    if (hwidSig) hwidSig.innerText = generateHwid();

    loadApps();
}

function showAuth() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
}

// Sidebar App Loading
async function loadApps() {
    try {
        const res = await axios.get(`${API_BASE}/admin/my-apps`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        myApps = res.data;
        renderAppsList();
    } catch (err) {
        if (err.response?.status === 401) logout();
    }
}

function renderAppsList() {
    const list = document.getElementById('apps-list');
    list.innerHTML = '';

    if (myApps.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'padding:15px; font-size:0.8rem; color:var(--text-dim); text-align:center; border:1px dashed var(--border); border-radius:10px; margin-bottom:15px;';
        placeholder.innerText = 'No panels registered';
        list.appendChild(placeholder);
        return;
    }

    myApps.forEach(app => {
        const btn = document.createElement('button');
        btn.className = `nav-item ${currentApp?.appId === app.appId ? 'active' : ''}`;
        btn.innerText = app.name;
        btn.onclick = () => selectApp(app);
        list.appendChild(btn);
    });
}

async function selectApp(app) {
    currentApp = app;
    const noApp = document.getElementById('no-app-selected');
    const appDash = document.getElementById('app-dashboard');
    if (noApp) noApp.classList.add('hidden');
    if (appDash) appDash.classList.remove('hidden');

    const setSafeInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setSafeInner('selected-app-name', app.name);

    // Populate Inputs
    const appIdEl = document.getElementById('display-app-id');
    if (appIdEl) {
        appIdEl.value = app.appId;
        appIdEl.type = "password"; // Default hidden
    }

    const appSecretEl = document.getElementById('display-app-secret');
    if (appSecretEl) {
        appSecretEl.value = app.secret;
        appSecretEl.type = "password"; // Default hidden
    }

    // Reset icons
    document.querySelectorAll('.icon-btn i.ph-eye-slash').forEach(icon => {
        icon.classList.remove('ph-eye-slash');
        icon.classList.add('ph-eye');
    });

    setSafeInner('display-app-version', app.version || '1.0');

    // Clear old data instantly
    const tableBody = document.getElementById('app-users-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-dim);">Loading Operational Data...</td></tr>';

    setSafeInner('stat-total', '...');
    setSafeInner('stat-active', '...');
    setSafeInner('stat-banned', '...');
    setSafeInner('stat-hwids', '...');

    renderAppsList(); // Refresh active state
    loadAppUsers();
    loadHwidAccess(); // Reload HWID data for new app
}

// User Management
async function loadAppUsers() {
    try {
        const res = await axios.get(`${API_BASE}/admin/app/${currentApp.appId}/accounts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        currentAppUsers = res.data || {};
        // Remove null entries to prevent crashes
        Object.keys(currentAppUsers).forEach(key => {
            if (currentAppUsers[key] === null) delete currentAppUsers[key];
        });
        updateStats();
        filterUsers();
    } catch (err) {
        console.error('Failed to load users', err);
    }
}

function updateStats() {
    const users = Object.values(currentAppUsers);

    const setSafeInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setSafeInner('stat-total', users.length);
    setSafeInner('stat-active', users.filter(u => u.status === 'active').length);
    setSafeInner('stat-banned', users.filter(u => u.status === 'ban').length);

    // Update HWID stat from currentHwidAccess
    const hwidCount = currentHwidAccess ? Object.keys(currentHwidAccess).length : 0;
    setSafeInner('stat-hwids', hwidCount);
}

function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    const tableBody = document.getElementById('app-users-table-body');
    tableBody.innerHTML = '';

    Object.keys(currentAppUsers).forEach(username => {
        const u = currentAppUsers[username];
        const isPublic = u.hwidLock === false;

        // Filter based on tab
        if (currentTab === 'public' && !isPublic) return;
        if (currentTab === 'users' && isPublic) return;

        if (username.toLowerCase().includes(searchTerm) || (u.hwid && u.hwid.toLowerCase().includes(searchTerm))) {
            const tr = document.createElement('tr');

            const formatDate = (d) => d ? new Date(d).toLocaleString() : '-';
            const formatExpiry = (d) => {
                if (!d) return 'Lifetime';
                const date = new Date(d);
                return date < new Date() ? `<span style="color:var(--danger)">Expired</span>` : date.toLocaleDateString();
            };

            tr.innerHTML = `
                <td style="font-weight:600;">${username}</td>
                <td><span class="status-tag status-${u.status}">${u.status}</span></td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${formatDate(u.createdAt)}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${formatDate(u.lastLogin)}</td>
                 <td style="font-size:0.8rem;">${formatExpiry(u.expires)}</td>
                <td><button class="action-btn-small pill-btn" onclick="selectUser('${username}')"><i class="ph ph-gear-six"></i> Manage</button></td>
            `;
            tableBody.appendChild(tr);
        }
    });
}

// --- Select User for Edit ---
function selectUser(username) {
    const user = currentAppUsers[username];
    if (!user) return;

    document.getElementById('edit-username').value = username;
    document.getElementById('edit-password').value = user.password || "";
    document.getElementById('edit-status').value = user.status || "active";
    document.getElementById('edit-reason').value = user.reason || "";
    document.getElementById('edit-hwid').value = user.hwid || "Not Set";

    // Set Checkbox State
    const lockCheckbox = document.getElementById('edit-hwid-lock-disable');
    if (lockCheckbox) {
        lockCheckbox.checked = (user.hwidLock === false);
    }

    if (user.expires) {
        document.getElementById('edit-expiry').value = user.expires.split('T')[0];
    } else {
        document.getElementById('edit-expiry').value = "";
    }

    // Open Modal
    const modal = document.getElementById('edit-user-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// --- Save User Changes ---
document.getElementById('save-user-btn').addEventListener('click', async () => {
    if (!currentApp || !currentApp.appId) return;
    const username = document.getElementById('edit-username').value;
    if (!username) return;

    const updates = {
        password: document.getElementById('edit-password').value,
        status: document.getElementById('edit-status').value,
        reason: document.getElementById('edit-reason').value,
        expires: document.getElementById('edit-expiry').value ? new Date(document.getElementById('edit-expiry').value).toISOString() : null,
        hwidLock: !document.getElementById('edit-hwid-lock-disable').checked // Inverse logic: Checked = Disable Lock (false)
    };

    try {
        await axios.post(`${API_BASE}/admin/app/${currentApp.appId}/save-account`, {
            username,
            ...updates
        }, { headers: { Authorization: `Bearer ${token}` } });

        // showToast('User updated!', 'success'); // Optional
        closeModal('edit-user-modal'); // Close modal on save
        loadAppUsers();
    } catch (err) {
        showToast('Failed to update user: ' + (err.response?.data?.message || err.message), 'error');
    }
});

// --- Delete User ---
document.getElementById('delete-user-btn').addEventListener('click', async () => {
    if (!currentApp || !currentApp.appId) return;
    const username = document.getElementById('edit-username').value;
    if (!username) return;

    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
        await axios.delete(`${API_BASE}/admin/app/${currentApp.appId}/account/${username}`, { headers: { Authorization: `Bearer ${token}` } });
        closeModal('edit-user-modal');
        loadAppUsers();
    } catch (err) {
        showToast('Failed to delete: ' + (err.response?.data?.message || err.message), 'error');
    }
});

// --- Reset HWID ---
document.getElementById('reset-hwid-btn').addEventListener('click', async () => {
    if (!currentApp || !currentApp.appId) return;
    const username = document.getElementById('edit-username').value;

    if (!confirm('Reset HWID for this user?')) return;

    try {
        await axios.post(`${API_BASE}/admin/app/${currentApp.appId}/reset-hwid/${username}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        showToast('HWID Reset!', 'success');
        // Refresh local data
        document.getElementById('edit-hwid').value = "Not Set";
        loadAppUsers();
    } catch (err) {
        showToast('Failed to reset HWID', 'error');
    }
});

// New User Modal
document.getElementById('add-user-btn').onclick = () => {
    document.getElementById('add-user-modal').classList.remove('hidden');
    // Auto-set checkbox based on tab
    const checkbox = document.getElementById('add-hwid-lock-disable');
    if (checkbox) checkbox.checked = (currentTab === 'public');
};

document.getElementById('confirm-add-user').onclick = async () => {
    const username = document.getElementById('add-username').value;
    const password = document.getElementById('add-password').value;
    const duration = document.getElementById('add-duration').value;

    // Calculate expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(duration));

    const data = {
        username,
        password,
        status: 'active',
        expires: duration === '36500' ? null : expiryDate.toISOString(),
        hwidLock: !document.getElementById('add-hwid-lock-disable').checked
    };

    try {
        await axios.post(`${API_BASE}/admin/app/${currentApp.appId}/save-account`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // alert('User created!'); 
        closeModal('add-user-modal');
        loadAppUsers();
    } catch (err) {
        showToast('Failed to add user: ' + (err.response?.data?.message || err.message), 'error');
    }
};

// App Creation Modal
document.getElementById('create-app-btn').onclick = () => {
    document.getElementById('create-app-modal').classList.remove('hidden');
};

document.getElementById('confirm-create-app').onclick = async () => {
    const name = document.getElementById('new-app-name').value;
    try {
        await axios.post(`${API_BASE}/admin/create-app`, { name }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        closeModal('create-app-modal');
        loadApps();
    } catch (err) {
        showToast('Failed to create app', 'error');
    }
};

// Edit App Logic
document.getElementById('edit-app-btn').onclick = () => {
    if (!currentApp) return;
    document.getElementById('edit-app-name').value = currentApp.name;
    document.getElementById('edit-app-version-input').value = currentApp.version || '1.0';
    document.getElementById('edit-app-modal').classList.remove('hidden');
};

document.getElementById('confirm-edit-app').onclick = async () => {
    if (!currentApp) return;
    const name = document.getElementById('edit-app-name').value;
    const version = document.getElementById('edit-app-version-input').value;

    try {
        await axios.post(`${API_BASE}/admin/app/${currentApp.appId}/update`, {
            name,
            version
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        showToast('App configuration updated', 'success');
        closeModal('edit-app-modal');

        // Update local currentApp object
        currentApp.name = name;
        currentApp.version = version;

        // Refresh UI
        selectApp(currentApp);
    } catch (err) {
        showToast('Failed to update app', 'error');
    }
};

// Delete App Logic
document.getElementById('delete-app-btn').onclick = async () => {
    if (!currentApp) return;

    if (!confirm(`Are you sure you want to delete panel "${currentApp.name}"?\nThis action cannot be undone and will delete all users.`)) return;

    try {
        await axios.delete(`${API_BASE}/admin/app/${currentApp.appId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        showToast('Panel deleted successfully', 'success');

        // Reset state
        currentApp = null;
        document.getElementById('no-app-selected').classList.remove('hidden');
        document.getElementById('app-dashboard').classList.add('hidden');

        loadApps();
    } catch (err) {
        showToast('Failed to delete panel', 'error');
    }
};

// Auth
document.getElementById('login-btn').onclick = async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
        token = res.data.token;
        user = res.data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        showDashboard();
    } catch (err) {
        showToast(err.response?.data?.message || 'Login failed', 'error');
    }
};

document.getElementById('register-btn').onclick = async () => {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // Validation
    if (!username || !email || !password) {
        showToast('All fields are required.', 'error');
        return;
    }

    if (username.includes('@')) {
        showToast('Username cannot be an email address.', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address.', 'error');
        return;
    }

    try {
        await axios.post(`${API_BASE}/auth/register`, { username, email, password });
        showToast('Admin registered successfully! Please login.', 'success');
        setTimeout(() => {
            document.getElementById('show-login').click();
        }, 1500);
    } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Registration failed';
        showToast(msg, 'error');
    }
};

function logout() {
    localStorage.clear();
    location.reload();
}

document.getElementById('logout-btn').onclick = logout;

// UI Toggles
document.getElementById('show-register').onclick = (e) => {
    e.preventDefault();
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.remove('hidden');
};

document.getElementById('show-login').onclick = (e) => {
    e.preventDefault();
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};


// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
    const title = type === 'success' ? 'Success' : 'Error';

    toast.innerHTML = `
        <i class="ph-fill ${icon} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Animation entry
    requestAnimationFrame(() => {
        toast.classList.add('active');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

document.getElementById('user-search').oninput = filterUsers;


// Toggle Secret Visibility (Input Type)
window.toggleSecretInput = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const btn = el.parentElement.querySelector('.icon-btn[onclick*="toggle"] i');

    if (el.type === 'password') {
        el.type = 'text';
        if (btn) {
            btn.className = 'ph ph-eye-slash';
        }
    } else {
        el.type = 'password';
        if (btn) {
            btn.className = 'ph ph-eye';
        }
    }
};

// Copy Secret
window.copySecret = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    navigator.clipboard.writeText(el.value).then(() => {
        showToast('Copied to clipboard', 'success');

        // Visual Feedback
        const btn = el.parentElement.querySelector('.icon-btn[onclick*="copy"] i');
        if (btn) {
            const originalClass = btn.className;
            btn.className = 'ph-fill ph-check-circle';
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                btn.className = originalClass;
                btn.style.color = '';
            }, 1000);
        }
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
};

// Handle Reset Secret Token
document.getElementById('reset-app-secret-btn').onclick = async () => {
    if (!currentApp) return;

    if (!confirm("DANGER: Resetting the Secret Token will break all active software integrations immediately.\n\nAre you sure you want to proceed?")) return;

    try {
        const res = await axios.post(`${API_BASE}/admin/app/${currentApp.appId}/reset-secret`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Update local state
        currentApp.secret = res.data.secret;

        // Update UI
        const secretEl = document.getElementById('display-app-secret');
        if (secretEl) {
            secretEl.value = currentApp.secret;
        }

        showToast('Secret Token Reset Successfully', 'success');
        closeModal('edit-app-modal');
    } catch (err) {
        showToast('Failed to reset secret', 'error');
    }
};

// Initial Auth Check
if (token && user) {
    showDashboard();
}
