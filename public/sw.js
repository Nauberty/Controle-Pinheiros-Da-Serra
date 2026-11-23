// Service worker mínimo: permite instalar o sistema como aplicativo no celular
// e abrir a tela inicial mesmo sem internet. Os dados ficam a cargo do Firebase.
const CACHE = 'pinheiros-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './logo.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Páginas: sempre busca a versão mais nova; sem internet, usa a última salva.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./', copy));
        return res;
      })
      .catch(() => caches.match('./')),
  );
});
