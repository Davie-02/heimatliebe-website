/**
 * Heimatliebe LMS — Central Authentication & Role Management
 *
 * Handles login, session persistence, role-based access, and API calls
 * for all portals (Student, Teacher, Accounts, HR, Director, Admin).
 *
 * Dependencies: supabase.js (loads config)
 * Usage: <script src="/js/auth.js"></script>
 *
 * Sessions are stored in sessionStorage with the key 'hmli_session'.
 * Role is determined from the `role` field in the users table.
 */

/* ═══════════════════════════════════════════════
   SESSION MANAGEMENT
════════════════════════════════════════════════════ */
const HMLI_SESSION_KEY = 'hmli_session';

/**
 * Save user session to sessionStorage.
 * @param {Object} user - User object from the database
 */
function saveSession(user) {
  const session = {
    id:          user.id,
    user_id:     user.user_id || user.id,
    full_name:   user.full_name,
    email:       user.email,
    phone:       user.phone || '',
    role:        user.role || 'student',
    photo_url:   user.photo_url || '',
    student_id:  user.student_id || null,
    course:      user.course || null,
    level:       user.level || null,
    staff_id:    user.staff_id || null,
    department:  user.department || null,
    login_at:    new Date().toISOString()
  };
  sessionStorage.setItem(HMLI_SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Retrieve the current user session.
 * @returns {Object|null} The session object or null
 */
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(HMLI_SESSION_KEY));
  } catch {
    return null;
  }
}

/**
 * Clear the session (logout).
 */
function clearSession() {
  sessionStorage.removeItem(HMLI_SESSION_KEY);
}

/**
 * Require authentication. Redirects to login if no session.
 * @param {string} [redirectUrl] - Where to send unauthenticated users
 * @returns {Object} The session object
 */
function requireAuth(redirectUrl) {
  const session = getSession();
  if (!session) {
    const dest = redirectUrl || '/login.html';
    window.location.href = dest + '?next=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return session;
}

/**
 * Require a specific role. Redirects if user doesn't have it.
 * @param {string|string[]} roles - Allowed role(s)
 * @param {string} [redirectUrl] - Where to send unauthorized users
 * @returns {Object} The session object
 */
function requireRole(roles, redirectUrl) {
  const session = requireAuth(redirectUrl);
  if (!session) return null;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.role)) {
    window.location.href = redirectUrl || '/login.html?error=unauthorized';
    return null;
  }
  return session;
}

/* ═══════════════════════════════════════════════
   ROLE-BASED PORTAL GATE
════════════════════════════════════════════════════ */

/**
 * Role → portal directory mapping.
 * Used to direct users to the correct portal on login.
 */
const ROLE_PORTAL = {
  student:    '/student/',
  teacher:    '/teacher/',
  accounts:   '/accounts/',
  hr:         '/hr/',
  director:   '/director/',
  admin:      '/admin/',
  superadmin: '/admin/'
};

/**
 * Get the portal URL for a given role.
 * @param {string} role
 * @returns {string}
 */
function portalUrlForRole(role) {
  return ROLE_PORTAL[role] || '/student/';
}

/**
 * Redirect user to their portal based on role.
 */
function redirectToPortal() {
  const session = getSession();
  if (!session) return;
  window.location.href = portalUrlForRole(session.role);
}

/* ═══════════════════════════════════════════════
   AUTH API
════════════════════════════════════════════════════ */

/**
 * Hash a password using SHA-256 with salt.
 * Must match the server-side hashing in server.js.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hex-encoded hash
 */
async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password + 'hmli_salt_2025')
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Log in using the unified `users` table (handles all roles).
 * @param {string} loginId - Student ID, Staff ID, or Email
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} { ok, user, error }
 */
