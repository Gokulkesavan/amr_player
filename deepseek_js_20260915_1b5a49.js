/*! coi-serviceworker v0.1.7 — Guido Zuidhof, MIT license */
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', function (e) {
    if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;
    e.respondWith(fetch(e.request).then(function (response) {
      if (response.status === 0) return response;
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }).catch(function (err) { console.error(err); }));
  });
} else {
  (function () {
    if (window.crossOriginIsolated !== false) return;
    const reload = () => location.reload();
    if (!navigator.serviceWorker) { console.warn('No service worker support'); return; }
    navigator.serviceWorker.register(window.document.currentScript.src)
      .then(function (reg) {
        navigator.serviceWorker.addEventListener('controllerchange', reload);
        if (reg.active && !navigator.serviceWorker.controller) reload();
      })
      .catch(function (err) { console.error('SW registration failed', err); });
  })();
}