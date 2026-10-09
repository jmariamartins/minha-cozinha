// A Minha Cozinha — Service Worker
const CACHE = 'minha-cozinha-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Install: cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para os assets da app, sempre rede para GitHub e Anthropic
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Nunca interceptar pedidos ao GitHub (receitas) nem à API da Anthropic
  if (url.hostname.includes('github') || url.hostname.includes('anthropic.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cachear respostas GET da nossa própria origem
        if (e.request.method === 'GET' && resp.status === 200 &&
            url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Fallback offline: devolve o index.html em cache para navegação
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
