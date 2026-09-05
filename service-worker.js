// Service worker minimal : met en cache la coquille de l'appli (HTML/manifest/icône)
// pour un chargement instantané et un fonctionnement hors-ligne partiel (interface visible
// même sans réseau), mais ne touche JAMAIS aux appels vers les API météo — elles doivent
// toujours revenir du réseau pour rester à jour.

const CACHE_NAME = 'meteo-6-stations-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Appels vers les API Open-Meteo (ou tout autre domaine externe) : toujours réseau direct,
  // jamais de cache, pour ne jamais afficher une météo périmée.
  if(!isSameOrigin){
    return; // laisse la requête suivre son cours normal, sans interception
  }

  // Fichiers de la coquille de l'appli : cache d'abord (rapide, fonctionne hors-ligne),
  // avec tentative de rafraîchissement en arrière-plan.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if(response && response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // hors-ligne : on retombe sur la version en cache
      return cached || network;
    })
  );
});
