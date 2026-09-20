const CACHE_NAME = 'ciclo-cache-v13'; // Subimos a v10 para forzar la actualización

// 1. SOLO obligamos a instalar los archivos locales seguros
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 2. Instalación rápida sin bloqueos
self.addEventListener('install', event => {
  self.skipWaiting(); // Obliga al celular a usar esta nueva versión de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 3. Limpieza automática de versiones viejas que daban error
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma el control de la app inmediatamente
});

// 4. Guardado inteligente: guarda en caché lo nuevo, pero nunca bloquea la base de datos
self.addEventListener('fetch', event => {
  // Ignorar peticiones de la base de datos de Firebase para no arruinar la sincronización
  if (event.request.url.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Si ya lo tenemos guardado en el celular, lo mostramos
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Si no lo tenemos, lo descargamos de internet y lo guardamos para la próxima vez
      return fetch(event.request).then(networkResponse => {
        // Aseguramos que la respuesta sea válida antes de guardarla
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Si no hay internet y no está en caché, simplemente evitamos que la app colapse
      });
    })
  );
});
