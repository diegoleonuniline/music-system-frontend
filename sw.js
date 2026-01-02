const CACHE_NAME = 'caiman-v1.0.3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/config.js',
    '/js/api.js',
    '/pages/dashboard.html',
    '/pages/songs.html',
    '/pages/setlists.html',
    '/pages/events.html',
    '/pages/rehearsals.html',
    '/pages/settings.html',
    '/js/dashboard.js',
    '/js/songs.js',
    '/js/setlists.js',
    '/js/events.js',
    '/js/rehearsals.js'
];

const API_CACHE_NAME = 'caiman-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install - cache static assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(function() {
                return self.skipWaiting();
            })
    );
});

// Activate - clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME;
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Fetch - serve from cache, update in background
self.addEventListener('fetch', function(event) {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // API requests - Network first, cache fallback
    if (url.href.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(function(response) {
                    // Clone and cache successful responses
                    if (response.ok) {
                        var responseClone = response.clone();
                        caches.open(API_CACHE_NAME).then(function(cache) {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(function() {
                    // Offline - try cache
                    return caches.match(event.request).then(function(cached) {
                        if (cached) {
                            return cached;
                        }
                        // Return offline JSON response
                        return new Response(JSON.stringify({ 
                            error: 'offline',
                            message: 'No hay conexión a internet',
                            cached: false
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                })
        );
        return;
    }
    
    // Static assets - Cache first, network fallback
    event.respondWith(
        caches.match(event.request)
            .then(function(cached) {
                if (cached) {
                    // Return cached, but update in background
                    fetch(event.request).then(function(response) {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then(function(cache) {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(function() {});
                    return cached;
                }
                
                // Not in cache - fetch and cache
                return fetch(event.request).then(function(response) {
                    if (response.ok) {
                        var responseClone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                }).catch(function() {
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/pages/dashboard.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncPendingData());
    }
});

function syncPendingData() {
    // Get pending actions from IndexedDB and sync
    return Promise.resolve();
}
