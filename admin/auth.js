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
  window.api = async function(table, query = '') {
    const cacheKey = `${table}?${query}`;
    if (apiCache.has(cacheKey)) {
      return apiCache.get(cacheKey);
    }
    try {
      const { ok, data, status } = await sbAdmin(`/rest/v1/${table}?${query}`);
      if (!ok) throw new Error(JSON.stringify(data));
      apiCache.set(cacheKey, data); // Cache the successful result
      return data;
    } catch (e) {
      console.error(`API Error fetching ${table}:`, e.message);
      throw e;
    }
  };

  // Load the main auth script to get access to UI helpers like
  // openModal, closeModal, showToast, etc.
  if (!window.requireAuth) { // prevent double-loading
    const script = document.createElement('script');
    script.src = '/js/auth.js';
    document.head.appendChild(script);
  }

  // Signal that auth is ready — admin/index.html waits for this
  window.__HMLI_ADMIN_READY__ = true;
  window.dispatchEvent(new Event('hmli:admin:ready'));
})();