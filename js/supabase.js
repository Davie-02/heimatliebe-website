(function(){
  if (window.__SUPABASE_WRAPPER_LOADED__) return;
  window.__SUPABASE_WRAPPER_LOADED__ = true;
  const s = document.createElement('script');
  s.src = '/supabase.js';
  s.defer = false;
  document.head.appendChild(s);
})();
