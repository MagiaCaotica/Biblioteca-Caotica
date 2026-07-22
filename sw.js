/* ═══════════════════════════════════════════════════════════════════
   BIBLIOTECA CAÓTICA ARCANA — SERVICE WORKER
   Cache-First Strategy | Offline Support | Performance
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'biblioteca-caotica-v3';
const ASSETS_TO_CACHE = [
    '/Biblioteca-Caotica/',
    '/Biblioteca-Caotica/index.html',
    '/Biblioteca-Caotica/style.css',
    '/Biblioteca-Caotica/script.js',
    '/Biblioteca-Caotica/manifest.json',
    '/Biblioteca-Caotica/tomo_placeholder.svg',
    '/Biblioteca-Caotica/404.html',
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap'
];

const DATA_CACHE = 'biblioteca-caotica-data-v2';

// ── Install: Pre-cache static assets ──────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Pre-caching static assets');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: Clean old caches ────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => {
                    return name !== CACHE_NAME && name !== DATA_CACHE;
                }).map(name => {
                    console.log('[SW] Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ── Fetch: Cache-first with network fallback ──────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests and browser extensions
    if (event.request.method !== 'GET') return;

    // Skip analytics, tracking, and counter scripts
    if (url.hostname.includes('google-analytics') ||
        url.hostname.includes('contador.websiteout') ||
        url.hostname.includes('adfoc.us')) {
        return;
    }

    // For Google Fonts: cache-first
    if (url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return response;
                });
            })
        );
        return;
    }

    // For flag images: stale-while-revalidate
    if (url.hostname.includes('flagcdn.com')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                    return networkResponse;
                });
                return cached || fetchPromise;
            })
        );
        return;
    }

    // For biblioteca_datos.js: always network-first (changes frequently)
    if (url.pathname.includes('biblioteca_datos')) {
        event.respondWith(
            fetch(event.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }
    event.respondWith(
        fetch(event.request).then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return response;
        }).catch(() => {
            return caches.match(event.request).then(cached => {
                if (cached) return cached;
                // Offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/Biblioteca-Caotica/index.html');
                }
                return new Response('Sin conexión', { status: 503 });
            });
        })
    );
});
