/**
 * Admin Authentication Bootstrap — Heimatliebe Institute CMS
 * 
 * This script is loaded by admin/index.html to:
 * 1. Load supabase.js for database configuration
 * 2. Load js/auth.js for shared auth utilities
 * 3. Extract config values (SUPABASE_URL, SUPABASE_ANON, ADMIN_PASSWORD) for admin use
 * 4. Signal readiness with a custom event
 */

(function bootAdmin() {
  // ── Load dependencies ──────────────────────────────────────────
  // We insert script tags for supabase.js and auth.js sequentially

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => setTimeout(resolve, 50); // brief pause for script to init
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  async function init() {
    try {
      // Load supabase.js first (provides configReady, sbAdmin, etc.)
      await loadScript('/supabase.js');
      
      // Load auth.js (provides esc, formatDate, showToast, etc.)
      await loadScript('/js/auth.js');

      // Wait for runtime config to be ready
      if (typeof configReady === 'function') {
        await configReady();
      }

      // ── Expose config values to window for admin portal use ──
      window.SUPABASE_URL   = window.SUPABASE_URL   || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '');
      window.SUPABASE_ANON  = window.SUPABASE_ANON  || (typeof SUPABASE_ANON !== 'undefined' ? SUPABASE_ANON : '');
      window.ADMIN_PASSWORD = window.ADMIN_PASSWORD  || (typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : '');

      // Double-check from the supabase.js module-level variables
      // (These are set by loadRuntimeConfig in supabase.js)
      if (!window.SUPABASE_URL && typeof SUPABASE_URL !== 'undefined') {
        window.SUPABASE_URL = SUPABASE_URL;
      }
      if (!window.SUPABASE_ANON && typeof SUPABASE_ANON !== 'undefined') {
        window.SUPABASE_ANON = SUPABASE_ANON;
      }
      if (!window.ADMIN_PASSWORD && typeof ADMIN_PASSWORD !== 'undefined') {
        window.ADMIN_PASSWORD = ADMIN_PASSWORD;
      }

      // Also attempt to fetch /config.json directly as a fallback
      if (!window.ADMIN_PASSWORD) {
        try {
          const resp = await fetch('/config.json');
          if (resp.ok) {
            const cfg = await resp.json();
            if (cfg.ADMIN_PASSWORD) window.ADMIN_PASSWORD = cfg.ADMIN_PASSWORD;
            if (cfg.SUPABASE_URL)   window.SUPABASE_URL   = cfg.SUPABASE_URL;
            if (cfg.SUPABASE_ANON)  window.SUPABASE_ANON  = cfg.SUPABASE_ANON;
            if (window.SUPABASE_URL)    window.SUPABASE_URL    = cfg.SUPABASE_URL;
            if (window.SUPABASE_ANON)   window.SUPABASE_ANON   = cfg.SUPABASE_ANON;
          }
        } catch (e) {
          console.warn('[HMLI Admin] Could not fetch config.json:', e.message);
        }
      }

      // ── Signal admin readiness ──────────────────────────────────
      window.__HMLI_ADMIN_READY__ = true;
      window.dispatchEvent(new CustomEvent('hmli:admin:ready'));

      console.log('[HMLI Admin] Auth bootstrapper ready.');

    } catch (err) {
      console.error('[HMLI Admin] Bootstrap error:', err.message);
      // Still fire ready event so the page doesn't hang indefinitely
      window.__HMLI_ADMIN_READY__ = true;
      window.dispatchEvent(new CustomEvent('hmli:admin:ready'));
    }
  }

  // Start immediately
  init();
})();