async function loginUser(loginId, password) {
  await configReady();
  const pwHash = await hashPassword(password);

  // Try to find the user by their login identifier
  // The users table has: user_id (unique login), password_hash, role
  let { ok, data } = await sbAdmin(
    `/rest/v1/users?user_id=eq.${encodeURIComponent(loginId.toUpperCase())}&password_hash=eq.${encodeURIComponent(pwHash)}&select=*`,
    { method: 'GET', headers: { 'Prefer': '' } }
  );

  if (ok && data && data.length > 0) {
    return { ok: true, user: data[0] };
  }

  // Try by email
  ({ ok, data } = await sbAdmin(
    `/rest/v1/users?email=eq.${encodeURIComponent(loginId.toLowerCase())}&password_hash=eq.${encodeURIComponent(pwHash)}&select=*`,
    { method: 'GET', headers: { 'Prefer': '' } }
  ));

  if (ok && data && data.length > 0) {
    return { ok: true, user: data[0] };
  }

  // Fallback: check student_id in students table (legacy)
  ({ ok, data } = await sbAdmin(
    `/rest/v1/students?student_id=eq.${encodeURIComponent(loginId.toUpperCase())}&password_hash=eq.${encodeURIComponent(pwHash)}&select=*`,
    { method: 'GET', headers: { 'Prefer': '' } }
  ));

  if (ok && data && data.length > 0) {
    // Convert legacy student to user-like object with role
    const s = data[0];
    return { ok: true, user: { ...s, user_id: s.student_id, role: 'student' } };
  }

  return { ok: false, user: null, error: 'Invalid credentials. Please check your login ID and password.' };
}

/**
 * Log the user out: clear session, redirect to login.
 */
function logout() {
  clearSession();
  window.location.href = '/login.html';
}

/* ═══════════════════════════════════════════════
   PORTAL BOOTSTRAPPER
════════════════════════════════════════════════════ */

/**
 * Generate HTML for the standard portal sidebar.
 * @param {Object} session - Current user session
 * @param {Array} navItems - Array of { icon, label, page, badge, section }
 * @returns {string} Sidebar HTML
 */
function renderSidebar(session, navItems) {
  const currentPage = new URLSearchParams(window.location.search).get('page') || 'dashboard';
  const initial = (session.full_name || '?')[0].toUpperCase();
  const roleLabel = session.role.charAt(0).toUpperCase() + session.role.slice(1);

  let navHtml = '';
  let lastSection = '';
  navItems.forEach(item => {
    if (item.section && item.section !== lastSection) {
      navHtml += `<div class="nav-section">${item.section}</div>`;
      lastSection = item.section;
    }
    const active = item.page === currentPage ? 'active' : '';
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    navHtml += `<a href="#" class="nav-link ${active}" data-page="${item.page}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span>${badge}</a>`;
  });

  return `
    <div class="portal-layout">
      <aside class="portal-sidebar" id="portal-sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon">🎓</span>
          <div>
            <div class="brand-text">Heimatliebe <span>Institute</span></div>
            <div class="brand-role">${roleLabel} Portal</div>
          </div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="user-avatar">${initial}</div>
            <div>
              <div style="font-size:0.82rem;color:rgba(255,255,255,0.75);font-weight:500;">${session.full_name || session.email}</div>
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.35);">${session.student_id || session.email || ''}</div>
            </div>
          </div>
        </div>
      </aside>
      <main class="portal-main">
        <header class="portal-topbar">
          <div class="topbar-left">
            <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle menu">
              <span></span><span></span><span></span>
            </button>
            <span class="topbar-title" id="page-title">Dashboard</span>
          </div>
          <div class="topbar-right">
            <span class="topbar-date" id="topbar-date"></span>
            <a href="/index.html" class="btn btn-sm btn-ghost" style="text-decoration:none;">Main Site</a>
            <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
          </div>
        </header>
        <div class="portal-content" id="portal-content">
          <div class="skeleton" style="height:200px;"></div>
        </div>
      </main>
    </div>`;
}

/**
 * Initialise a portal page: attach sidebar, routing, and topbar clock.
 * Call this after the page has rendered renderSidebar() into the DOM.
 * @param {Object} session - Current user session
 * @param {Object} pages - Map of page name → render function: { dashboard: renderDashboard, ... }
 */
