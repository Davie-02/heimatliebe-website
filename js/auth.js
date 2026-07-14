/**
 * Heimatliebe LMS — Central Authentication & Role Management
 * Inactivity auto-logout, change password, role-based portals.
 * Script: <script src="/js/auth.js"></script>
 */
const HMLI_SESSION_KEY = 'hmli_session';
const ROLE_PORTAL = { student:'/student/', teacher:'/teacher/', accounts:'/accounts/', hr:'/hr/', director:'/director/', admin:'/admin/', superadmin:'/admin/' };

function portalUrlForRole(role) { return ROLE_PORTAL[role] || '/student/'; }
function redirectToPortal() { const s = getSession(); if (s) window.location.href = portalUrlForRole(s.role); }

function saveSession(user) {
  const session = {
    id: user.id, user_id: user.user_id || user.id, full_name: user.full_name,
    email: user.email, phone: user.phone || '', role: user.role || 'student',
    photo_url: user.photo_url || '', student_id: user.student_id || null,
    course: user.course || null, level: user.level || null,
    staff_id: user.staff_id || null, department: user.department || null,
    login_at: new Date().toISOString()
  };
  sessionStorage.setItem(HMLI_SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() { try { return JSON.parse(sessionStorage.getItem(HMLI_SESSION_KEY)); } catch { return null; } }
function clearSession() { sessionStorage.removeItem(HMLI_SESSION_KEY); }

function requireAuth(redirectUrl) {
  const s = getSession();
  if (!s) { window.location.href = (redirectUrl || '/login.html') + '?next=' + encodeURIComponent(window.location.pathname); return null; }
  return s;
}

function requireRole(roles, redirectUrl) {
  const s = requireAuth(redirectUrl);
  if (!s) return null;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(s.role)) { window.location.href = redirectUrl || '/login.html?error=unauthorized'; return null; }
  return s;
}

async function loginUser(loginId, password) {
  await configReady();
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: loginId, password })
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, user: null, error: data.error || 'Invalid credentials' };
  return { ok: true, user: data.user };
}

function logout() { clearSession(); window.location.href = '/login.html'; }

async function changePassword(userId, oldPw, newPw) {
  const res = await fetch('/api/change-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, old_password: oldPw, new_password: newPw })
  });
  return res.ok ? { ok: true } : { ok: false, error: (await res.json()).error };
}

// ── INACTIVITY TIMER ─────────────────────────────────────────────
let _inactivityTimer = null, _inactivityWarn = null;
function startInactivityTimer(minutes = 30) {
  const ms = minutes * 60 * 1000;
  const warnMs = ms - 60000; // warn 1 min before
  function reset() {
    if (_inactivityTimer) clearTimeout(_inactivityTimer);
    if (_inactivityWarn) clearTimeout(_inactivityWarn);
    _inactivityWarn = setTimeout(() => {
      showToast('⚠️ Session will expire in 1 minute due to inactivity');
    }, warnMs);
    _inactivityTimer = setTimeout(() => {
      showToast('⏰ Session expired due to inactivity', true);
      setTimeout(logout, 1500);
    }, ms);
  }
  ['click','keydown','mousemove','touchstart','scroll'].forEach(ev => document.addEventListener(ev, reset, { passive: true }));
  reset();
}

