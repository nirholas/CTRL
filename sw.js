// Cache names with version for cache busting
const SHELL_CACHE = 'CTRL-shell-v2';
const DATA_CACHE = 'CTRL-data-v1';

// App shell — cache on install, serve from cache
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/style.css',
  '/ctrl.css',
  '/ctrl.js',
  '/system32.js',
  '/scripts/kernel.js',
  '/scripts/utility.js',
  '/scripts/edgecases.js',
  '/scripts/scripties.js',
  '/scripts/fflate.js',
  '/scripts/readwrite.js',
  '/scripts/ctxmenu.js',
  '/scripts/os-enhancements.js',
  '/libs/MaterialSymbolsRounded.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== SHELL_CACHE && name !== DATA_CACHE)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Domain redirect
  if (url.hostname === 'ctrl.surf') {
    url.hostname = 'ctrl.best';
    event.respondWith(Response.redirect(url.href, 301));
    return;
  }

  // App shell: cache-first
  if (SHELL_ASSETS.some((asset) => url.pathname === asset || url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Store data (v2.json, themes.json): network-first with cache fallback
  if (url.pathname.includes('CTRL-Store/db/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App HTML files: network-first with cache fallback
  if (url.pathname.startsWith('/appdata/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: network with cache fallback
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});