function initPortal(session, pages) {
  // Topbar clock
  function updateClock() {
    const el = document.getElementById('topbar-date');
    if (el) {
      el.textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
  }
  updateClock();
  setInterval(updateClock, 30000);

  // Sidebar toggle (mobile)
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('portal-sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Navigation routing
  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  function navigate(page) {
    // Update active link
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === page));
    // Update title
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    const titleEl = document.getElementById('page-title');
    if (activeLink && titleEl) {
      titleEl.textContent = activeLink.querySelector('span:last-child')?.textContent || 'Dashboard';
    }
    // Close sidebar on mobile
    if (sidebar) sidebar.classList.remove('open');
    // Render page
    const fn = pages[page];
    const content = document.getElementById('portal-content');
    if (fn) {
      fn();
    } else if (content) {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><p>This section is under development.</p></div>`;
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) {
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({ page }, '', url);
        navigate(page);
      }
    });
  });

  // Listen for popstate (back/forward)
  window.addEventListener('popstate', e => {
    const page = new URLSearchParams(window.location.search).get('page') || 'dashboard';
    navigate(page);
  });

  // Initial navigation
  const initialPage = new URLSearchParams(window.location.search).get('page') || 'dashboard';
  navigate(initialPage);

  // Key shortcut: Escape to close any modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* ═══════════════════════════════════════════════
   DATA FETCHING HELPERS
════════════════════════════════════════════════════ */

/**
 * Generic Supabase data loader with caching.
 */
const dataCache = {};

async function loadData(table, options = '') {
  const key = `${table}?${options}`;
  if (dataCache[key] && dataCache[key]._ts > Date.now() - 10000) {
    return dataCache[key].data;
  }
  const res = await sbAdmin(`/rest/v1/${table}?select=*${options}`, { method: 'GET', headers: { 'Prefer': '' } });
  if (res.ok && Array.isArray(res.data)) {
    dataCache[key] = { data: res.data, _ts: Date.now() };
    return res.data;
  }
  return [];
}

function invalidateCache(table) {
  Object.keys(dataCache).forEach(k => {
    if (k.startsWith(table)) delete dataCache[k];
  });
}

/* ═══════════════════════════════════════════════
   ESCAPE HTML
════════════════════════════════════════════════════ */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&').replace(/</g, '<')
    .replace(/>/g, '>').replace(/"/g, '"');
}

/* ═══════════════════════════════════════════════
   FORMAT HELPERS
════════════════════════════════════════════════════ */
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function formatDateTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

/* ═══════════════════════════════════════════════
   SHARED MODAL
════════════════════════════════════════════════════ */
function openModal(title, bodyHtml) {
  // Create or reuse modal
  let modal = document.getElementById('hmli-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hmli-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <div class="modal-title" id="hmli-modal-title"></div>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body" id="hmli-modal-body"></div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.body.appendChild(modal);
  }
  document.getElementById('hmli-modal-title').textContent = title;
  document.getElementById('hmli-modal-body').innerHTML = bodyHtml;
  modal.classList.add('open');
}

function closeModal() {
  const modal = document.getElementById('hmli-modal');
  if (modal) modal.classList.remove('open');
}

/* ═══════════════════════════════════════════════
   TOAST NOTIFICATION
════════════════════════════════════════════════════ */
function showToast(msg, isError = false) {
  let toast = document.getElementById('hmli-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hmli-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ═══════════════════════════════════════════════
   EXPORTS (globals for inline scripts)
════════════════════════════════════════════════════ */
// These are already assigned as global functions in the script context
// but we explicitly list them here for clarity:
// saveSession, getSession, clearSession, requireAuth, requireRole,
// redirectToPortal, hashPassword, loginUser, logout,
// renderSidebar, initPortal, loadData, invalidateCache,
// esc, formatDate, formatDateTime, openModal, closeModal, showToast
