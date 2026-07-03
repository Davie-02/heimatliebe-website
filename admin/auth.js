// Simple Supabase auth loader for admin area.
// Loads runtime config then initializes Supabase client and ensures a user session.
(async function(){
  // Wait for runtime config provided by /config.json or injected global
  if (window.__APP_CONFIG__ === undefined) {
    try { window.__APP_CONFIG__ = await (await fetch('/config.json')).json(); } catch(e) { window.__APP_CONFIG__ = {}; }
  }

  const cfg = window.__APP_CONFIG__ || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON) {
    // No Supabase configured; show message and don't load CMS
    document.body.innerHTML = '<p style="padding:2rem;font-family:system-ui;">Admin panel requires Supabase configuration. See README.</p>';
    return;
  }

  // Load local Supabase JS bundle if not already available.
  if (!window.supabase) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/supabase.umd.js';
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load local Supabase bundle.'));
        document.head.appendChild(script);
      });
    } catch (err) {
      document.body.innerHTML = `<p style="padding:2rem;font-family:system-ui;color:#a00;">Failed to load Supabase client. Check that /js/supabase.umd.js is available and /config.json is accessible.<br>${err.message}</p>`;
      return;
    }
  }

  // Initialize client
  window.__SUPABASE_CLIENT__ = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON);
  const adminPassword = cfg.ADMIN_PASSWORD || '';

  // Allow local admin password fallback if configured
  if (adminPassword && sessionStorage.getItem('hmli_admin_auth') === '1') {
    window.location.href = '/admin/ui.html';
    return;
  }

  // Check for existing Supabase session
  try {
    const { data } = await window.__SUPABASE_CLIENT__.auth.getSession();
    const session = data?.session;
    if (session && session.user) {
      // Authenticated — redirect to built-in Supabase admin UI
      window.location.href = '/admin/ui.html';
      return;
    }
  } catch (e) {
    // ignore and fall through to login
  }

  // Show a minimal login form using Supabase Email OTP or password
  document.body.innerHTML = `
    <div style="max-width:420px;margin:4rem auto;font-family:system-ui;padding:1.5rem;border:1px solid #eee;border-radius:6px;">
      <h2>Admin Login</h2>
      <p>Sign in with email and password (Supabase Auth).</p>
      <form id="admin-login">
        <input type="email" name="email" placeholder="Email" required style="width:100%;padding:0.6rem;margin:0.5rem 0;" />
        <input type="password" name="password" placeholder="Password" required style="width:100%;padding:0.6rem;margin:0.5rem 0;" />
        <button style="width:100%;padding:0.6rem;margin-top:0.5rem;">Sign in</button>
      </form>
      <div id="login-msg" style="margin-top:0.6rem;color:#a00"></div>
    </div>
  `;

  document.getElementById('admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value;
    const password = f.password.value;
    const client = window.__SUPABASE_CLIENT__;

      if (adminPassword && password === adminPassword) {
        sessionStorage.setItem('hmli_admin_auth', '1');
        window.location.href = '/admin/ui.html';
        return;
      }

      document.getElementById('login-msg').textContent = err.message || String(err);
    }
  });

})();
