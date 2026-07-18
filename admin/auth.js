// admin/auth.js — loads config and exposes sbAdmin() for the CMS
// Fixed: no longer depends on external bundles or redirects to ui.html
(async function () {
  // Load runtime config from /config.json
  let cfg = {};
  if (window.__APP_CONFIG__) {
    cfg = window.__APP_CONFIG__;
  } else {
    try {
      const r = await fetch('/config.json');
      if (r.ok) cfg = await r.json();
    } catch (e) { /* ignore */ }
    window.__APP_CONFIG__ = cfg;
  }

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON) {
    console.error('[HMLI Admin] Missing SUPABASE_URL or SUPABASE_ANON in config.json');
    return;
  }

  // Expose sbAdmin globally so admin/index.html inline scripts can call it
  window.SUPABASE_URL   = cfg.SUPABASE_URL;
  window.SUPABASE_ANON  = cfg.SUPABASE_ANON;
  window.ADMIN_PASSWORD = cfg.ADMIN_PASSWORD || '';

  // Simple in-memory cache to speed up repeated data fetches
  const apiCache = new Map();

  window.sbAdmin = async function (path, options = {}) {
    const { headers: extra = {}, ...rest } = options;
    const res = await fetch(`${cfg.SUPABASE_URL}${path}`, {
      ...rest,
      headers: {
        'apikey':        cfg.SUPABASE_ANON,
        'Authorization': `Bearer ${cfg.SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Prefer':        options.method === 'GET' ? '' : 'return=representation',
        ...extra
      }
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  };

  // Add a cached API fetcher for the admin panel
  window.api = async function(table, query = '', { bust = false } = {}) {
    const cacheKey = `${table}?${query}`;
    if (!bust && apiCache.has(cacheKey)) return apiCache.get(cacheKey);
    try {
      // Use server-side /api/ routes which use service role key
      const params = query ? `?${query}` : '';
      const r = await fetch(`/api/${table}${params}`);
      if (!r.ok) { const d = await r.json(); throw new Error(JSON.stringify(d)); }
      const data = await r.json();
      apiCache.set(cacheKey, data);
      return data;
    } catch (e) {
      console.error(`API Error fetching ${table}:`, e.message);
      throw e;
    }
  };

  // Allow callers to bust cache for a table after mutations
  window.bustCache = function(table) {
    for (const key of apiCache.keys()) {
      if (key.startsWith(table)) apiCache.delete(key);
    }
  };

  // Load js/auth.js synchronously to ensure helpers (openModal, showToast, etc.)
  // are available before we fire the ready event
  if (!window.requireAuth) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = '/js/auth.js';
      script.onload = resolve;
      script.onerror = resolve; // resolve even on error to not block
      document.head.appendChild(script);
    });
  }

  // Signal that auth is ready — admin/index.html waits for this
  window.__HMLI_ADMIN_READY__ = true;
  window.dispatchEvent(new Event('hmli:admin:ready'));
})();