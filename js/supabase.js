// js/supabase.js — loader shim
// Pages that reference js/supabase.js get redirected to the real /supabase.js
// This file exists only for backwards compatibility with <script src="js/supabase.js">
(function () {
  if (window.__HMLI_SUPABASE_LOADED__) return;
  window.__HMLI_SUPABASE_LOADED__ = true;
  const s = document.createElement('script');
  s.src = '/supabase.js';
  s.async = false;
  // Insert before any other scripts so functions are available immediately
  document.head.insertBefore(s, document.head.firstChild);
})();