// ── SIDEBAR & PORTAL ─────────────────────────────────────────────
function renderSidebar(session, navItems) {
  const currentPage = new URLSearchParams(window.location.search).get('page') || 'dashboard';
  const initial = (session.full_name || '?')[0].toUpperCase();
  const roleLabel = session.role.charAt(0).toUpperCase() + session.role.slice(1);
  let navHtml = '', lastSection = '';
  navItems.forEach(item => {
    if (item.section && item.section !== lastSection) { navHtml += `<div class="nav-section">${item.section}</div>`; lastSection = item.section; }
    const active = item.page === currentPage ? 'active' : '';
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''; // Legacy badge
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
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.35);">${session.user_id || session.email || ''}</div>
            </div>
          </div>
        </div>
      </aside>
      <main class="portal-main">
        <header class="portal-topbar">
          <div class="topbar-left">
            <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>
            <span class="topbar-title" id="page-title">Dashboard</span>
          </div>
          <div class="topbar-right">
            <span class="topbar-date" id="topbar-date"></span>
            <a href="/index.html" class="btn btn-sm btn-ghost" style="text-decoration:none;">Main Site</a>
            <button id="theme-toggle" class="btn btn-sm btn-ghost" style="font-size: 1.2rem; padding: 0.2rem 0.5rem;">🌓</button>
            <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
          </div>
        </header>
        <div class="portal-content" id="portal-content">
          <div class="skeleton" style="height:200px;"></div>
        </div>
      </main>
    </div>`;
}

function initPortal(session, pages) {
  function updateClock() {
    const el = document.getElementById('topbar-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  updateClock(); setInterval(updateClock, 30000);
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('portal-sidebar');

  // Theme toggle logic
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('hmli-theme') || 'light';
  document.body.setAttribute('data-theme', currentTheme);
  if (themeToggle) {
    themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌓';
    themeToggle.addEventListener('click', () => {
      let newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', newTheme);
      localStorage.setItem('hmli-theme', newTheme);
      themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌓';
      showToast(`Switched to ${newTheme} mode`);
    });
  }

  if (toggle && sidebar) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  function navigate(page) {
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === page));
    const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    const titleEl = document.getElementById('page-title');
    if (activeLink && titleEl) titleEl.textContent = activeLink.querySelector('span:last-child')?.textContent || 'Dashboard';
    if (sidebar) sidebar.classList.remove('open');
    const fn = pages[page];
    const content = document.getElementById('portal-content');
    if (fn) fn(); else if (content) content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><p>Under development.</p></div>';
  }
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) { const url = new URL(window.location); url.searchParams.set('page', page); window.history.pushState({ page }, '', url); navigate(page); }
    });
  });
  window.addEventListener('popstate', () => { const p = new URLSearchParams(window.location.search).get('page') || 'dashboard'; navigate(p); });
  const initialPage = new URLSearchParams(window.location.search).get('page') || 'dashboard';
  navigate(initialPage);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });
  // Fetch and display the notification count
  updateNotificationCountBadge(session);
  startInactivityTimer(30);
}

// ── DATA HELPERS ─────────────────────────────────────────────────
const dataCache = {};
async function loadData(table, options = '') {
  const key = `${table}?${options}`;
  if (dataCache[key] && dataCache[key]._ts > Date.now() - 10000) {
    return dataCache[key].data;
  }
  // Use sbFetch for consistency and error handling
  const { ok, data } = await sbFetch(`/rest/v1/${table}?${options}`);
  if (ok) { dataCache[key] = { data, _ts: Date.now() }; return data; }
  console.error(`Failed to load data for: ${table}`);
  return [];
}
function invalidateCache(table) { Object.keys(dataCache).forEach(k => { if (k.startsWith(table)) delete dataCache[k]; }); }

/**
 * Fetches the count of unread notifications and updates the sidebar badge.
 * @param {object} session - The current user session object.
 */
async function updateNotificationCountBadge(session) {
  if (!session || !session.id) return;

  const notifLink = document.querySelector('.nav-link[data-page="notifications"]');
  if (!notifLink) return;

  try {
    // Fetch only the IDs of unread notifications for a lightweight query
    // Using sbFetch directly for better error handling visibility
    const { ok, data } = await sbFetch(`/rest/v1/notifications?user_id=eq.${session.id}&is_read=eq.false&select=id`);
    if (ok) {
      const count = data.length;

      let badge = notifLink.querySelector('.nav-badge-count');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'nav-badge-count';
          notifLink.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) { badge.remove(); }
    } else {
      console.warn('Could not fetch notification count.');
    }
  } catch (e) { console.warn('Could not fetch notification count:', e.message); }
}

// ── FORMAT HELPERS ───────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }
function formatDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }); } catch { return d; } }
function formatDateTime(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return d; } }

// ── MODAL ────────────────────────────────────────────────────────
function openModal(title, bodyHtml) {
  let modal = document.getElementById('hmli-modal');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'hmli-modal'; modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box"><div class="modal-header"><div class="modal-title" id="hmli-modal-title"></div><button class="modal-close" onclick="closeModal()">✕</button></div><div class="modal-body" id="hmli-modal-body"></div></div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.body.appendChild(modal);
  }
  document.getElementById('hmli-modal-title').textContent = title;
  document.getElementById('hmli-modal-body').innerHTML = bodyHtml;
  modal.classList.add('open');
}
function closeModal() { const m = document.getElementById('hmli-modal'); if (m) m.classList.remove('open'); }

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  let toast = document.getElementById('hmli-toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'hmli-toast'; document.body.appendChild(toast); }
  toast.textContent = msg; toast.className = 'toast' + (isError ? ' toast-error' : ''); toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── INITIAL PASSWORD ─────────────────────────────────────────────
function getInitialPassword() { return 'changeme123'; }
