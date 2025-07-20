const CACHE_NAME = 'my-pwa-cache-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker: Evento de instalación');
    // No pre-cacheamos nada aquí, la estrategia es cachear al momento de la solicitud.
    // Esto asegura que el Service Worker se instale rápidamente.
    self.skipWaiting(); // Activa el nuevo Service Worker inmediatamente
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Evento de activación');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando caché antigua', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Asegura que el Service Worker tome el control de las páginas existentes
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Solo cacheamos solicitudes GET para evitar problemas con otras peticiones.
    if (event.request.method !== 'GET') {
        return;
    }

    if (event.request.url.startsWith('chrome-extension://')) {
        console.log('Service Worker: Ignorando solicitud de chrome-extension:', event.request.url);
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Si el recurso está en caché, lo devolvemos
            if (cachedResponse) {
                return cachedResponse;
            }

            // Si no está en caché, intentamos obtenerlo de la red
            return fetch(event.request)
                .then((response) => {
                    // Verificamos si la respuesta es válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clonamos la respuesta porque es un stream y solo se puede consumir una vez
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        // Guardamos la respuesta en caché
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch((error) => {
                    // Si falla la red y el recurso no está en caché, puedes servir una página offline
                    console.error('Service Worker: Error al obtener o cachear:', error);
                    // Aquí podrías devolver una página offline.html si la tuvieras.
                    // return caches.match('/offline.html');
                });
        })
    );
});